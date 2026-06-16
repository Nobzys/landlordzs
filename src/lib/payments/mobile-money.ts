// ─── Mobile Money payment provider (billing abstraction) ─────────────────────
// Wraps the existing MTN MoMo and Orange Money utilities for the billing flow.
//
// Design notes:
//  - charge() initiates a collection request; returns status:'pending'.
//    The user must approve the payment on their phone.
//  - verifyPayment() polls the provider status API. The caller (billing action
//    or a polling endpoint) should retry until status is 'completed'/'failed'.
//  - Refunds are manual for both providers (no standard B2C refund API).
//  - Credentials are read from env vars — no hardcoded values here.
//
// Required env vars (see src/lib/config/env.ts for full list):
//   MTN_MOMO_SUBSCRIPTION_KEY, MTN_MOMO_API_USER, MTN_MOMO_API_KEY
//   ORANGE_MONEY_CLIENT_ID, ORANGE_MONEY_CLIENT_SECRET, ORANGE_MONEY_MERCHANT_KEY

import { mtnRequestToPay, mtnGetPaymentStatus } from '@/lib/utils/mtn-momo'
import { orangeInitiatePayment, orangeGetPaymentStatus } from '@/lib/utils/orange-money'
import type {
  BillingPaymentProvider,
  PaymentRequest,
  PaymentResult,
  RefundResult,
  CheckoutSessionResult,
  CustomerResult,
} from './provider'

// Mobile-money-specific extra fields attached to PaymentRequest.metadata
export interface MobileMoneyMeta {
  phone:           string
  mobileProvider:  'mtn_momo' | 'orange_money'
  /** Pre-generated UUID for the MTN/Orange external transaction reference */
  externalRef?:    string
  /** Orange: return URL (unused for billing but required by API) */
  returnUrl?:      string
  /** Orange: cancel URL */
  cancelUrl?:      string
  /** Orange: notification URL (leave empty if using polling) */
  notifUrl?:       string
}

export class MobileMoneyPaymentProvider implements BillingPaymentProvider {
  readonly name = 'mobile_money'

  // ── Initiate payment on user's phone ────────────────────────────────────
  // Returns status:'pending'. Caller must poll verifyPayment() for completion.
  async charge(req: PaymentRequest): Promise<PaymentResult> {
    const meta = req.metadata as unknown as MobileMoneyMeta | undefined
    if (!meta?.phone || !meta?.mobileProvider) {
      return {
        success:   false,
        reference: '',
        status:    'failed',
        error:     'phone and mobileProvider are required for mobile money payments',
      }
    }

    try {
      if (meta.mobileProvider === 'mtn_momo') {
        const externalId = meta.externalRef ?? crypto.randomUUID()
        await mtnRequestToPay({
          referenceId:  externalId,
          amount:       req.amount,
          externalId,
          phone:        meta.phone,
          payerMessage: req.description,
          payeeNote:    req.description,
        })
        return { success: true, reference: externalId, status: 'pending' }
      }

      if (meta.mobileProvider === 'orange_money') {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
        const result = await orangeInitiatePayment({
          amount:      req.amount,
          currency:    req.currency,
          description: req.description,
          returnUrl:   meta.returnUrl  ?? `${appUrl}/account/billing`,
          cancelUrl:   meta.cancelUrl  ?? `${appUrl}/account/billing`,
          notifUrl:    meta.notifUrl   ?? '',
          orderId:     meta.externalRef ?? `billing_${Date.now()}`,
        })
        // For Orange the user may need to follow a payment URL
        return {
          success:    true,
          reference:  result.data?.pay_token ?? '',
          status:     'pending',
          paymentId:  result.data?.notif_token,
        }
      }

      return { success: false, reference: '', status: 'failed', error: 'Unknown mobile provider' }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Mobile money initiation failed'
      return { success: false, reference: '', status: 'failed', error: msg }
    }
  }

  // ── Poll provider for payment status ────────────────────────────────────
  async verifyPayment(
    providerReference: string,
    meta?: { mobileProvider: 'mtn_momo' | 'orange_money'; externalRef?: string },
  ): Promise<PaymentResult> {
    try {
      if (meta?.mobileProvider === 'mtn_momo' || !meta) {
        const status = await mtnGetPaymentStatus(providerReference)
        const done   = status.status === 'SUCCESSFUL'
        const failed = status.status === 'FAILED'
        const reason = typeof status.reason === 'string'
          ? status.reason
          : status.reason?.message ?? 'Payment declined'
        return {
          success:   done,
          reference: providerReference,
          status:    done ? 'completed' : failed ? 'failed' : 'pending',
          error:     failed ? reason : undefined,
        }
      }

      if (meta.mobileProvider === 'orange_money') {
        const orderId = meta.externalRef ?? providerReference
        const status  = await orangeGetPaymentStatus(orderId, providerReference)
        const done    = status.status === 'SUCCESS'
        const failed  = ['FAILED', 'CANCELLED'].includes(status.status ?? '')
        return {
          success:   done,
          reference: providerReference,
          status:    done ? 'completed' : failed ? 'failed' : 'pending',
          error:     failed ? 'Orange Money payment was not completed' : undefined,
        }
      }

      return { success: false, reference: providerReference, status: 'failed', error: 'Unknown mobile provider' }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Status check failed'
      return { success: false, reference: providerReference, status: 'pending', error: msg }
    }
  }

  // ── Mobile money refunds are manual ─────────────────────────────────────
  // Neither MTN nor Orange Money expose a B2C refund API.
  // Process refunds via the disbursement flow (manual transfer).
  async refund(_providerReference: string, _amount: number): Promise<RefundResult> {
    return {
      success:   false,
      reference: '',
      status:    'failed',
      error:     'Mobile money refunds must be processed manually via the payout flow.',
    }
  }

  // ── No customer concept for mobile money ────────────────────────────────
  async createCustomer(userId: string, _email: string): Promise<CustomerResult> {
    return { customerId: `momo_${userId}` }
  }

  // ── createCheckoutSession: not applicable (synchronous initiation) ───────
  // Mobile money does not use a redirect-based checkout flow.
  async createCheckoutSession(_req: PaymentRequest & {
    successUrl: string
    cancelUrl:  string
    planId:     string
    billingType: 'one_time' | 'monthly' | 'annual'
  }): Promise<CheckoutSessionResult> {
    throw new Error('Mobile money does not support checkout sessions. Use charge() instead.')
  }
}
