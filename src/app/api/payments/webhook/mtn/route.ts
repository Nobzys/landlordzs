import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { mtnGetPaymentStatus, mtnGetTransferStatus } from '@/lib/utils/mtn-momo'

// MTN MoMo sends async callbacks for both Collections and Disbursements.
// referenceId for collections  = transaction.id
// referenceId for disbursements = payout.id
// We distinguish by looking up in both tables.
//
// SECURITY: MTN MoMo callbacks carry no HMAC signature or shared-secret token.
// The callback body is used only to identify the referenceId; the actual payment
// status is independently verified via an authenticated server-to-server API call
// (Bearer token via client credentials) before any wallet credit or status update.
// Amount and currency are also verified against our stored transaction record.

const TERMINAL_TX  = new Set(['completed', 'failed', 'cancelled', 'refunded'])
const TERMINAL_PAY = new Set(['completed', 'failed', 'cancelled'])
const UUID_RE      = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface MtnCallbackBody {
  referenceId:              string
  status?:                  'SUCCESSFUL' | 'FAILED' | 'PENDING'
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

  const { referenceId, status } = body
  if (!referenceId) {
    return NextResponse.json({ error: 'Missing referenceId' }, { status: 400 })
  }
  if (!UUID_RE.test(referenceId)) {
    return NextResponse.json({ error: 'Invalid referenceId' }, { status: 400 })
  }

  // PENDING callbacks carry no useful information — skip the verification API call
  if (status === 'PENDING') {
    return NextResponse.json({ received: true })
  }

  const adminClient = createAdminClient()

  // ── Collection callback (transaction) ─────────────────────────────────────
  const { data: txn } = await (adminClient as any)
    .from('transactions')
    .select('id, status, payer_id, amount, net_amount, escrow_id')
    .eq('id', referenceId)
    .eq('provider', 'mtn_momo')
    .single()

  if (txn) {
    if (TERMINAL_TX.has(txn.status)) {
      return NextResponse.json({ received: true }) // idempotent
    }

    // Independent server-to-server verification — never trust the callback body's status
    let verified: Awaited<ReturnType<typeof mtnGetPaymentStatus>>
    try {
      verified = await mtnGetPaymentStatus(referenceId)
    } catch {
      // Provider API unavailable — return 200 so MTN does not retry storm;
      // the client-side polling loop will re-check status independently.
      return NextResponse.json({ received: true })
    }

    if (verified.status === 'PENDING') {
      return NextResponse.json({ received: true }) // still in-flight
    }

    // Verify amount and currency against our stored record (each checked only if present)
    if (verified.amount !== undefined) {
      const verifiedAmt = Number(verified.amount)
      if (isNaN(verifiedAmt) || verifiedAmt !== txn.amount) {
        return NextResponse.json({ received: true })
      }
    }
    if (verified.currency !== undefined && verified.currency !== 'XAF') {
      return NextResponse.json({ received: true })
    }

    const newStatus = verified.status === 'SUCCESSFUL' ? 'completed' : 'failed'
    const update: Record<string, unknown> = {
      status:       newStatus,
      provider_ref: verified.financialTransactionId ?? referenceId,
    }
    if (newStatus === 'completed') update.completed_at = new Date().toISOString()
    if (newStatus === 'failed') {
      update.failed_at      = new Date().toISOString()
      update.failure_reason = verified.reason?.message ?? 'MTN payment failed'
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
    .select('id, status, recipient_id, amount, net_amount')
    .eq('id', referenceId)
    .eq('provider', 'mtn_momo')
    .single()

  if (payout) {
    if (TERMINAL_PAY.has(payout.status)) {
      return NextResponse.json({ received: true }) // idempotent
    }

    // Independent server-to-server verification
    let verified: Awaited<ReturnType<typeof mtnGetTransferStatus>>
    try {
      verified = await mtnGetTransferStatus(referenceId)
    } catch {
      return NextResponse.json({ received: true })
    }

    if (verified.status === 'PENDING') {
      return NextResponse.json({ received: true })
    }

    // Verify amount and currency — MTN receives net_amount (after platform fee)
    if (verified.amount !== undefined) {
      const verifiedAmt = Number(verified.amount)
      if (isNaN(verifiedAmt) || verifiedAmt !== payout.net_amount) {
        return NextResponse.json({ received: true })
      }
    }
    if (verified.currency !== undefined && verified.currency !== 'XAF') {
      return NextResponse.json({ received: true })
    }

    if (verified.status === 'SUCCESSFUL') {
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
        failure_reason: verified.reason?.message ?? 'MTN disbursement failed',
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
