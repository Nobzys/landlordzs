import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Orange Money sends an async notification to ORANGE_MONEY_NOTIF_URL after payment.
// Validation: compare the webhook's notif_token with what we stored in provider_meta
// during initiation. Orange returns notif_token in the initiation response.

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
    .select('id, status, payer_id, net_amount, escrow_id, provider_meta')
    .eq('id', order_id)
    .eq('provider', 'orange_money')
    .single()

  if (!txn) {
    // Unknown order — return 200 to prevent Orange retry storm
    return NextResponse.json({ received: true })
  }

  // Validate notif_token against stored value
  const storedToken = (txn.provider_meta as Record<string, string>)?.notif_token
  if (storedToken && storedToken !== notif_token) {
    return NextResponse.json({ error: 'Invalid notif_token' }, { status: 401 })
  }

  if (TERMINAL_TX.has(txn.status)) {
    return NextResponse.json({ received: true }) // idempotent
  }

  // Still processing — nothing to record yet
  if (status === 'INITIATED' || status === 'PENDING') {
    return NextResponse.json({ received: true })
  }

  const newStatus = status === 'SUCCESS'
    ? 'completed'
    : (status === 'FAILED' || status === 'CANCELLED')
      ? 'failed'
      : null

  if (!newStatus) {
    return NextResponse.json({ received: true })
  }

  const update: Record<string, unknown> = {
    status:       newStatus,
    provider_ref: txnid ?? order_id,
  }
  if (newStatus === 'completed') update.completed_at = new Date().toISOString()
  if (newStatus === 'failed') {
    update.failed_at      = new Date().toISOString()
    update.failure_reason = status
  }

  // CAS: only the first concurrent webhook wins
  const { data: updated } = await (adminClient as any)
    .from('transactions')
    .update(update)
    .eq('id', order_id)
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
        p_ref_id:   order_id,
        p_desc:     'Top-up via Orange Money (webhook)',
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
