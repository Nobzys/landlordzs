import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { initiatePaymentSchema } from '@/lib/validations/payment'
import { mtnRequestToPay } from '@/lib/utils/mtn-momo'
import { orangeInitiatePayment } from '@/lib/utils/orange-money'
import { v4 as uuidv4 } from 'uuid'

const PLATFORM_FEE_PCT = 2.5

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = initiatePaymentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { amount, provider, phone, reference_type, reference_id, escrow_id, description, transaction_type } = parsed.data
  const fee        = provider === 'wallet' ? 0 : Math.round(amount * (PLATFORM_FEE_PCT / 100))
  const net_amount = amount - fee

  // Check wallet balance for wallet payments
  if (provider === 'wallet') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: wallet } = await (supabase as any).from('wallets').select('balance, locked').eq('user_id', user.id).single() as { data: { balance: number; locked: number } | null }
    const available = (wallet?.balance ?? 0) - (wallet?.locked ?? 0)
    if (available < amount) {
      return NextResponse.json({ error: 'Insufficient wallet balance' }, { status: 422 })
    }
  }

  const txnId = uuidv4()

  // Create transaction record
  const { error: txnError } = await (supabase as any).from('transactions').insert({
    id:             txnId,
    payer_id:       user.id,
    type:           transaction_type ?? 'wallet_topup',
    status:         'pending',
    amount,
    fee,
    net_amount,
    currency:       'XAF',
    provider,
    reference_type: reference_type ?? null,
    reference_id:   reference_id   ?? null,
    escrow_id:      escrow_id      ?? null,
    description:    description    ?? null,
  })

  if (txnError) {
    return NextResponse.json({ error: txnError.message }, { status: 500 })
  }

  // ── Wallet: instant debit ──────────────────────────────────────────────────
  if (provider === 'wallet') {
    const { error: rpcError } = await (supabase as any).rpc('wallet_transfer', {
      p_from_id:  user.id,
      p_to_id:    null,
      p_amount:   amount,
      p_ref_type: reference_type ?? 'transaction',
      p_ref_id:   txnId,
      p_desc:     description ?? 'Wallet payment',
    })

    if (rpcError) {
      await (supabase as any).from('transactions').update({ status: 'failed', failure_reason: rpcError.message }).eq('id', txnId)
      return NextResponse.json({ error: rpcError.message }, { status: 422 })
    }

    await (supabase as any).from('transactions').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', txnId)
    return NextResponse.json({ transaction_id: txnId, provider_ref: txnId, status: 'completed' })
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

      await (supabase as any).from('transactions').update({ status: 'processing' }).eq('id', txnId)
      return NextResponse.json({ transaction_id: txnId, provider_ref: txnId, status: 'processing' })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'MTN payment failed'
      await (supabase as any).from('transactions').update({ status: 'failed', failure_reason: msg }).eq('id', txnId)
      return NextResponse.json({ error: msg }, { status: 502 })
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
      const payToken   = result.data?.pay_token   ?? null
      const notifToken = result.data?.notif_token ?? null

      await (supabase as any).from('transactions').update({
        status:        'processing',
        provider_meta: { pay_token: payToken, order_id: txnId, notif_token: notifToken },
      }).eq('id', txnId)

      return NextResponse.json({
        transaction_id: txnId,
        provider_ref:   txnId,
        status:         'processing',
        payment_url:    paymentUrl,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Orange Money payment failed'
      await (supabase as any).from('transactions').update({ status: 'failed', failure_reason: msg }).eq('id', txnId)
      return NextResponse.json({ error: msg }, { status: 502 })
    }
  }

  return NextResponse.json({ error: 'Unsupported provider' }, { status: 400 })
}
