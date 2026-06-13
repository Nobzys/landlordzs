'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { initiatePaymentSchema, requestPayoutSchema } from '@/lib/validations/payment'
import { mtnRequestToPay, mtnGetPaymentStatus } from '@/lib/utils/mtn-momo'
import { orangeInitiatePayment, orangeGetPaymentStatus } from '@/lib/utils/orange-money'
import type { ActionResult } from '@/types/auth'
import type { InitiatePaymentInput, RequestPayoutInput, PaymentInitiationResult } from '@/types/payment'
import { v4 as uuidv4 } from 'uuid'

const PLATFORM_FEE_PCT = 2.5  // 2.5% platform fee on transactions

function calcFee(amount: number): number {
  return Math.round(amount * (PLATFORM_FEE_PCT / 100))
}

// ─── Initiate payment ─────────────────────────────────────────────────────────

export async function initiatePayment(
  data: InitiatePaymentInput
): Promise<ActionResult<PaymentInitiationResult>> {
  const parsed = initiatePaymentSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized' }

  const { amount, provider, phone, reference_type, reference_id, escrow_id, description, transaction_type } = parsed.data
  const fee        = provider === 'wallet' ? 0 : calcFee(amount)
  const net_amount = amount - fee

  // For wallet payments: check balance first
  if (provider === 'wallet') {
    const { data: wallet } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', user.id)
      .single()

    if (!wallet || wallet.balance < amount) {
      return { error: 'Insufficient wallet balance' }
    }
  }

  // Create transaction record
  const txnId = uuidv4()
  const { error: txnError } = await supabase.from('transactions').insert({
    id:             txnId,
    payer_id:       user.id,
    type:           (transaction_type ?? 'wallet_topup') as any,
    status:         'pending',
    amount,
    fee,
    net_amount,
    currency:       'XAF',
    provider:       provider as any,
    reference_type: reference_type ?? null,
    reference_id:   reference_id   ?? null,
    escrow_id:      escrow_id      ?? null,
    description:    description    ?? null,
  } as any)

  if (txnError) return { error: txnError.message }

  // ── Wallet payment: debit immediately ────────────────────────────────────────
  if (provider === 'wallet') {
    const { error: rpcError } = await (supabase as any).rpc('wallet_transfer', {
      p_from_id:  user.id,
      p_to_id:    user.id,          // will be overridden by caller with payee
      p_amount:   amount,
      p_ref_type: reference_type ?? 'transaction',
      p_ref_id:   txnId,
      p_desc:     description ?? 'Wallet payment',
    })

    if (rpcError) {
      await supabase.from('transactions').update({ status: 'failed', failure_reason: rpcError.message }).eq('id', txnId)
      return { error: rpcError.message }
    }

    await supabase.from('transactions').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', txnId)
    revalidatePath('/account/wallet')
    return { success: true, data: { transaction_id: txnId, provider_ref: txnId, status: 'completed' } }
  }

  // ── MTN MoMo ──────────────────────────────────────────────────────────────
  if (provider === 'mtn_momo') {
    try {
      await mtnRequestToPay({
        referenceId:  txnId,
        phone:        phone!,
        amount,
        externalId:   txnId,
        payerMessage: description ?? 'LANDLORDZS Payment',
        payeeNote:    `Ref: ${txnId}`,
      })

      await supabase.from('transactions').update({ status: 'processing' }).eq('id', txnId)
      return { success: true, data: { transaction_id: txnId, provider_ref: txnId, status: 'processing' } }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'MTN payment initiation failed'
      await supabase.from('transactions').update({ status: 'failed', failure_reason: msg }).eq('id', txnId)
      return { error: msg }
    }
  }

  // ── Orange Money ──────────────────────────────────────────────────────────
  if (provider === 'orange_money') {
    try {
      const result = await orangeInitiatePayment({
        orderId:     txnId,
        amount,
        description: description ?? 'LANDLORDZS Payment',
      })

      const paymentUrl = result.data?.payment_url ?? null
      const payToken   = result.data?.pay_token ?? null

      await supabase.from('transactions').update({
        status:       'processing',
        provider_meta: { pay_token: payToken, order_id: txnId },
      }).eq('id', txnId)

      return {
        success: true,
        data: {
          transaction_id: txnId,
          provider_ref:   txnId,
          status:         'processing',
          payment_url:    paymentUrl ?? undefined,
        },
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Orange Money initiation failed'
      await supabase.from('transactions').update({ status: 'failed', failure_reason: msg }).eq('id', txnId)
      return { error: msg }
    }
  }

  return { error: 'Unsupported provider' }
}

// ─── Check payment status ─────────────────────────────────────────────────────

export async function checkPaymentStatus(transactionId: string): Promise<ActionResult<{ status: string }>> {
  const supabase  = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: txn } = await (supabase as any)
    .from('transactions')
    .select('id, status, provider, provider_meta, provider_ref')
    .eq('id', transactionId)
    .eq('payer_id', user.id)
    .single()

  if (!txn) return { error: 'Transaction not found' }

  // Already in terminal state
  if (['completed', 'failed', 'cancelled', 'refunded'].includes(txn.status)) {
    return { success: true, data: { status: txn.status } }
  }

  // Re-check with provider
  try {
    if (txn.provider === 'mtn_momo') {
      const result  = await mtnGetPaymentStatus(transactionId)
      const newStatus = result.status === 'SUCCESSFUL' ? 'completed'
                      : result.status === 'FAILED'     ? 'failed'
                      : 'processing'

      if (newStatus !== 'processing') {
        await (supabase as any).from('transactions').update({
          status:      newStatus,
          provider_ref: result.financialTransactionId ?? transactionId,
          ...(newStatus === 'completed' ? { completed_at: new Date().toISOString() } : {}),
          ...(newStatus === 'failed'    ? { failed_at: new Date().toISOString(), failure_reason: result.reason?.message } : {}),
        }).eq('id', transactionId)
      }

      return { success: true, data: { status: newStatus } }
    }

    if (txn.provider === 'orange_money') {
      const meta    = (txn.provider_meta ?? {}) as Record<string, string>
      const result  = await orangeGetPaymentStatus(transactionId, meta.pay_token ?? '')
      const newStatus = result.status === 'SUCCESS'  ? 'completed'
                      : result.status === 'FAILED' || result.status === 'CANCELLED' ? 'failed'
                      : 'processing'

      if (newStatus !== 'processing') {
        await (supabase as any).from('transactions').update({
          status:       newStatus,
          provider_ref: result.txnid ?? transactionId,
          ...(newStatus === 'completed' ? { completed_at: new Date().toISOString() } : {}),
          ...(newStatus === 'failed'    ? { failed_at: new Date().toISOString() } : {}),
        }).eq('id', transactionId)
      }

      return { success: true, data: { status: newStatus } }
    }
  } catch {
    // Provider check failed — return current DB status
  }

  return { success: true, data: { status: txn.status } }
}

