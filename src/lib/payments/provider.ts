// ─── Payment provider abstraction ────────────────────────────────────────────
// All gateway SDKs talk through this interface so the billing engine never
// imports a gateway directly.  Mock is the fallback for development/testing;
// real providers are loaded dynamically so their SDKs stay out of the bundle
// until they are actually needed.

// ─── Shared request / result types ───────────────────────────────────────────

export interface PaymentRequest {
  amount:      number
  currency:    string
  userId:      string
  description: string
  metadata?:   Record<string, unknown>
}

export interface PaymentResult {
  success:    boolean
  reference:  string
  status:     'completed' | 'pending' | 'failed'
  error?:     string
  /** Provider-specific payment intent / capture ID */
  paymentId?: string
}

export interface RefundResult {
  success:   boolean
  reference: string
  status:    'completed' | 'pending' | 'failed'
  error?:    string
}

/** Returned by createCheckoutSession — caller must redirect the user to `url`. */
export interface CheckoutSessionResult {
  /** Provider's session / order ID (stored in payments.checkout_session_id) */
  sessionId: string
  /** Full URL to redirect the user to */
  url:       string
}

export interface CustomerResult {
  customerId: string
}

export interface WebhookResult {
  webhookId: string
}

// ─── Provider interface ───────────────────────────────────────────────────────

export interface BillingPaymentProvider {
  readonly name: string

  // ── Synchronous charge (mock, fallback) ──────────────────────────────────
  charge(req: PaymentRequest): Promise<PaymentResult>

  // ── Async redirect-based checkout (Stripe, PayPal) ───────────────────────
  createCheckoutSession?(req: PaymentRequest & {
    successUrl: string
    cancelUrl:  string
    planId:     string
    billingType: 'one_time' | 'monthly' | 'annual'
    /** Pre-existing Stripe/PayPal customer ID, if known */
    customerId?: string
  }): Promise<CheckoutSessionResult>

  // ── Verify an async payment after the user returns from the provider ─────
  verifyPayment?(sessionId: string): Promise<PaymentResult>

  // ── Refund ───────────────────────────────────────────────────────────────
  refund(providerReference: string, amount: number): Promise<RefundResult>

  // ── Customer lifecycle ───────────────────────────────────────────────────
  createCustomer?(userId: string, email: string, name?: string): Promise<CustomerResult>

  // ── Subscription lifecycle (for providers that manage recurring billing) ─
  cancelSubscription?(externalSubscriptionId: string): Promise<void>

  // ── Programmatic webhook registration ────────────────────────────────────
  createWebhook?(url: string, events: string[]): Promise<WebhookResult>
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export type ProviderName = 'mock' | 'stripe' | 'paypal' | 'mobile_money'

export async function getPaymentProvider(name: ProviderName = 'mock'): Promise<BillingPaymentProvider> {
  switch (name) {
    case 'stripe': {
      const { StripePaymentProvider } = await import('./stripe')
      return new StripePaymentProvider()
    }
    case 'paypal': {
      const { PayPalPaymentProvider } = await import('./paypal')
      return new PayPalPaymentProvider()
    }
    case 'mobile_money': {
      const { MobileMoneyPaymentProvider } = await import('./mobile-money')
      return new MobileMoneyPaymentProvider()
    }
    case 'mock':
    default: {
      const { MockPaymentProvider } = await import('./mock')
      return new MockPaymentProvider()
    }
  }
}
