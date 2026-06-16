// ─── Stripe payment provider ──────────────────────────────────────────────────
// Supports cards, Apple Pay, Google Pay via Stripe Checkout.
// One-time payments use mode:'payment'; subscriptions use mode:'subscription'.
// Recurring billing is managed by Stripe — webhooks update local subscription state.
//
// Required env vars:
//   STRIPE_SECRET_KEY       — sk_test_xxx (sandbox) / sk_live_xxx (production)
//   STRIPE_WEBHOOK_SECRET   — whsec_xxx (from Stripe Dashboard → Webhooks)
//   NEXT_PUBLIC_APP_URL     — base URL for success/cancel redirects

import type Stripe from 'stripe'
import type {
  BillingPaymentProvider,
  PaymentRequest,
  PaymentResult,
  RefundResult,
  CheckoutSessionResult,
  CustomerResult,
  WebhookResult,
} from './provider'

function getStripe(): Stripe {
  const StripeLib = require('stripe') as typeof import('stripe').default
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured')
  return new StripeLib(key, { apiVersion: '2026-05-27.dahlia' })
}

export class StripePaymentProvider implements BillingPaymentProvider {
  readonly name = 'stripe'

  // ── Checkout session (primary payment method for Stripe) ─────────────────
  async createCheckoutSession(req: PaymentRequest & {
    successUrl:   string
    cancelUrl:    string
    planId:       string
    billingType:  'one_time' | 'monthly' | 'annual'
    customerId?:  string
  }): Promise<CheckoutSessionResult> {
    const stripe = getStripe()

    // XAF is a zero-decimal currency in Stripe
    const unitAmount = req.amount

    const isRecurring = req.billingType === 'monthly' || req.billingType === 'annual'
    const interval    = req.billingType === 'monthly' ? 'month' : 'year'

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode:                isRecurring ? 'subscription' : 'payment',
      payment_method_types: ['card'],
      customer:            req.customerId,
      line_items: [
        {
          price_data: {
            currency:    req.currency.toLowerCase(),
            unit_amount: unitAmount,
            product_data: {
              name:        req.description,
              metadata:    { plan_id: req.planId, user_id: req.userId },
            },
            ...(isRecurring
              ? { recurring: { interval } }
              : {}),
          },
          quantity: 1,
        },
      ],
      success_url:  `${req.successUrl}${req.successUrl.includes('?') ? '&' : '?'}session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:   req.cancelUrl,
      metadata: {
        user_id:      req.userId,
        plan_id:      req.planId,
        billing_type: req.billingType,
        ...(req.metadata as Record<string, string> | undefined),
      },
      client_reference_id: req.userId,
    }

    const session = await stripe.checkout.sessions.create(sessionParams)
    return { sessionId: session.id, url: session.url! }
  }

  // ── Verify a completed checkout session ──────────────────────────────────
  async verifyPayment(sessionId: string): Promise<PaymentResult> {
    const stripe  = getStripe()
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent', 'subscription'],
    })

    if (session.payment_status === 'paid' || session.status === 'complete') {
      const paymentId =
        typeof session.payment_intent === 'object'
          ? (session.payment_intent as Stripe.PaymentIntent).id
          : session.payment_intent ?? session.id

      return {
        success:   true,
        reference: session.id,
        status:    'completed',
        paymentId,
      }
    }

    return {
      success:   false,
      reference: session.id,
      status:    session.payment_status === 'unpaid' ? 'pending' : 'failed',
    }
  }

  // ── Synchronous charge — not the primary path for Stripe ─────────────────
  // Stripe requires the user to interact with a checkout page.
  // Use createCheckoutSession() instead.
  async charge(_req: PaymentRequest): Promise<PaymentResult> {
    return {
      success:   false,
      reference: '',
      status:    'failed',
      error:     'Use createCheckoutSession() for Stripe payments.',
    }
  }

  // ── Refund ───────────────────────────────────────────────────────────────
  async refund(providerReference: string, amount: number): Promise<RefundResult> {
    const stripe = getStripe()
    try {
      const refund = await stripe.refunds.create({
        payment_intent: providerReference,
        amount,
      })
      return {
        success:   refund.status === 'succeeded',
        reference: refund.id,
        status:    refund.status === 'succeeded' ? 'completed' : 'pending',
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Stripe refund failed'
      return { success: false, reference: '', status: 'failed', error: msg }
    }
  }

  // ── Customer management ──────────────────────────────────────────────────
  async createCustomer(userId: string, email: string, name?: string): Promise<CustomerResult> {
    const stripe   = getStripe()
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: { userId },
    })
    return { customerId: customer.id }
  }

  // ── Cancel a Stripe-managed subscription ────────────────────────────────
  async cancelSubscription(externalSubscriptionId: string): Promise<void> {
    const stripe = getStripe()
    await stripe.subscriptions.cancel(externalSubscriptionId)
  }

  // ── Register a webhook endpoint programmatically ─────────────────────────
  async createWebhook(url: string, events: string[]): Promise<WebhookResult> {
    const stripe  = getStripe()
    const webhook = await stripe.webhookEndpoints.create({
      url,
      enabled_events: events as Stripe.WebhookEndpointCreateParams.EnabledEvent[],
    })
    return { webhookId: webhook.id }
  }
}

// ─── Webhook signature verification helper ───────────────────────────────────
// Called from /api/payments/webhook/stripe to authenticate inbound events.

export async function constructStripeEvent(
  rawBody: Buffer,
  signature: string,
): Promise<Stripe.Event> {
  const stripe = getStripe()
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET is not configured')
  return stripe.webhooks.constructEvent(rawBody, signature, secret)
}
