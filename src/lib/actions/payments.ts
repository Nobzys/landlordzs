'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { initiatePaymentSchema, requestPayoutSchema } from '@/lib/validations/payment'
import { mtnRequestToPay, mtnGetPaymentStatus, mtnTransfer } from '@/lib/utils/mtn-momo'
import { orangeInitiatePayment, orangeGetPaymentStatus } from '@/lib/utils/orange-money'
import type { ActionResult } from '@/types/auth'
import type { InitiatePaymentInput, RequestPayoutInput, PaymentInitiationResult } from '@/types/payment'
import { canAccessAdmin } from '@/lib/roles'
import { v4 as uuidv4 } from 'uuid'

const PLATFORM_FEE_PCT = 2.5  // 2.5% platform fee on transactions

function calcFee(amount: number): number {
  return Math.round(amount * (PLATFORM_FEE_PCT / 100))
}

// â”€â”€â”€ Initiate payment â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function initiatePayment(
  data: InitiatePaymentInput
): Promise<ActionResult<PaymentInitiationResult>> {
  const parsed = initiatePaymentSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized' }

  const { amount, provider, phone, reference_type, reference_id, escrow_id, description, transaction_type } = parsed.data
  const fee        = provider === 'wallet' ? 0 : calcFee(amount)
  const net_amount = amount - fee

  // For wallet payments: check balance first
  if (provider === 'wallet') {
    const { data: wallet } = await (supabase as any)
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
  const { error: txnError } = await (supabase as any).from('transactions').insert({
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

  // â”€â”€ Wallet payment: debit immediately â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (provider === 'wallet') {
    const { error: rpcError } = await (supabase as any).rpc('wallet_transfer', {
      p_from_id:  user.id,
      p_to_id:    null,   // debit-only: funds go to platform/escrow, credited on release
      p_amount:   amount,
      p_ref_type: reference_type ?? 'transaction',
      p_ref_id:   txnId,
      p_desc:     description ?? 'Wallet payment',
    })

    if (rpcError) {
      await (supabase as any).from('transactions').update({ status: 'failed', failure_reason: rpcError.message }).eq('id', txnId)
      return { error: rpcError.message }
    }

    await (supabase as any).from('transactions').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', txnId)
    revalidatePath('/account/wallet')
    return { success: true, data: { transaction_id: txnId, provider_ref: txnId, status: 'completed' } }
  }

  // â”€â”€ MTN MoMo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

      await (supabase as any).from('transactions').update({ status: 'processing' }).eq('id', txnId)
      return { success: true, data: { transaction_id: txnId, provider_ref: txnId, status: 'processing' } }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'MTN payment initiation failed'
      await (supabase as any).from('transactions').update({ status: 'failed', failure_reason: msg }).eq('id', txnId)
      return { error: msg }
    }
  }

  // â”€â”€ Orange Money â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (provider === 'orange_money') {
    try {
      const result = await orangeInitiatePayment({
        orderId:     txnId,
        amount,
        description: description ?? 'LANDLORDZS Payment',
      })

      const paymentUrl = result.data?.payment_url ?? null
      const payToken   = result.data?.pay_token   ?? null
      const notifToken = result.data?.notif_token ?? null

      await (supabase as any).from('transactions').update({
        status:        'processing',
        provider_meta: { pay_token: payToken, order_id: txnId, notif_token: notifToken },
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
      await (supabase as any).from('transactions').update({ status: 'failed', failure_reason: msg }).eq('id', txnId)
      return { error: msg }
    }
  }

  return { error: 'Unsupported provider' }
}

// â”€â”€â”€ Check payment status â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
    // Provider check failed â€” return current DB status
  }

  return { success: true, data: { status: txn.status } }
}

// â”€â”€â”€ Wallet topup (convenience wrapper) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function topUpWallet(
  amount: number,
  provider: 'mtn_momo' | 'orange_money',
  phone: string
): Promise<ActionResult<PaymentInitiationResult>> {
  return initiatePayment({ amount, provider, phone, transaction_type: 'wallet_topup' })
}

