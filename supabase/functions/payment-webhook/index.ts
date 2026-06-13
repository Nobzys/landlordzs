// Edge Function: payment-webhook
// Handles incoming payment callbacks from MTN Mobile Money and Orange Money.
// Both providers send a POST with a JSON body. This function:
//   1. Validates the signature / token
//   2. Maps the provider status to our internal payment_status enum
//   3. Updates the transaction record
//   4. Credits the payee wallet on success
//   5. Fires a notification
//
// Register this URL with each provider's developer portal:
//   https://<project-ref>.supabase.co/functions/v1/payment-webhook
//
// MTN MoMo callback format (simplified):
//   { financialTransactionId, externalId, amount, currency, status, ... }
//
// Orange Money callback format (simplified):
//   { txnid, status, amount, subscriberMsisdn, notifToken, ... }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const MTN_API_KEY   = Deno.env.get('MTN_MOMO_API_KEY') ?? ''
const ORANGE_SECRET = Deno.env.get('ORANGE_MONEY_SECRET') ?? ''

type Provider = 'mtn_momo' | 'orange_money'

interface NormalisedCallback {
  provider:      Provider
  external_ref:  string
  internal_ref:  string
  status:        'success' | 'failed' | 'pending' | 'cancelled'
  amount:        number
  currency:      string
  raw:           unknown
}

function normaliseMtn(body: Record<string, unknown>): NormalisedCallback {
  const statusMap: Record<string, NormalisedCallback['status']> = {
    SUCCESSFUL: 'success',
    FAILED:     'failed',
    PENDING:    'pending',
    CANCELLED:  'cancelled',
  }
  return {
    provider:     'mtn_momo',
    external_ref: String(body.financialTransactionId ?? ''),
    internal_ref: String(body.externalId ?? ''),
    status:       statusMap[String(body.status ?? '')] ?? 'failed',
    amount:       Number(body.amount ?? 0),
    currency:     String(body.currency ?? 'XAF'),
    raw: body,
  }
}

function normaliseOrange(body: Record<string, unknown>): NormalisedCallback {
  const statusMap: Record<string, NormalisedCallback['status']> = {
    SUCCESS:   'success',
    FAILED:    'failed',
    PENDING:   'pending',
    INITIATED: 'pending',
  }
  return {
    provider:     'orange_money',
    external_ref: String(body.txnid ?? ''),
    internal_ref: String(body.notifToken ?? ''),
    status:       statusMap[String(body.status ?? '').toUpperCase()] ?? 'failed',
    amount:       Number(body.amount ?? 0),
    currency:     'XAF',
    raw: body,
  }
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  // Detect provider from path or header
  const url      = new URL(req.url)
  const provider = (url.searchParams.get('provider') ?? 'mtn_momo') as Provider

  let rawBody: Record<string, unknown>
  try {
    rawBody = await req.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  // Basic token validation (production should use HMAC signature verification)
  const authHeader = req.headers.get('Authorization') ?? ''
  if (provider === 'mtn_momo' && MTN_API_KEY) {
    if (!authHeader.includes(MTN_API_KEY)) {
      console.warn('MTN MoMo: invalid API key in Authorization header')
      // Return 200 to prevent retries on intentionally rejected webhooks;
      // log for investigation instead of exposing auth detail via error response.
      return new Response('OK', { status: 200 })
    }
  }
  if (provider === 'orange_money' && ORANGE_SECRET) {
    const notifToken = String((rawBody as Record<string, unknown>).notifToken ?? '')
    if (notifToken !== ORANGE_SECRET) {
      console.warn('Orange Money: notifToken mismatch')
      return new Response('OK', { status: 200 })
    }
  }

  const cb = provider === 'mtn_momo'
    ? normaliseMtn(rawBody)
    : normaliseOrange(rawBody)

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

  // Find the transaction by internal reference
  const { data: txn, error: txnErr } = await supabase
    .from('transactions')
    .select('id, user_id, amount, currency, status, escrow_id, metadata')
    .eq('id', cb.internal_ref)
    .single()

  if (txnErr || !txn) {
    console.error('Transaction not found for ref:', cb.internal_ref, txnErr?.message)
    // Return 200 so the provider stops retrying an unknown reference
    return new Response('OK', { status: 200 })
  }

  // Idempotency: skip if already in a terminal state
  if (txn.status === 'completed' || txn.status === 'refunded') {
    return new Response(JSON.stringify({ skipped: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const newStatus = cb.status === 'success'   ? 'completed'
                  : cb.status === 'failed'    ? 'failed'
                  : cb.status === 'cancelled' ? 'cancelled'
                  : 'pending'

  // Update transaction
  const { error: updateErr } = await supabase
    .from('transactions')
    .update({
      status:        newStatus,
      provider_ref:  cb.external_ref,
      metadata:      { ...(txn.metadata ?? {}), webhook_raw: cb.raw },
      completed_at:  cb.status === 'success' ? new Date().toISOString() : null,
    })
    .eq('id', txn.id)

  if (updateErr) {
    console.error('Transaction update failed:', updateErr.message)
    return new Response(JSON.stringify({ error: updateErr.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // On success: credit wallet if not an escrow transaction
  if (cb.status === 'success' && !txn.escrow_id) {
    const { error: walletErr } = await supabase.rpc('wallet_transfer', {
      p_from_id:    null,
      p_to_id:      txn.user_id,
      p_amount:     txn.amount,
      p_currency:   txn.currency,
      p_ref:        txn.id,
      p_type:       'deposit',
      p_note:       `Payment via ${cb.provider}`,
    })
    if (walletErr) console.error('Wallet credit failed:', walletErr.message)
  }

  // On success: move escrow to funded if this transaction is for an escrow
  if (cb.status === 'success' && txn.escrow_id) {
    await supabase
      .from('escrow_accounts')
      .update({ status: 'funded', funded_at: new Date().toISOString() })
      .eq('id', txn.escrow_id)
      .eq('status', 'pending')
  }

  // Notify the user
  const notifTitle = cb.status === 'success'
    ? 'Payment Confirmed'
    : cb.status === 'failed'
    ? 'Payment Failed'
    : 'Payment Update'

  const formattedAmount = new Intl.NumberFormat('fr-CM', {
    style: 'currency', currency: cb.currency,
  }).format(cb.amount)

  const notifBody = cb.status === 'success'
    ? `Your payment of ${formattedAmount} via ${cb.provider === 'mtn_momo' ? 'MTN MoMo' : 'Orange Money'} was successful.`
    : `Your payment of ${formattedAmount} could not be processed. Please try again.`

  await supabase.functions.invoke('send-notification', {
    body: {
      user_id: txn.user_id,
      type:    `payment_${cb.status}`,
      title:   notifTitle,
      body:    notifBody,
      data:    { transaction_id: txn.id, provider: cb.provider },
    },
  })

  console.log(`Webhook processed: txn=${txn.id} provider=${cb.provider} status=${newStatus}`)

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
