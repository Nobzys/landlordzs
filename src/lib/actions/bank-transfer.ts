'use server'

import { revalidatePath } from 'next/cache'
import { createClient, getServerProfile } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPaymentProvider } from '@/lib/payments/factory'
import { getBillingStatus, getPlansForRole } from '@/lib/billing'
import { requiresActivationFee, canAccessAdmin } from '@/lib/roles'
import { insertNotification } from '@/lib/notifications'
import { logAuditEvent } from '@/lib/audit'
import type { ActionResult } from '@/types/auth'
import type { BillingPayment, SubscriptionPlan } from '@/types/billing'
import type { BankDetails } from '@/lib/payments/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function requireAuth() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { user: null, supabase }
  return { user, supabase }
}

// ─── initiateBankTransfer ─────────────────────────────────────────────────────
// Step 1 of the bank transfer flow.
// Returns bank account details the user must transfer to, plus a paymentId to
// track the payment while awaiting admin verification.

export async function initiateBankTransfer(input: {
  plan_id: string
}): Promise<ActionResult<{ paymentId: string; bankDetails: BankDetails }>> {
  const { user, supabase } = await requireAuth()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }

  if (!profile) return { error: 'Profile not found' }
  if (!requiresActivationFee(profile.role)) return { error: 'Your role does not require a subscription.' }

  const adminClient = createAdminClient()
  const { data: plan } = await (adminClient as any)
    .from('subscription_plans')
    .select('*')
    .eq('id', input.plan_id)
    .eq('role', profile.role)
    .eq('is_active', true)
    .single() as { data: SubscriptionPlan | null }

  if (!plan) return { error: 'Plan not found or not available for your role.' }

  // Check for existing active subscription
  const { data: existing } = await (supabase as any)
    .from('subscriptions')
    .select('id, status, expires_at')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle() as { data: { id: string; status: string; expires_at: string | null } | null }

  if (existing) {
    const notExpired = existing.expires_at === null || new Date(existing.expires_at) > new Date()
    if (notExpired) return { error: 'You already have an active subscription.' }
  }

  const provider = await getPaymentProvider('bank_transfer')
  const result   = await provider.createPayment({
    amount:      plan.amount,
    currency:    plan.currency,
    userId:      user.id,
    description: `${plan.name} — LANDLORDZS`,
    metadata:    { plan_id: plan.id, billing_type: plan.billing_type },
  })

  if (!result.success || !result.bankDetails) {
    return { error: 'Failed to initiate bank transfer.' }
  }

  // Record the pending payment — no subscription created yet
  const { data: paymentRow } = await (adminClient as any)
    .from('payments')
    .insert({
      user_id:            user.id,
      provider:           'bank_transfer',
      provider_reference: result.reference,
      amount:             plan.amount,
      currency:           plan.currency,
      status:             'pending_verification',
      metadata:           { plan_id: plan.id, billing_type: plan.billing_type },
    })
    .select('id')
    .single() as { data: { id: string } | null }

  if (!paymentRow) return { error: 'Failed to record payment.' }

  return { success: true, data: { paymentId: paymentRow.id, bankDetails: result.bankDetails } }
}

// ─── submitBankTransferReference ─────────────────────────────────────────────
// Step 2: user has made the transfer and submits the bank reference number.