// ─── Wallet topup (convenience wrapper) ──────────────────────────────────────

export async function topUpWallet(
  amount: number,
  provider: 'mtn_momo' | 'orange_money',
  phone: string
): Promise<ActionResult<PaymentInitiationResult>> {
  return initiatePayment({ amount, provider, phone, transaction_type: 'wallet_topup' })
}

// ─── Request payout ───────────────────────────────────────────────────────────

export async function requestPayout(
  data: RequestPayoutInput
): Promise<ActionResult<{ id: string }>> {
  const parsed = requestPayoutSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized' }

  const PAYOUT_FEE_PCT = 1.0
  const fee        = Math.round(parsed.data.amount * (PAYOUT_FEE_PCT / 100))
  const net_amount = parsed.data.amount - fee

  // Check wallet balance
  const { data: wallet } = await supabase
    .from('wallets')
    .select('balance')
    .eq('user_id', user.id)
    .single()

  if (!wallet || wallet.balance < parsed.data.amount) {
    return { error: 'Insufficient wallet balance' }
  }

  const { data: payout, error } = await (supabase as any).from('payouts').insert({
    recipient_id:    user.id,
    amount:          parsed.data.amount,
    fee,
    net_amount,
    currency:        'XAF',
    provider:        parsed.data.provider,
    account_details: { phone: parsed.data.phone, name: parsed.data.name },
    status:          'pending',
  }).select('id').single()

  if (error || !payout) return { error: error?.message ?? 'Failed to create payout request' }

  // Lock the funds in wallet immediately
  await supabase
    .from('wallets')
    .update({ locked: (wallet as any).locked + parsed.data.amount })
    .eq('user_id', user.id)

  revalidatePath('/account/payouts')
  return { success: true, data: { id: payout.id } }
}

// ─── Admin: process payout ────────────────────────────────────────────────────

export async function processPayoutAdmin(payoutId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized' }

  // Verify admin
  const { data: caller } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (caller?.role !== 'admin') return { error: 'Insufficient permissions' }

  const adminClient = createAdminClient()
  const { data: payout } = await (adminClient as any)
    .from('payouts')
    .select('*')
    .eq('id', payoutId)
    .eq('status', 'pending')
    .single()

  if (!payout) return { error: 'Payout not found or already processed' }

  try {
    // Call provider API
    if (payout.provider === 'mtn_momo') {
      await mtnRequestToPay({
        referenceId:  payoutId,
        phone:        payout.account_details.phone,
        amount:       payout.net_amount,
        externalId:   payoutId,
        payerMessage: 'LANDLORDZS Payout',
        payeeNote:    `Payout ${payoutId}`,
      })
    } else if (payout.provider === 'orange_money') {
      await orangeInitiatePayment({
        orderId:     payoutId,
        amount:      payout.net_amount,
        description: 'LANDLORDZS Payout',
      })
    }

    // Debit wallet, mark payout processing
    await (adminClient as any).rpc('wallet_transfer', {
      p_from_id:  payout.recipient_id,
      p_to_id:    payout.recipient_id,  // debit only; pass null to_id or same to zero-sum
      p_amount:   payout.amount,
      p_ref_type: 'payout',
      p_ref_id:   payoutId,
      p_desc:     'Payout withdrawal',
    })

    await (adminClient as any).from('payouts').update({
      status:       'processing',
      initiated_at: new Date().toISOString(),
    }).eq('id', payoutId)

    revalidatePath('/admin/payouts')
    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Payout processing failed'
    await (adminClient as any).from('payouts').update({ status: 'failed', failure_reason: msg, failed_at: new Date().toISOString() }).eq('id', payoutId)
    return { error: msg }
  }
}
