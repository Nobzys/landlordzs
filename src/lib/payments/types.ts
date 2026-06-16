// ─── Canonical payment provider types ────────────────────────────────────────
//
// Every payment flow in the app goes through these types.
// No provider-specific code must appear outside src/lib/payments/providers/.
// The rest of the application uses only getPaymentProvider() from factory.ts.

// ─── Payment methods ──────────────────────────────────────────────────────────

export type PaymentMethod =
  | 'mtn_momo'
  | 'orange_money'
  | 'bank_transfer'
  | 'stripe'
  | 'paypal'
  | 'mock'

/**
 * Cameroon-first ordering of payment methods.
 * Use this array to render the provider selector UI.
 */
export const CAMEROON_PAYMENT_ORDER: PaymentMethod[] = [
  'mtn_momo',
  'orange_money',
  'bank_transfer',
  'stripe',
  'paypal',
]

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  mtn_momo:      'MTN Mobile Money',
  orange_money:  'Orange Money',
  bank_transfer: 'Bank Transfer',
  stripe:        'Card / Apple Pay / Google Pay',
  paypal:        'PayPal',
  mock:          'Mock (Dev)',
}

export const PAYMENT_METHOD_DESCRIPTIONS: Record<PaymentMethod, string> = {
  mtn_momo:      'Pay directly from your MTN MoMo account',
  orange_money:  'Pay directly from your Orange Money account',
  bank_transfer: 'Bank transfer — verified within 1–2 business days',
  stripe:        'Visa, Mastercard, Apple Pay, Google Pay',
  paypal:        'Pay with your PayPal account',
  mock:          'Instant approval — development use only',
}

/** Providers that require an international payment gateway */
export const INTERNATIONAL_METHODS = new Set<PaymentMethod>(['stripe', 'paypal'])

// ─── Bank account details ─────────────────────────────────────────────────────

export interface BankDetails {
  accountName:   string
  accountNumber: string
  bankName:      string
  swiftCode?:    string
  iban?:         string
  instructions:  string
}

// ─── Input / result types ─────────────────────────────────────────────────────

export interface CreatePaymentInput {
  amount:       number
  currency:     string
  userId:       string
  description:  string
  metadata?:    Record<string, unknown>
  /** Mobile money: the subscriber's phone number (+237xxxxxxxx) */
  phone?:       string
  /** Redirect-based flows (Stripe, PayPal) */
  successUrl?:  string
  cancelUrl?:   string
  /** Used by subscription-aware providers (Stripe subscription mode) */
  planId?:      string
  billingType?: 'one_time' | 'monthly' | 'annual'
  /** Pre-existing customer ID at the provider (avoids duplicate customer creation) */
  customerId?:  string
}

export type PaymentStatus =
  | 'pending'
  | 'pending_verification'  // Bank transfer awaiting admin approval
  | 'completed'
  | 'failed'
  | 'refunded'

export interface PaymentResult {
  success:      boolean
  status:       PaymentStatus
  reference:    string
  paymentId?:   string
  /** Redirect URL for checkout-based flows (Stripe, PayPal) */
  redirectUrl?: string
  /** Account details shown to user after selecting bank transfer */
  bankDetails?: BankDetails
  error?:       string
}

export interface RefundResult {
  success:   boolean
  reference: string
  status:    'completed' | 'failed'
  error?:    string
}

export interface SubscriptionResult {
  success:       boolean
  status:        PaymentStatus
  reference:     string
  subscriptionId?: string
  redirectUrl?:  string
  bankDetails?:  BankDetails
  error?:        string
}

export interface PaymentStatusResult {
  status:    PaymentStatus
  reference: string
  error?:    string
}

// ─── Provider interface ───────────────────────────────────────────────────────

export interface PaymentProvider {
  /** Unique identifier matching PaymentMethod (used for logging, DB storage) */
  readonly name: PaymentMethod

  /**
   * Initiate a one-time payment.
   * - Mobile money: sends USSD push, returns { status: 'pending' }
   * - Stripe / PayPal: returns { redirectUrl } — caller must redirect user
   * - Bank transfer: returns { status: 'pending_verification', bankDetails }
   * - Mock: returns { status: 'completed' } immediately
   */
  createPayment(input: CreatePaymentInput): Promise<PaymentResult>

  /**
   * Verify / poll the payment status from the provider.
   * - Mobile money: polls provider status API
   * - Stripe: retrieves session and checks payment_status
   * - PayPal: captures the order
   * - Bank transfer: returns pending_verification (admin must approve)
   * - Mock: always returns completed
   */
  verifyPayment(
    reference: string,
    meta?: Record<string, unknown>,
  ): Promise<PaymentResult>

  /**
   * Request a refund for a completed payment.
   * Not all providers support programmatic refunds (bank transfer / mobile money require manual steps).
   */
  refundPayment(reference: string, amount?: number): Promise<RefundResult>

  /**
   * Create a recurring subscription via the provider.
   * For providers that do not support native subscriptions (mobile money, bank transfer),
   * this behaves identically to createPayment() — renewal is managed manually.
   */
  createSubscription(input: CreatePaymentInput): Promise<SubscriptionResult>

  /** Cancel an active subscription at the provider level. No-op for non-subscription providers. */
  cancelSubscription(subscriptionId: string): Promise<void>

  /**
   * Poll the provider for the latest payment status.
   * Distinct from verifyPayment: does NOT capture / settle the payment, just reads status.
   */
  getPaymentStatus(reference: string, meta?: Record<string, unknown>): Promise<PaymentStatusResult>
}
