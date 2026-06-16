import type {
  PaymentProvider,
  CreatePaymentInput,
  PaymentResult,
  RefundResult,
  SubscriptionResult,
  PaymentStatusResult,
  BankDetails,
} from '../types'

// ─── Bank Transfer provider ───────────────────────────────────────────────────
// Manual payment flow:
//  1. createPayment() returns bank account details + status: pending_verification
//  2. User makes the transfer offline and submits the reference number in the UI
//  3. An admin reviews and approves or rejects via /admin/billing?tab=bank_transfers
//  4. On approval: adminApproveBankTransfer() activates the subscription
//
// Required env vars:
//   BANK_TRANSFER_ACCOUNT_NAME
//   BANK_TRANSFER_ACCOUNT_NUMBER
//   BANK_TRANSFER_BANK_NAME
//   BANK_TRANSFER_SWIFT_CODE  (optional)

function getBankDetails(): BankDetails {
  return {
    accountName:   process.env.BANK_TRANSFER_ACCOUNT_NAME   ?? 'LANDLORDZS SARL',
    accountNumber: process.env.BANK_TRANSFER_ACCOUNT_NUMBER ?? 'XX0000000000',
    bankName:      process.env.BANK_TRANSFER_BANK_NAME      ?? 'Afriland First Bank',
    swiftCode:     process.env.BANK_TRANSFER_SWIFT_CODE,
    instructions:
      'Transfer the exact amount shown. Include your full name and email in the payment reference. ' +
      'Your account will be activated within 1–2 business days after verification.',
  }
}

export class BankTransferProvider implements PaymentProvider {
  readonly name = 'bank_transfer' as const

  async createPayment(input: CreatePaymentInput): Promise<PaymentResult> {
    void input
    const ref = `bt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    return {
      success:     true,
      status:      'pending_verification',
      reference:   ref,
      bankDetails: getBankDetails(),
    }
  }

  // Bank transfer verification is manual (admin approval).
  // This method returns the stored status; the billing action layer owns DB reads.
  async verifyPayment(reference: string, _meta?: Record<string, unknown>): Promise<PaymentResult> {
    return {
      success:     true,
      status:      'pending_verification',
      reference,
      bankDetails: getBankDetails(),
    }
  }

  // Bank transfer refunds must be processed manually via a bank transfer back to the user.
  async refundPayment(_reference: string, _amount?: number): Promise<RefundResult> {
    return {
      success:   false,
      reference: '',
      status:    'failed',
      error:     'Bank transfer refunds must be processed manually. Contact support to initiate a refund.',
    }
  }

  // Bank transfer has no native recurring billing.
  async createSubscription(input: CreatePaymentInput): Promise<SubscriptionResult> {
    const result = await this.createPayment(input)
    return {
      success:     result.success,
      status:      result.status,
      reference:   result.reference,
      bankDetails: result.bankDetails,
      error:       result.error,
    }
  }

  async cancelSubscription(_subscriptionId: string): Promise<void> {
    // No-op — bank transfers have no subscription record at the provider.
  }

  async getPaymentStatus(reference: string, _meta?: Record<string, unknown>): Promise<PaymentStatusResult> {
    return { status: 'pending_verification', reference }
  }
}