export async function submitBankTransferReference(input: {
  paymentId: string
  reference: string
}): Promise<ActionResult> {
  const { user, supabase } = await requireAuth()
  if (!user) return { error: 'Unauthorized' }

  const ref = input.reference.trim()
  if (!ref) return { error: 'Please enter your bank transfer reference number.' }
  if (ref.length < 3) return { error: 'Reference must be at least 3 characters.' }

  const adminClient = createAdminClient()

  // Verify payment belongs to this user and is still pending
  const { data: payment } = await (adminClient as any)
    .from('payments')
    .select('id, status, user_id')
    .eq('id', input.paymentId)
    .eq('user_id', user.id)
    .eq('provider', 'bank_transfer')
    .maybeSingle() as { data: { id: string; status: string; user_id: string } | null }

  if (!payment) return { error: 'Payment not found.' }
  if (payment.status === 'completed') return { error: 'This payment is already completed.' }
  if (payment.status === 'failed') return { error: 'This payment was rejected. Please start a new one.' }

  await (adminClient as any)
    .from('payments')
    .update({
      bank_transfer_reference: ref,
      status:                  'pending_verification',
      updated_at:              new Date().toISOString(),
    })
    .eq('id', payment.id)

  // Notify admin of pending transfer (send to admin notification channel)
  // We insert a notification for all admins via a DB trigger on the admin dashboard.
  // As a direct action, we just revalidate the admin path.
  revalidatePath('/admin/billing')
  revalidatePath('/account/billing')
  return { success: true }
}

// ─── adminApproveBankTransfer ─────────────────────────────────────────────────
// Admin approves a bank transfer → activates subscription.

export async function adminApproveBankTransfer(paymentId: string): Promise<ActionResult> {
  const adminProfile = await getServerProfile()
  if (!adminProfile || !canAccessAdmin(adminProfile.role)) return { error: 'Insufficient permissions.' }

  const adminClient = createAdminClient()

  const { data: payment } = await (adminClient as any)
    .from('payments')
    .select('*, metadata')
    .eq('id', paymentId)
    .eq('provider', 'bank_transfer')
    .maybeSingle() as { data: BillingPayment | null }

  if (!payment) return { error: 'Payment not found.' }
  if (payment.status === 'completed') return { error: 'This payment is already approved.' }
  if (payment.status === 'failed') return { error: 'This payment was already rejected.' }
  if (!payment.bank_transfer_reference) return { error: 'No transfer reference submitted yet.' }

  const meta        = payment.metadata as Record<string, string>
  const planId      = meta.plan_id
  const billingType = meta.billing_type as 'one_time' | 'monthly' | 'annual'

  const { data: plan } = await (adminClient as any)
    .from('subscription_plans')
    .select('*')
    .eq('id', planId)
    .maybeSingle() as { data: SubscriptionPlan | null }

  if (!plan) return { error: 'Subscription plan not found.' }

  // Compute subscription expiry
  const startsAt = new Date()
  let expiresAt: Date | null = null
  if (billingType === 'monthly') {
    expiresAt = new Date(startsAt)
    expiresAt.setMonth(expiresAt.getMonth() + 1)
  } else if (billingType === 'annual') {
    expiresAt = new Date(startsAt)
    expiresAt.setFullYear(expiresAt.getFullYear() + 1)
  }

  // Cancel any existing active subscription first
  await (adminClient as any)
    .from('subscriptions')
    .update({ status: 'cancelled', auto_renew: false })
    .eq('user_id', payment.user_id)
    .eq('status', 'active')

  // Create subscription
  const { data: sub } = await (adminClient as any)
    .from('subscriptions')
    .insert({
      user_id:          payment.user_id,
      plan_id:          plan.id,
      status:           'active',
      starts_at:        startsAt.toISOString(),
      expires_at:       expiresAt?.toISOString() ?? null,
      auto_renew:       billingType !== 'one_time',
      payment_provider: 'bank_transfer',
    })
    .select('id')
    .single() as { data: { id: string } | null }

  if (!sub) return { error: 'Failed to create subscription.' }

  // Create invoice (paid)
  const { data: invoice } = await (adminClient as any)
    .from('invoices')
    .insert({
      user_id:          payment.user_id,
      subscription_id:  sub.id,
      amount:           plan.amount,
      currency:         plan.currency,
      status:           'paid',
      payment_provider: 'bank_transfer',
      issued_at:        startsAt.toISOString(),
      paid_at:          startsAt.toISOString(),
    })
    .select('id')
    .single() as { data: { id: string } | null }

  // Mark payment completed
  await (adminClient as any)
    .from('payments')
    .update({
      status:                      'completed',
      invoice_id:                  invoice?.id ?? null,
      bank_transfer_approved_by:   adminProfile.id,
      bank_transfer_approved_at:   new Date().toISOString(),
      updated_at:                  new Date().toISOString(),
    })
    .eq('id', paymentId)

  // Notify user
  await insertNotification(
    adminClient,
    payment.user_id,
    'subscription',
    'Payment verified',
    'Your bank transfer has been verified. Your account is now active.',
    '/account/billing',
    { entityType: 'subscription', entityId: sub.id },
  )

  await logAuditEvent({
    adminId:    adminProfile.id,
    actionType: 'bank_transfer_approved',
    entityType: 'payment',
    entityId:   paymentId,
    newValues:  { subscription_id: sub.id },
  })

  revalidatePath('/admin/billing')
  revalidatePath('/account/billing')
  return { success: true }
}

