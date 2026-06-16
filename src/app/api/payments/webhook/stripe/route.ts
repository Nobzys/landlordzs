// ─── Stripe webhook handler ───────────────────────────────────────────────────
// Route: POST /api/payments/webhook/stripe
//
// Verified events handled:
//   checkout.session.completed         — activate subscription after checkout
//   customer.subscription.created      — track Stripe-managed subscription start
//   customer.subscription.updated      — sync status (e.g. past_due → active)
//   customer.subscription.deleted      — cancel local subscription
//   invoice.payment_failed             — mark subscription past_due, notify user
//   charge.refunded                    — update payment to refunded
//
// Design:
//   - Idempotent: duplicate events are silently ignored via webhook_events dedup
//   - Fail-safe: errors are logged but always return 200 to prevent Stripe retries
//     for non-recoverable issues

import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { constructStripeEvent } from '@/lib/payments/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { insertNotification } from '@/lib/notifications'
import { captureException } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'

async function logWebhookEvent(
  adminClient: ReturnType<typeof createAdminClient>,
  eventId:    string,
  eventType:  string,
  payload:    unknown,
  status:     'processed' | 'failed' | 'ignored',
  error?:     string,
): Promise<void> {
  try {
    await (adminClient as any).from('webhook_events').upsert(
      {
        provider:      'stripe',
        event_type:    eventType,
        event_id:      eventId,
        payload,
        status,
        error:         error ?? null,
        processed_at:  new Date().toISOString(),
      },
      { onConflict: 'provider,event_id', ignoreDuplicates: false },
    )
  } catch {
    // Non-fatal — don't block the response
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event: Stripe.Event
  const rawBody = Buffer.from(await req.arrayBuffer())

  try {
    event = await constructStripeEvent(rawBody, signature)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Signature verification failed'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const adminClient = createAdminClient()

  // ── Idempotency check ──────────────────────────────────────────────────────
  const { data: existing } = await (adminClient as any)
    .from('webhook_events')
    .select('id')
    .eq('provider', 'stripe')
    .eq('event_id', event.id)
    .maybeSingle() as { data: { id: string } | null }

  if (existing) {
    return NextResponse.json({ received: true, duplicate: true })
  }

  try {
    await handleStripeEvent(event, adminClient)
    await logWebhookEvent(adminClient, event.id, event.type, event.data.object, 'processed')
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    captureException(err, { context: 'stripe_webhook', eventType: event.type, eventId: event.id })
    await logWebhookEvent(adminClient, event.id, event.type, event.data.object, 'failed', msg)
    // Return 200 to prevent Stripe from retrying non-recoverable errors
  }

  return NextResponse.json({ received: true })
}

async function handleStripeEvent(
  event:       Stripe.Event,
  adminClient: ReturnType<typeof createAdminClient>,
): Promise<void> {
  switch (event.type) {

    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.payment_status !== 'paid') break

      const userId  = session.metadata?.user_id ?? session.client_reference_id
      const planId  = session.metadata?.plan_id
      const btype   = (session.metadata?.billing_type ?? 'one_time') as 'one_time' | 'monthly' | 'annual'

      if (!userId || !planId) break

      // Check not already activated (return page may have done it first)
      const { data: existing } = await (adminClient as any)
        .from('subscriptions')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle() as { data: { id: string } | null }

      if (existing) {
        // Update the pending payment record
        await (adminClient as any)
          .from('payments')
          .update({
            status:               'completed',
            provider_reference:   typeof session.payment_intent === 'string'
                                    ? session.payment_intent
                                    : (session.payment_intent as Stripe.PaymentIntent | null)?.id,
            external_customer_id: session.customer as string | null,
            external_subscription_id: typeof session.subscription === 'string'
                                        ? session.subscription
                                        : (session.subscription as Stripe.Subscription | null)?.id,
          })
          .eq('checkout_session_id', session.id)
        break
      }

      const { data: plan } = await (adminClient as any)
        .from('subscription_plans')
        .select('*')
        .eq('id', planId)
        .maybeSingle() as { data: { id: string; amount: number; currency: string } | null }

      if (!plan) break

      const startsAt  = new Date()
      let expiresAt: Date | null = null
      if (btype === 'monthly') {
        expiresAt = new Date(startsAt)
        expiresAt.setMonth(expiresAt.getMonth() + 1)
      } else if (btype === 'annual') {
        expiresAt = new Date(startsAt)
        expiresAt.setFullYear(expiresAt.getFullYear() + 1)
      }

      const { data: sub } = await (adminClient as any)
        .from('subscriptions')
        .insert({
          user_id:    userId,
          plan_id:    planId,
          status:     'active',
          starts_at:  startsAt.toISOString(),
          expires_at: expiresAt?.toISOString() ?? null,
          auto_renew: btype !== 'one_time',
        })
        .select('id')
        .single() as { data: { id: string } | null }

      const { data: invoice } = await (adminClient as any)
        .from('invoices')
        .insert({
          user_id:         userId,
          subscription_id: sub?.id,
          amount:          plan.amount,
          currency:        plan.currency,
          status:          'paid',
          issued_at:       new Date().toISOString(),
          paid_at:         new Date().toISOString(),
        })
        .select('id')
        .single() as { data: { id: string } | null }

      await (adminClient as any)
        .from('payments')
        .update({
          status:                   'completed',
          invoice_id:               invoice?.id ?? null,
          provider_reference:       typeof session.payment_intent === 'string'
                                      ? session.payment_intent
                                      : (session.payment_intent as Stripe.PaymentIntent | null)?.id,
          external_customer_id:     session.customer as string | null,
          external_subscription_id: typeof session.subscription === 'string'
                                      ? session.subscription
                                      : (session.subscription as Stripe.Subscription | null)?.id,
        })
        .eq('checkout_session_id', session.id)

      await insertNotification(
        adminClient, userId, 'subscription',
        'Payment confirmed', 'Your Stripe payment was successful. Your account is now active.',
        '/account/billing',
        { entityType: 'subscription', entityId: sub?.id },
      )
      break
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const newStatus = sub.status === 'active' ? 'active'
        : sub.status === 'past_due' ? 'past_due'
        : sub.status === 'canceled' ? 'cancelled'
        : sub.status === 'unpaid'   ? 'past_due'
        : null

      if (!newStatus) break

      await (adminClient as any)
        .from('subscriptions')
        .update({ status: newStatus })
        .eq('external_subscription_id', sub.id)

      // Sync via the payments table's external_subscription_id column
      await (adminClient as any)
        .from('payments')
        .update({ external_subscription_id: sub.id })
        .eq('external_subscription_id', sub.id)
      break
    }

    case 'customer.subscription.deleted': {
      const sub    = event.data.object as Stripe.Subscription
      const userId = sub.metadata?.user_id

      // Find and cancel by external_subscription_id
      const { data: payment } = await (adminClient as any)
        .from('payments')
        .select('user_id')
        .eq('external_subscription_id', sub.id)
        .maybeSingle() as { data: { user_id: string } | null }

      const targetUserId = userId ?? payment?.user_id
      if (!targetUserId) break

      await (adminClient as any)
        .from('subscriptions')
        .update({ status: 'cancelled', auto_renew: false })
        .eq('user_id', targetUserId)
        .in('status', ['active', 'past_due'])

      await insertNotification(
        adminClient, targetUserId, 'billing',
        'Subscription cancelled', 'Your Stripe subscription has been cancelled.',
        '/account/billing',
      )
      break
    }

    case 'invoice.payment_failed': {
      const stripeInvoice = event.data.object as Stripe.Invoice
      const userId = (stripeInvoice as unknown as { subscription_details?: { metadata?: Record<string, string> } })
        .subscription_details?.metadata?.user_id

      if (!userId) break

      await (adminClient as any)
        .from('subscriptions')
        .update({ status: 'past_due' })
        .eq('user_id', userId)
        .eq('status', 'active')

      await insertNotification(
        adminClient, userId, 'billing',
        'Payment failed', 'Your subscription payment failed. Please update your payment method to avoid losing access.',
        '/account/billing',
      )
      break
    }

    case 'charge.refunded': {
      const charge     = event.data.object as Stripe.Charge
      const paymentRef = charge.payment_intent as string | null
      if (!paymentRef) break

      await (adminClient as any)
        .from('payments')
        .update({ status: 'refunded', refunded_at: new Date().toISOString() })
        .eq('provider_reference', paymentRef)
        .eq('provider', 'stripe')
      break
    }

    default:
      await logWebhookEvent(adminClient, event.id, event.type, event.data.object, 'ignored')
  }
}
