import { orangeInitiatePayment, orangeGetPaymentStatus } from '@/lib/utils/orange-money'
import { OM_CLIENT_ID } from '@/lib/config/env'
import type {
  PaymentProvider,
  CreatePaymentInput,
  PaymentResult,
  RefundResult,
  SubscriptionResult,
  PaymentStatusResult,
} from '../types'

// ─── Orange Money provider ────────────────────────────────────────────────────
// Wraps the Orange Money WebPay CM API.
// Flow: createPayment → pending → user approves on phone →
//       poll getPaymentStatus until SUCCESS / FAILED.
// The provider_reference stored in the DB is the orderId (used for status checks).
// The pay_token is stored as paymentId for additional status lookups.
//
// Required env vars:
//   ORANGE_MONEY_CLIENT_ID
//   ORANGE_MONEY_CLIENT_SECRET
//   ORANGE_MONEY_MERCHANT_KEY
//   ORANGE_MONEY_RETURN_URL
//   ORANGE_MONEY_CANCEL_URL
//   ORANGE_MONEY_NOTIF_URL

function isConfigured(): boolean {
  return Boolean(OM_CLIENT_ID)
}

export class OrangeMoneyProvider implements PaymentProvider {
  readonly name = 'orange_money' as const

  async createPayment(input: CreatePaymentInput): Promise<PaymentResult> {
    if (!isConfigured()) {
      const ref = `om_mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      return { success: true, status: 'pending', reference: ref }
    }

    const orderId = (input.metadata?.externalRef as string | undefined) ?? `billing_${Date.now()}`
    const appUrl  = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    try {
      const result = await orangeInitiatePayment({
        orderId,
        amount:      input.amount,
        description: input.description,
        returnUrl:   input.successUrl ?? `${appUrl}/account/billing`,
        cancelUrl:   input.cancelUrl  ?? `${appUrl}/account/billing`,
        notifUrl:    (input.metadata?.notifUrl as string | undefined) ?? '',
      })
      return {
        success:   true,
        status:    'pending',
        reference: orderId,
        paymentId: result.data?.pay_token,
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Orange Money initiation failed'
      return { success: false, status: 'failed', reference: '', error: msg }
    }
  }

  async verifyPayment(
    reference: string,
    meta?: Record<string, unknown>,
  ): Promise<PaymentResult> {
    if (!isConfigured()) {
      return { success: true, status: 'completed', reference }
    }

    // reference = orderId; meta.payToken = pay_token stored at initiation
    const payToken = (meta?.payToken as string | undefined) ?? reference

    try {
      const status  = await orangeGetPaymentStatus(reference, payToken)
      const done    = status.status === 'SUCCESS'
      const failed  = ['FAILED', 'CANCELLED'].includes(status.status ?? '')
      return {
        success:   done,
        status:    done ? 'completed' : failed ? 'failed' : 'pending',
        reference,
        error:     failed ? 'Orange Money payment was not completed.' : undefined,
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
      error:     'Orange Money refunds require a manual disbursement transfer. Contact support.',
    }
  }

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
    // Orange has no subscription concept — no-op.
  }

  async getPaymentStatus(
    reference: string,
    meta?: Record<string, unknown>,
  ): Promise<PaymentStatusResult> {
    const result = await this.verifyPayment(reference, meta)
    return { status: result.status, reference }
  }
}