// â”€â”€â”€ Request payout â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function requestPayout(
  data: RequestPayoutInput
): Promise<ActionResult<{ id: string }>> {
  const parsed = requestPayoutSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized' }

  const PAYOUT_FEE_PCT = 1.0
  const fee        = Math.round(parsed.data.amount * (PAYOUT_FEE_PCT / 100))
  const net_amount = parsed.data.amount - fee

  // Check available balance (total minus already-locked funds)
  const { data: wallet } = await (supabase as any)
    .from('wallets')
    .select('balance, locked')
    .eq('user_id', user.id)
    .single()

  const available = (wallet?.balance ?? 0) - (wallet?.locked ?? 0)
  if (!wallet || available < parsed.data.amount) {
    return { error: 'Insufficient available wallet balance' }
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

  // Lock the funds atomically — wallet_lock is SECURITY DEFINER and does
  // a single UPDATE so concurrent requests don't race on the locked field.
  const adminClient = createAdminClient()
  await (adminClient as any).rpc('wallet_lock', {
    p_user_id: user.id,
    p_amount:  parsed.data.amount,
  })

  revalidatePath('/account/payouts')
  return { success: true, data: { id: payout.id } }
}

// â”€â”€â”€ Admin: process payout â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function processPayoutAdmin(payoutId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized' }

  const { data: caller } = await (supabase as any).from('profiles').select('role').eq('id', user.id).single()
  if (!canAccessAdmin(caller?.role ?? '')) return { error: 'Insufficient permissions' }

  const adminClient = createAdminClient()
  const { data: payout } = await (adminClient as any)
    .from('payouts')
    .select('*')
    .eq('id', payoutId)
    .eq('status', 'pending')
    .single()

  if (!payout) return { error: 'Payout not found or already processed' }

  try {
    // ── Send funds to recipient via the correct API ───────────────────────────
    if (payout.provider === 'mtn_momo') {
      // Disbursements API: platform → recipient phone (NOT Collections which charges the recipient)
      await mtnTransfer({
        referenceId:  payoutId,
        phone:        payout.account_details.phone,
        amount:       payout.net_amount,
        externalId:   payoutId,
        payerMessage: 'LANDLORDZS Payout',
        payeeNote:    `Payout ${payoutId}`,
      })
    }
    // Orange Money CM and bank_transfer have no public B2C disbursement API.
    // Wallet is debited and payout is moved to 'processing'; admin must complete
    // the external transfer manually and then click "Mark Paid".

    // ── Debit user's wallet balance to record funds as disbursed ─────────────
    const { error: rpcError } = await (adminClient as any).rpc('wallet_transfer', {
      p_from_id:  payout.recipient_id,
      p_to_id:    null,
      p_amount:   payout.amount,
      p_ref_type: 'payout',
      p_ref_id:   payoutId,
      p_desc:     'Payout withdrawal',
    })

    if (rpcError) throw new Error(rpcError.message)

    // ── Release the lock atomically — wallet_unlock uses a single UPDATE ──────
    await (adminClient as any).rpc('wallet_unlock', {
      p_user_id: payout.recipient_id,
      p_amount:  payout.amount,
    })

    await (adminClient as any).from('payouts').update({
      status:       'processing',
      initiated_at: new Date().toISOString(),
    }).eq('id', payoutId)

    revalidatePath('/admin/payouts')
    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Payout processing failed'

    // ── Unlock funds atomically so the user is not permanently locked out ─────
    await (adminClient as any).rpc('wallet_unlock', {
      p_user_id: payout.recipient_id,
      p_amount:  payout.amount,
    })

    await (adminClient as any).from('payouts').update({
      status:         'failed',
      failure_reason: msg,
      failed_at:      new Date().toISOString(),
    }).eq('id', payoutId)

    return { error: msg }
  }
}

// ─── Admin: retry a failed payout ────────────────────────────────────────────
// Re-locks the wallet and resets the payout to pending so the admin can
// click "Process Payout" again. Only valid for payouts in 'failed' state.

export async function retryPayoutAdmin(payoutId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized' }

  const { data: caller } = await (supabase as any).from('profiles').select('role').eq('id', user.id).single()
  if (!canAccessAdmin(caller?.role ?? '')) return { error: 'Insufficient permissions' }

  const adminClient = createAdminClient()
  const { data: payout } = await (adminClient as any)
    .from('payouts')
    .select('id, recipient_id, amount, status')
    .eq('id', payoutId)
    .eq('status', 'failed')
    .single()

  if (!payout) return { error: 'Payout not found or not in failed state' }

  // Check recipient still has enough balance to cover the re-lock
  const { data: wallet } = await (adminClient as any)
    .from('wallets')
    .select('balance, locked')
    .eq('user_id', payout.recipient_id)
    .single()

  const available = (wallet?.balance ?? 0) - (wallet?.locked ?? 0)
  if (available < payout.amount) {
    return { error: 'Insufficient wallet balance to retry payout' }
  }

  // Re-lock wallet atomically
  await (adminClient as any).rpc('wallet_lock', {
    p_user_id: payout.recipient_id,
    p_amount:  payout.amount,
  })

  // CAS reset: only succeeds if still 'failed'
  const { data: reset, error: resetError } = await (adminClient as any)
    .from('payouts')
    .update({
      status:         'pending',
      failure_reason: null,
      failed_at:      null,
      initiated_at:   null,
    })
    .eq('id', payoutId)
    .eq('status', 'failed')
    .select('id')
    .single()

  if (resetError || !reset) {
    // Unlock the lock we just placed — the update raced
    await (adminClient as any).rpc('wallet_unlock', {
      p_user_id: payout.recipient_id,
      p_amount:  payout.amount,
    })
    return { error: 'Could not reset payout — may have been updated concurrently' }
  }

  revalidatePath('/admin/payouts')
  return { success: true }
}

// ─── Cancel payout (user-initiated) ──────────────────────────────────────────

export async function cancelPayout(payoutId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized' }

  const adminClient = createAdminClient()

  // Must belong to this user and still be pending (not yet processing/completed)
  // Cancel status first so a concurrent admin process sees 'cancelled', not 'pending'.
  // The .eq('status', 'pending') guard doubles as a fetch — returns empty if already processed.
  const { data: cancelled, error: cancelError } = await (adminClient as any)
    .from('payouts')
    .update({ status: 'cancelled', failure_reason: 'Cancelled by user' })
    .eq('id', payoutId)
    .eq('recipient_id', user.id)
    .eq('status', 'pending')
    .select('id, amount')
    .single()

  if (cancelError || !cancelled) return { error: 'Payout not found or cannot be cancelled' }

  // Release the lock now that the payout can no longer be processed
  await (adminClient as any).rpc('wallet_unlock', {
    p_user_id: user.id,
    p_amount:  cancelled.amount,
  })

  revalidatePath('/account/payouts')
  return { success: true }
}
