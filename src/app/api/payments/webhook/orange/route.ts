import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { orangeGetPaymentStatus } from '@/lib/utils/orange-money'

// Orange Money sends an async notification to ORANGE_MONEY_NOTIF_URL after payment.
// Authentication: compare the webhook's notif_token with what we stored in provider_meta
// during initiation. Orange returns notif_token in the initiation response.
// Verification: independently verify payment outcome with the provider via server-to-server
// status check before committing any terminal state — never trust the callback body's
// status field alone.
//
// ATOMICITY: Status transitions and wallet operations are performed inside
// finalize_payment_webhook — a single PLPGSQL function that executes both the CAS
// status update and the wallet credit (or escrow funding) in one database transaction.
// A failure in either step rolls back both, leaving the transaction in its pre-call
// state so that a subsequent provider retry can succeed.

const TERMINAL_TX = new Set(['completed', 'failed', 'cancelled', 'refunded'])
const UUID_RE     = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface OrangeCallbackBody {
  status:       string   // 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'INITIATED' | 'PENDING'
  txnid?:       string
  order_id:     string
  notif_token:  string
  amount?:      number
  message?:     string
}

export async function POST(request: Request) {
  let body: OrangeCallbackBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { status, txnid, order_id, notif_token } = body
  if (!order_id || !notif_token) {
    return NextResponse.json({ error: 'Missing order_id or notif_token' }, { status: 400 })
  }
  if (!UUID_RE.test(order_id)) {
    return NextResponse.json({ error: 'Invalid order_id' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  const { data: txn } = await (adminClient as any)
    .from('transactions')
    .select('id, status, amount, provider_meta')
    .eq('id', order_id)
    .eq('provider', 'orange_money')
    .single()

  if (!txn) {
    // Unknown order — return 200 to prevent Orange retry storm
    return NextResponse.json({ received: true })
  }

  // Validate notif_token against stored value.
  // Reject if the stored token is absent (initiation never persisted it) OR mismatched.
  const storedMeta  = (txn.provider_meta as Record<string, string>) ?? {}
  const storedToken = storedMeta.notif_token
  if (!storedToken || storedToken !== notif_token) {
    return NextResponse.json({ error: 'Invalid notif_token' }, { status: 401 })
  }

  if (TERMINAL_TX.has(txn.status)) {
    return NextResponse.json({ received: true }) // idempotent
  }

  // Callbacks for in-flight states carry no useful terminal information.
  if (status === 'INITIATED' || status === 'PENDING') {
    return NextResponse.json({ received: true })
  }

  // Independently verify the payment outcome with Orange Money before committing
  // any terminal state.  The notif_token authenticates the callback source but does
  // not confirm the final outcome — use the provider's own status API as the source
  // of truth for both SUCCESS and FAILED/CANCELLED outcomes.
  const payToken = storedMeta.pay_token ?? ''
  let verified: Awaited<ReturnType<typeof orangeGetPaymentStatus>>
  try {
    verified = await orangeGetPaymentStatus(order_id, payToken)
  } catch {
    // Provider API unavailable — return 200 so Orange does not retry storm;
    // the client-side polling loop will re-check status independently.
    return NextResponse.json({ received: true })
  }

  const newStatus = verified.status === 'SUCCESS'
    ? 'completed'
    : (verified.status === 'FAILED' || verified.status === 'CANCELLED')
      ? 'failed'
      : null

  if (!newStatus) {
    // Provider says still in-flight or returned an unrecognized status.
    return NextResponse.json({ received: true })
  }

  // Verify gross amount if present in the provider response.
  if (verified.amount !== undefined) {
    if (verified.amount !== txn.amount) {
      return NextResponse.json({ received: true })
    }
  }

  // Atomically: CAS-updates transaction status + credits wallet (or funds escrow).
  // If the wallet_transfer inside the RPC raises an exception, the entire DB
  // transaction rolls back — the transaction stays in its pre-call state so the
  // next provider retry can succeed.
  const { data: result, error: rpcErr } = await (adminClient as any).rpc(
    'finalize_payment_webhook',
    {
      p_txn_id:         order_id,
      p_new_status:     newStatus,
      p_current_status: txn.status,
      p_provider_ref:   txnid ?? order_id,
      p_failure_reason: newStatus === 'failed' ? status : null,
      p_desc:           'Top-up via Orange Money (webhook)',
    }
  )

  if (rpcErr) {
    console.error(
      '[webhook/orange] finalize_payment_webhook failed — provider payment confirmed '
      + 'but DB transaction did not commit; next provider retry may recover this',
      { order_id, newStatus, error: rpcErr.message }
    )
  } else if (result !== 'completed_and_credited'
          && result !== 'completed_and_escrow_funded'
          && result !== 'completed_escrow_already_settled'
          && result !== 'failed'
          && result !== 'already_terminal') {
    console.warn('[webhook/orange] finalize_payment_webhook unexpected result',
      { order_id, result })
  }

  return NextResponse.json({ received: true })
}
