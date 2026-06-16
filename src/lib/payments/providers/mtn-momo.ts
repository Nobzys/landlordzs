import { mtnRequestToPay, mtnGetPaymentStatus } from '@/lib/utils/mtn-momo'
import { MTN_COLL_KEY } from '@/lib/config/env'
import type {
  PaymentProvider,
  CreatePaymentInput,
  PaymentResult,
  RefundResult,
  SubscriptionResult,
  PaymentStatusResult,
} from '../types'

// ─── MTN Mobile Money provider ────────────────────────────────────────────────
// Wraps the MTN MoMo Collections API.
// Flow: charge → pending → poll verifyPayment / getPaymentStatus until terminal.
// Refunds and recurring subscriptions are not supported via API — handled manually.
//
// Required env vars:
//   MTN_MOMO_SUBSCRIPTION_KEY  (= MTN_MOMO_API_KEY alias)
//   MTN_MOMO_API_USER
//   MTN_MOMO_API_KEY
//
// Fallback: if subscription key is not configured, returns a mock pending response
// so development flows can continue without real credentials.

function isConfigured(): boolean {
  return Boolean(MTN_COLL_KEY)
}

export class MtnMomoProvider implements PaymentProvider {
  readonly name = 'mtn_momo' as const

  async createPayment(input: CreatePaymentInput): Promise<PaymentResult> {
    if (!isConfigured()) {
      const ref = `mtn_mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      return { success: true, status: 'pending', reference: ref }
    }

    if (!input.phone) {
      return { success: false, status: 'failed', reference: '', error: 'Phone number is required for MTN MoMo.' }
    }

    const externalId = (input.metadata?.externalRef as string | undefined) ?? crypto.randomUUID()

    try {
      await mtnRequestToPay({
        referenceId:  externalId,
        amount:       input.amount,
        externalId,
        phone:        input.phone,
        payerMessage: input.description,
        payeeNote:    input.description,
      })
      return { success: true, status: 'pending', reference: externalId }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'MTN MoMo request failed'
      return { success: false, status: 'failed', reference: '', error: msg }
    }
  }

  async verifyPayment(
    reference: string,
    _meta?: Record<string, unknown>,
  ): Promise<PaymentResult> {
    if (!isConfigured()) {
      return { success: true, status: 'completed', reference }
    }

    try {
      const status = await mtnGetPaymentStatus(reference)
      const done   = status.status === 'SUCCESSFUL'
      const failed = status.status === 'FAILED'
      const reason = typeof status.reason === 'string'
        ? status.reason
        : status.reason?.message ?? 'Payment declined'
      return {
        success:   done,
        status:    done ? 'completed' : failed ? 'failed' : 'pending',
        reference,
        error:     failed ? reason : undefined,
      }
    } catch (err) {
      return {
        success:   false,
        status:    'pending',
        reference,
        error:     err instanceof Error ? err.message : 'Status check failed',
      }
    }
  }

  async refundPayment(_reference: string, _amount?: number): Promise<RefundResult> {
    return {
      success:   false,
      reference: '',
      status:    'failed',
      error:     'MTN MoMo refunds require a manual disbursement transfer. Contact support.',
    }
  }

  // MTN does not support native recurring billing — treat the same as a one-time payment.
  async createSubscription(input: CreatePaymentInput): Promise<SubscriptionResult> {
    const result = await this.createPayment(input)
    return {
      success:   result.success,
      status:    result.status,
      reference: result.reference,
      error:     result.error,
    }
  }

  async cancelSubscription(_subscriptionId: string): Promise<void> {
    // MTN has no subscription concept — no-op; billing system handles cancellation.
  }

  async getPaymentStatus(
    reference: string,
    _meta?: Record<string, unknown>,
  ): Promise<PaymentStatusResult> {
    if (!isConfigured()) {
      return { status: 'pending', reference }
    }

    try {
      const status = await mtnGetPaymentStatus(reference)
      const done   = status.status === 'SUCCESSFUL'
      const failed = status.status === 'FAILED'
      return {
        status:    done ? 'completed' : failed ? 'failed' : 'pending',
        reference,
      }
    } catch {
      return { status: 'pending', reference }
    }
  }
}
