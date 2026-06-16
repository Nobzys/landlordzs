// ─── PayPal webhook handler ───────────────────────────────────────────────────
// Route: POST /api/payments/webhook/paypal
//
// Events handled:
//   PAYMENT.CAPTURE.COMPLETED           — activate subscription after capture
//   PAYMENT.CAPTURE.REFUNDED            — mark payment refunded
//   BILLING.SUBSCRIPTION.CANCELLED      — cancel local subscription
//   BILLING.SUBSCRIPTION.PAYMENT.FAILED — mark subscription past_due, notify user
//
// Required env var: PAYPAL_WEBHOOK_ID (from PayPal developer dashboard)

import { NextRequest, NextResponse } from 'next/server'
import { verifyPayPalWebhook } from '@/lib/payments/paypal'
import { createAdminClient } from '@/lib/supabase/admin'
import { insertNotification } from '@/lib/notifications'
import { captureException } from '@/lib/monitoring'
import type { BillingPayment, SubscriptionPlan } from '@/types/billing'

export const dynamic = 'force-dynamic'

async function logWebhookEvent(
  adminClient: ReturnType<typeof createAdminClient>,
  eventId:    string | undefined,
  eventType:  string,
  payload:    unknown,
  status:     'processed' | 'failed' | 'ignored',
  error?:     string,
): Promise<void> {
  try {
    await (adminClient as any).from('webhook_events').upsert(
      {
        provider:     'paypal',
        event_type:   eventType,
        event_id:     eventId ?? null,
        payload,
        status,
        error:        error ?? null,
        processed_at: new Date().toISOString(),
      },
      { onConflict: 'provider,event_id', ignoreDuplicates: false },
    )
  } catch {
    // Non-fatal
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const rawBody = await req.text()

  // Collect PayPal signature headers
  const headers: Record<string, string> = {}
  for (const key of ['paypal-auth-algo', 'paypal-cert-url', 'paypal-transmission-id',
                      'paypal-transmission-sig', 'paypal-transmission-time']) {
    headers[key] = req.headers.get(key) ?? ''
  }

  // Verify webhook signature
  const verified = await verifyPayPalWebhook(headers, rawBody)
  if (!verified) {
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 401 })
  }

  let event: { id?: string; event_type: string; resource: Record<string, unknown> }
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  // ── Idempotency ────────────────────────────────────────────────────────────
  if (event.id) {
    const { data: existing } = await (adminClient as any)
      .from('webhook_events')
      .select('id')
      .eq('provider', 'paypal')
      .eq('event_id', event.id)
      .maybeSingle() as { data: { id: string } | null }

    if (existing) {
      return NextResponse.json({ received: true, duplicate: true })
    }
  }

  try {
    await handlePayPalEvent(event, adminClient)
    await logWebhookEvent(adminClient, event.id, event.event_type, event.resource, 'processed')
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    captureException(err, { context: 'paypal_webhook', eventType: event.event_type })
    await logWebhookEvent(adminClient, event.id, event.event_type, event.resource, 'failed', msg)
  }

  return NextResponse.json({ received: true })
}

async function handlePayPalEvent(
  event:       { id?: string; event_type: string; resource: Record<string, unknown> },
  adminClient: ReturnType<typeof createAdminClient>,
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resource = event.resource as any

  switch (event.event_type) {

    case 'PAYMENT.CAPTURE.COMPLETED': {
      const orderId  = resource.supplementary_data?.related_ids?.order_id as string | undefined
               ?? resource.id as string
      const customId = resource.custom_id as string | undefined  // format: `userId:planId`
      if (!customId) break

      const [userId, planId] = customId.split(':')
      if (!userId || !planId) break

      // Check not already activated
      const { data: existingSub } = await (adminClient as any)
        .from('subscriptions')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle() as { data: { id: string } | null }

      if (existingSub) {
        await (adminClient as any)
          .from('payments')
          .update({ status: 'completed', external_payment_id: resource.id as string })
          .eq('checkout_session_id', orderId)
        break
      }

      const { data: payment } = await (adminClient as any)
        .from('payments')
        .select('*')
        .eq('checkout_session_id', orderId)
        .maybeSingle() as { data: BillingPayment | null }

      const { data: plan } = await (adminClient as any)
        .from('subscription_plans')
        .select('*')
        .eq('id', planId)
        .maybeSingle() as { data: SubscriptionPlan | null }

      if (!plan) break

      const billingType = plan.billing_type
      const startsAt    = new Date()
      let expiresAt: Date | null = null
      if (billingType === 'monthly') {
        expiresAt = new Date(startsAt)
        expiresAt.setMonth(expiresAt.getMonth() + 1)
      } else if (billingType === 'annual') {
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
          auto_renew: billingType !== 'one_time',
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
          status:              'completed',
          external_payment_id: resource.id as string,
          invoice_id:          invoice?.id ?? null,
        })
        .eq('checkout_session_id', orderId)

      if (!payment) {
        // Webhook arrived before the return page — create the payment record
        await (adminClient as any).from('payments').insert({
          user_id:             userId,
          invoice_id:          invoice?.id ?? null,
          provider:            'paypal',
          provider_reference:  orderId,
          external_payment_id: resource.id as string,
          amount:              plan.amount,
          currency:            plan.currency,
          status:              'completed',
          metadata:            { plan_id: planId, billing_type: billingType },
        })
      }

      await insertNotification(
        adminClient, userId, 'subscription',
        'Payment confirmed (PayPal)',
        'Your PayPal payment was successful. Your account is now active.',
        '/account/billing',
        { entityType: 'subscription', entityId: sub?.id },
      )
      break
    }

    case 'PAYMENT.CAPTURE.REFUNDED': {
      const captureId = resource.id as string | undefined
      if (!captureId) break

      await (adminClient as any)
        .from('payments')
        .update({ status: 'refunded', refunded_at: new Date().toISOString() })
        .eq('external_payment_id', captureId)
        .eq('provider', 'paypal')
      break
    }

    case 'BILLING.SUBSCRIPTION.CANCELLED': {
      const paypalSubId = resource.id as string | undefined
      if (!paypalSubId) break

      const { data: payment } = await (adminClient as any)
        .from('payments')
        .select('user_id')
        .eq('external_subscription_id', paypalSubId)
        .maybeSingle() as { data: { user_id: string } | null }

      if (!payment?.user_id) break

      await (adminClient as any)
        .from('subscriptions')
        .update({ status: 'cancelled', auto_renew: false })
        .eq('user_id', payment.user_id)
        .in('status', ['active', 'past_due'])

      await insertNotification(
        adminClient, payment.user_id, 'billing',
        'Subscription cancelled',
        'Your PayPal subscription has been cancelled.',
        '/account/billing',
      )
      break
    }

    case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED': {
      const paypalSubId = resource.id as string | undefined
      if (!paypalSubId) break

      const { data: payment } = await (adminClient as any)
        .from('payments')
        .select('user_id')
        .eq('external_subscription_id', paypalSubId)
        .maybeSingle() as { data: { user_id: string } | null }

      if (!payment?.user_id) break

      await (adminClient as any)
        .from('subscriptions')
        .update({ status: 'past_due' })
        .eq('user_id', payment.user_id)
        .eq('status', 'active')

      await insertNotification(
        adminClient, payment.user_id, 'billing',
        'Payment failed',
        'Your PayPal subscription payment failed. Please check your PayPal account.',
        '/account/billing',
      )
      break
    }

    default:
      await logWebhookEvent(adminClient, event.id, event.event_type, resource, 'ignored')
  }
}
