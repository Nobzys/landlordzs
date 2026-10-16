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
// (Bearer token via client credentials) before any status change or wallet credit.
// Amount and currency are also verified against our stored transaction record.
//
// ATOMICITY: Status transitions and wallet operations are performed inside
// finalize_payment_webhook / reverse_mtn_payout — single PLPGSQL functions that
// execute both the CAS status update and the wallet credit in one database
// transaction.  A failure in either step rolls back both, leaving the transaction
// in its pre-call state so that a subsequent provider retry can succeed.

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
    .select('id, status, amount, net_amount, escrow_id')
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
      return NextResponse.json({ received: true })
    }

    if (verified.status === 'PENDING') {
      return NextResponse.json({ received: true }) // still in-flight
    }

    // Verify amount and currency against our stored record
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

    // Atomically: CAS-updates transaction status + credits wallet (or funds escrow).
    // If the wallet_transfer inside the RPC raises an exception, the entire DB
    // transaction rolls back — the transaction stays in its pre-call state so the
    // next provider retry can succeed.
    const { data: result, error: rpcErr } = await (adminClient as any).rpc(
      'finalize_payment_webhook',
      {
        p_txn_id:         referenceId,
        p_new_status:     newStatus,
        p_current_status: txn.status,
        p_provider_ref:   verified.financialTransactionId ?? referenceId,
        p_failure_reason: newStatus === 'failed'
          ? (verified.reason?.message ?? 'MTN payment failed')
          : null,
        p_desc: 'Top-up via MTN MoMo (webhook)',
      }
    )

    if (rpcErr) {
      console.error(
        '[webhook/mtn] finalize_payment_webhook failed — provider payment confirmed '
        + 'but DB transaction did not commit; next provider retry may recover this',
        { referenceId, newStatus, error: rpcErr.message }
      )
    } else if (result !== 'completed_and_credited'
            && result !== 'completed_and_escrow_funded'
            && result !== 'completed_escrow_already_settled'
            && result !== 'failed'
            && result !== 'already_terminal') {
      // Unexpected result (cas_missed, not_found) — log for investigation
      console.warn('[webhook/mtn] finalize_payment_webhook unexpected result',
        { referenceId, result })
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
      // Payout succeeded: CAS-update to completed.
      // No wallet operation needed here — the wallet was already debited in
      // processPayoutAdmin when the disbursement was initiated.
      const { data: payUpdated } = await (adminClient as any)
        .from('payouts')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', referenceId)
        .eq('status', payout.status)
        .select('id')

      if (!payUpdated || payUpdated.length === 0) {
        // CAS missed — another callback already updated this row
        return NextResponse.json({ received: true })
      }

      return NextResponse.json({ received: true })
    }

    // FAILED: atomically mark payout failed AND credit wallet back.
    // reverse_mtn_payout uses FOR UPDATE + wallet_transfer in one DB transaction.
    const { data: reversal, error: reversalErr } = await (adminClient as any).rpc(
      'reverse_mtn_payout',
      {
        p_payout_id:      referenceId,
        p_current_status: payout.status,
        p_failure_reason: verified.reason?.message ?? 'MTN disbursement failed',
      }
    )

    if (reversalErr) {
      console.error(
        '[webhook/mtn] reverse_mtn_payout failed — payout may be in inconsistent state; '
        + 'admin reconciliation required',
        { referenceId, recipient_id: payout.recipient_id, amount: payout.amount,
          error: reversalErr.message }
      )
    } else if (reversal !== 'reversed' && reversal !== 'already_terminal') {
      console.warn('[webhook/mtn] reverse_mtn_payout unexpected result',
        { referenceId, reversal })
    }

    return NextResponse.json({ received: true })
  }

  // Unknown referenceId — return 200 to prevent MTN retry storm
  return NextResponse.json({ received: true })
}
