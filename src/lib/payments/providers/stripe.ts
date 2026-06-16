import type {
  PaymentProvider,
  CreatePaymentInput,
  PaymentResult,
  RefundResult,
  SubscriptionResult,
  PaymentStatusResult,
} from '../types'

// ─── Stripe provider ──────────────────────────────────────────────────────────
// Supports cards, Apple Pay, Google Pay via Stripe Checkout.
// One-time → mode:'payment'; recurring → mode:'subscription'
// XAF is a zero-decimal currency — amounts are passed as whole integers.
//
// Required env vars:
//   STRIPE_SECRET_KEY        sk_test_xxx / sk_live_xxx
//   STRIPE_WEBHOOK_SECRET    whsec_xxx (Stripe Dashboard → Webhooks)

function getStripe() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const StripeLib = require('stripe') as typeof import('stripe').default
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured.')
  return new StripeLib(key, { apiVersion: '2026-05-27.dahlia' })
}

export class StripeProvider implements PaymentProvider {
  readonly name = 'stripe' as const

  async createPayment(input: CreatePaymentInput): Promise<PaymentResult> {
    const stripe  = getStripe()
    const appUrl  = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    const session = await stripe.checkout.sessions.create({
      mode:                'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency:     input.currency.toLowerCase(),
          unit_amount:  input.amount,        // XAF = zero-decimal
          product_data: { name: input.description },
        },
        quantity: 1,
      }],
      success_url: input.successUrl ?? `${appUrl}/account/billing/stripe-return?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  input.cancelUrl  ?? `${appUrl}/account/billing`,
      customer:    input.customerId,
      metadata:    { userId: input.userId, ...input.metadata as Record<string, string> },
    })

    return {
      success:     true,
      status:      'pending',
      reference:   session.id,
      redirectUrl: session.url ?? undefined,
    }
  }

  async verifyPayment(reference: string, _meta?: Record<string, unknown>): Promise<PaymentResult> {
    const stripe  = getStripe()
    const session = await stripe.checkout.sessions.retrieve(reference)
    const paid    = session.payment_status === 'paid' || session.status === 'complete'
    return {
      success:   paid,
      status:    paid ? 'completed' : 'pending',
      reference,
      paymentId: session.payment_intent?.toString(),
    }
  }

  async refundPayment(reference: string, amount?: number): Promise<RefundResult> {
    const stripe = getStripe()
    const refund = await stripe.refunds.create({
      payment_intent: reference,
      ...(amount !== undefined ? { amount } : {}),
    })
    return {
      success:   refund.status === 'succeeded',
      reference: refund.id,
      status:    refund.status === 'succeeded' ? 'completed' : 'failed',
    }
  }

  async createSubscription(input: CreatePaymentInput): Promise<SubscriptionResult> {
    if (!input.planId) {
      // Fall back to one-time if no plan configured
      const result = await this.createPayment(input)
      return { success: result.success, status: result.status, reference: result.reference, redirectUrl: result.redirectUrl }
    }

    const stripe  = getStripe()
    const appUrl  = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    const session = await stripe.checkout.sessions.create({
      mode:        'subscription',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency:    input.currency.toLowerCase(),
          unit_amount: input.amount,
          recurring:   { interval: input.billingType === 'annual' ? 'year' : 'month' },
          product_data: { name: input.description },
        },
        quantity: 1,
      }],
      success_url: input.successUrl ?? `${appUrl}/account/billing/stripe-return?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  input.cancelUrl  ?? `${appUrl}/account/billing`,
      customer:    input.customerId,
      metadata:    { userId: input.userId, planId: input.planId, ...(input.metadata as Record<string, string>) },
    })

    return {
      success:     true,
      status:      'pending',
      reference:   session.id,
      redirectUrl: session.url ?? undefined,
    }
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    const stripe = getStripe()
    await stripe.subscriptions.cancel(subscriptionId)
  }

  async getPaymentStatus(reference: string): Promise<PaymentStatusResult> {
    const result = await this.verifyPayment(reference)
    return { status: result.status, reference }
  }
}