// ─── adminRejectBankTransfer ──────────────────────────────────────────────────
// Admin rejects a bank transfer — notifies user with reason.

export async function adminRejectBankTransfer(
  paymentId: string,
  reason:    string,
): Promise<ActionResult> {
  const adminProfile = await getServerProfile()
  if (!adminProfile || !canAccessAdmin(adminProfile.role)) return { error: 'Insufficient permissions.' }

  const adminClient = createAdminClient()

  const { data: payment } = await (adminClient as any)
    .from('payments')
    .select('id, user_id, status, bank_transfer_reference, provider')
    .eq('id', paymentId)
    .eq('provider', 'bank_transfer')
    .maybeSingle() as { data: Pick<BillingPayment, 'id' | 'user_id' | 'status' | 'bank_transfer_reference' | 'provider'> | null }

  if (!payment) return { error: 'Payment not found.' }
  if (payment.status === 'completed') return { error: 'This payment was already approved.' }

  await (adminClient as any)
    .from('payments')
    .update({
      status:                          'failed',
      bank_transfer_approved_by:       adminProfile.id,
      bank_transfer_approved_at:       new Date().toISOString(),
      bank_transfer_rejection_reason:  reason.trim() || 'Transfer could not be verified.',
      updated_at:                      new Date().toISOString(),
    })
    .eq('id', paymentId)

  await insertNotification(
    adminClient,
    payment.user_id,
    'billing',
    'Bank transfer not verified',
    reason.trim()
      ? `Your bank transfer could not be verified: ${reason.trim()}. Please contact support or try a different payment method.`
      : 'Your bank transfer could not be verified. Please contact support or try a different payment method.',
    '/account/billing',
  )

  await logAuditEvent({
    adminId:    adminProfile.id,
    actionType: 'bank_transfer_rejected',
    entityType: 'payment',
    entityId:   paymentId,
    newValues:  { reason },
  })

  revalidatePath('/admin/billing')
  revalidatePath('/account/billing')
  return { success: true }
}

// ─── getBankTransferDetails ───────────────────────────────────────────────────
// Returns the configured bank account details for display in the UI.
// No auth required — these are public account details.

export async function getBankTransferDetails(): Promise<ActionResult<BankDetails>> {
  const provider = await getPaymentProvider('bank_transfer')
  const result   = await provider.getPaymentStatus('') // returns bankDetails via verifyPayment stub
  // Directly construct from env
  const details: BankDetails = {
    accountName:   process.env.BANK_TRANSFER_ACCOUNT_NAME   ?? 'LANDLORDZS SARL',
    accountNumber: process.env.BANK_TRANSFER_ACCOUNT_NUMBER ?? 'XX0000000000',
    bankName:      process.env.BANK_TRANSFER_BANK_NAME      ?? 'Afriland First Bank',
    swiftCode:     process.env.BANK_TRANSFER_SWIFT_CODE,
    instructions:
      'Transfer the exact amount shown. Include your full name and email in the payment reference. ' +
      'Your account will be activated within 1–2 business days after verification.',
  }
  void result
  return { success: true, data: details }
}
