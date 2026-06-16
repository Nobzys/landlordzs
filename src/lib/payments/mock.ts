import type {
  BillingPaymentProvider,
  PaymentRequest,
  PaymentResult,
  RefundResult,
  CheckoutSessionResult,
  CustomerResult,
  WebhookResult,
} from './provider'

// ─── Mock payment provider ────────────────────────────────────────────────────
// Always succeeds synchronously — safe for development and testing.
// Falls back automatically when no real provider is configured.

export class MockPaymentProvider implements BillingPaymentProvider {
  readonly name = 'mock'

  async charge(_req: PaymentRequest): Promise<PaymentResult> {
    const ref = `mock_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    return { success: true, reference: ref, status: 'completed', paymentId: ref }
  }

  async createCheckoutSession(req: PaymentRequest & {
    successUrl: string
    cancelUrl:  string
    planId:     string
    billingType: 'one_time' | 'monthly' | 'annual'
    customerId?: string
  }): Promise<CheckoutSessionResult> {
    const sessionId = `mock_cs_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    // In mock mode, redirect directly to the success URL with the session ID
    const url = `${req.successUrl}${req.successUrl.includes('?') ? '&' : '?'}session_id=${sessionId}&mock=1`
    return { sessionId, url }
  }

  async verifyPayment(sessionId: string): Promise<PaymentResult> {
    return { success: true, reference: sessionId, status: 'completed', paymentId: sessionId }
  }

  async refund(_providerReference: string, _amount: number): Promise<RefundResult> {
    const ref = `mock_refund_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    return { success: true, reference: ref, status: 'completed' }
  }

  async createCustomer(_userId: string, _email: string, _name?: string): Promise<CustomerResult> {
    return { customerId: `mock_cus_${Math.random().toString(36).slice(2, 9)}` }
  }

  async cancelSubscription(_externalSubscriptionId: string): Promise<void> {
    // No-op in mock
  }

  async createWebhook(_url: string, _events: string[]): Promise<WebhookResult> {
    return { webhookId: `mock_wh_${Math.random().toString(36).slice(2, 9)}` }
  }
}
