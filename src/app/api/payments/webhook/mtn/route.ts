import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// MTN MoMo sends async callbacks for both Collections and Disbursements.
// referenceId for collections  = transaction.id
// referenceId for disbursements = payout.id
// We distinguish by looking up in both tables.

const TERMINAL_TX  = new Set(['completed', 'failed', 'cancelled', 'refunded'])
const TERMINAL_PAY = new Set(['completed', 'failed', 'cancelled'])
const UUID_RE      = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface MtnCallbackBody {
  referenceId:              string
  status:                   'SUCCESSFUL' | 'FAILED' | 'PENDING'
  financialTransactionId?:  string
  reason?:                  string
}

export async function POST(request: Request) {
  let body: MtnCallbackBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { referenceId, status, financialTransactionId, reason } = body
  if (!referenceId || !status) {
    return NextResponse.json({ error: 'Missing referenceId or status' }, { status: 400 })
  }
  if (!UUID_RE.test(referenceId)) {
    return NextResponse.json({ error: 'Invalid referenceId' }, { status: 400 })
  }

  // Still in-flight — nothing to do
  if (status === 'PENDING') {
    return NextResponse.json({ received: true })
  }

  const adminClient = createAdminClient()

  // ── Collection callback (transaction) ─────────────────────────────────────
  const { data: txn } = await (adminClient as any)
    .from('transactions')
    .select('id, status, payer_id, net_amount, escrow_id')
    .eq('id', referenceId)
    .eq('provider', 'mtn_momo')
    .single()

  if (txn) {
    if (TERMINAL_TX.has(txn.status)) {
      return NextResponse.json({ received: true }) // idempotent
    }

    const newStatus = status === 'SUCCESSFUL' ? 'completed' : 'failed'
    const update: Record<string, unknown> = {
      status:       newStatus,
      provider_ref: financialTransactionId ?? referenceId,
    }
    if (newStatus === 'completed') update.completed_at = new Date().toISOString()
    if (newStatus === 'failed') {
      update.failed_at      = new Date().toISOString()
      update.failure_reason = reason ?? 'MTN payment failed'
    }

    // CAS: only the first concurrent webhook wins
    const { data: updated } = await (adminClient as any)
      .from('transactions')
      .update(update)
      .eq('id', referenceId)
      .eq('status', txn.status)
      .select('id')

    if (newStatus === 'completed' && updated && updated.length > 0) {
      if (!txn.escrow_id) {
        // Wallet top-up: credit user
        await (adminClient as any).rpc('wallet_transfer', {
          p_from_id:  null,
          p_to_id:    txn.payer_id,
          p_amount:   txn.net_amount,
          p_ref_type: 'transaction',
          p_ref_id:   referenceId,
          p_desc:     'Top-up via MTN MoMo (webhook)',
        })
      } else {
        // Escrow payment: mark escrow funded
        await (adminClient as any)
          .from('escrow_accounts')
          .update({ status: 'funded', funded_at: new Date().toISOString() })
          .eq('id', txn.escrow_id)
          .eq('status', 'pending')
      }
    }

    return NextResponse.json({ received: true })
  }

  // ── Disbursement callback (payout) ────────────────────────────────────────
  const { data: payout } = await (adminClient as any)
    .from('payouts')
    .select('id, status, recipient_id, amount')
    .eq('id', referenceId)
    .eq('provider', 'mtn_momo')
    .single()

  if (payout) {
    if (TERMINAL_PAY.has(payout.status)) {
      return NextResponse.json({ received: true }) // idempotent
    }

    if (status === 'SUCCESSFUL') {
      await (adminClient as any)
        .from('payouts')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', referenceId)
        .eq('status', payout.status)

      return NextResponse.json({ received: true })
    }

    // FAILED: wallet was already debited in processPayoutAdmin — credit it back
    const { data: updated } = await (adminClient as any)
      .from('payouts')
      .update({
        status:         'failed',
        failed_at:      new Date().toISOString(),
        failure_reason: reason ?? 'MTN disbursement failed',
      })
      .eq('id', referenceId)
      .eq('status', payout.status)
      .select('id')

    if (updated && updated.length > 0) {
      await (adminClient as any).rpc('wallet_transfer', {
        p_from_id:  null,
        p_to_id:    payout.recipient_id,
        p_amount:   payout.amount,
        p_ref_type: 'payout',
        p_ref_id:   referenceId,
        p_desc:     'Payout reversal — MTN disbursement failed',
      })
    }

    return NextResponse.json({ received: true })
  }

  // Unknown referenceId — return 200 to prevent MTN retry storm
  return NextResponse.json({ received: true })
}
