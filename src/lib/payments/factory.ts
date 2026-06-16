// ─── Payment provider factory ─────────────────────────────────────────────────
//
// This is the ONLY import applications should use for payment operations.
// Never import provider classes directly from providers/*.
//
// Usage:
//   import { getPaymentProvider } from '@/lib/payments/factory'
//   const provider = await getPaymentProvider('mtn_momo')
//   const result   = await provider.createPayment({ ... })

export type {
  PaymentProvider,
  PaymentMethod,
  CreatePaymentInput,
  PaymentResult,
  RefundResult,
  SubscriptionResult,
  PaymentStatusResult,
  BankDetails,
  PaymentStatus,
} from './types'

export {
  CAMEROON_PAYMENT_ORDER,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHOD_DESCRIPTIONS,
  INTERNATIONAL_METHODS,
} from './types'

import type { PaymentMethod, PaymentProvider } from './types'

/**
 * Returns the PaymentProvider implementation for the given method.
 * Providers are loaded via dynamic import to keep SDK bundles out of the main chunk.
 */
export async function getPaymentProvider(
  method: PaymentMethod | 'mock' = 'mock',
): Promise<PaymentProvider> {
  switch (method) {
    case 'mtn_momo': {
      const { MtnMomoProvider } = await import('./providers/mtn-momo')
      return new MtnMomoProvider()
    }
    case 'orange_money': {
      const { OrangeMoneyProvider } = await import('./providers/orange-money')
      return new OrangeMoneyProvider()
    }
    case 'bank_transfer': {
      const { BankTransferProvider } = await import('./providers/bank-transfer')
      return new BankTransferProvider()
    }
    case 'stripe': {
      const { StripeProvider } = await import('./providers/stripe')
      return new StripeProvider()
    }
    case 'paypal': {
      const { PayPalProvider } = await import('./providers/paypal')
      return new PayPalProvider()
    }
    case 'mock':
    default: {
      const { MockProvider } = await import('./providers/mock')
      return new MockProvider()
    }
  }
}
