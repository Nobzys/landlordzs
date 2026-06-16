import type {
  PaymentProvider,
  CreatePaymentInput,
  PaymentResult,
  RefundResult,
  SubscriptionResult,
  PaymentStatusResult,
} from '../types'

// ─── Mock provider ────────────────────────────────────────────────────────────
// Always succeeds synchronously. Used in development and as the fallback when
// no real provider is configured. Never use in production.

export class MockProvider implements PaymentProvider {
  readonly name = 'mock' as const

  async createPayment(input: CreatePaymentInput): Promise<PaymentResult> {
    void input
    const ref = `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    return { success: true, status: 'completed', reference: ref, paymentId: ref }
  }

  async verifyPayment(reference: string): Promise<PaymentResult> {
    return { success: true, status: 'completed', reference, paymentId: reference }
  }

  async refundPayment(reference: string, _amount?: number): Promise<RefundResult> {
    return { success: true, reference: `mock_refund_${Date.now()}`, status: 'completed' }
  }

  async createSubscription(input: CreatePaymentInput): Promise<SubscriptionResult> {
    void input
    const ref = `mock_sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    return { success: true, status: 'completed', reference: ref, subscriptionId: ref }
  }

  async cancelSubscription(_subscriptionId: string): Promise<void> {
    // No-op
  }

  async getPaymentStatus(reference: string): Promise<PaymentStatusResult> {
    return { status: 'completed', reference }
  }
}
