import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { mtnGetPaymentStatus } from '@/lib/utils/mtn-momo'
import { orangeGetPaymentStatus } from '@/lib/utils/orange-money'

const TERMINAL = new Set(['completed', 'failed', 'cancelled', 'refunded'])

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: txn, error: txnError } = await (supabase as any)
    .from('transactions')
    .select('id, status, provider, provider_meta, provider_ref, payer_id')
    .eq('id', id)
    .single()

  if (txnError || !txn) {
    return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
  }

  // Only allow payer to poll their own transaction
  if (txn.payer_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Already terminal — return immediately without provider API call
  if (TERMINAL.has(txn.status)) {
    return NextResponse.json({ transaction_id: id, status: txn.status })
  }

  // Re-check with provider
  let newStatus = txn.status
  let providerRef = txn.provider_ref

  try {
    if (txn.provider === 'mtn_momo') {
      const result = await mtnGetPaymentStatus(id)
      newStatus = result.status === 'SUCCESSFUL' ? 'completed'
                : result.status === 'FAILED'     ? 'failed'
                : 'processing'
      if (result.financialTransactionId) providerRef = result.financialTransactionId
    }

    if (txn.provider === 'orange_money') {
      const meta   = (txn.provider_meta ?? {}) as Record<string, string>
      const result = await orangeGetPaymentStatus(id, meta.pay_token ?? '')
      newStatus = result.status === 'SUCCESS'  ? 'completed'
                : (result.status === 'FAILED' || result.status === 'CANCELLED') ? 'failed'
                : 'processing'
      if (result.txnid) providerRef = result.txnid
    }
  } catch {
    // Provider check failed — return current DB status
    return NextResponse.json({ transaction_id: id, status: txn.status })
  }

  if (newStatus !== txn.status) {
    const update: Record<string, unknown> = {
      status:       newStatus,
      provider_ref: providerRef,
    }
    if (newStatus === 'completed') update.completed_at = new Date().toISOString()
    if (newStatus === 'failed')    update.failed_at    = new Date().toISOString()

    await (supabase as any).from('transactions').update(update).eq('id', id)

    // On success: credit wallet if this was a top-up (no escrow)
    if (newStatus === 'completed' && !txn.escrow_id) {
      const { data: t } = await (supabase as any).from('transactions').select('amount, currency, escrow_id').eq('id', id).single()
      if (t && !t.escrow_id) {
        await (supabase as any).rpc('wallet_transfer', {
          p_from_id:  null,
          p_to_id:    user.id,
          p_amount:   t.amount,
          p_ref_type: 'transaction',
          p_ref_id:   id,
          p_desc:     `Top-up via ${txn.provider}`,
        })
      }
    }
  }

  return NextResponse.json({ transaction_id: id, status: newStatus })
}
