'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient, getServerProfile } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { subscribePlanSchema, adminGrantSchema, toggleAutoRenewSchema } from '@/lib/validations/billing'
import { getPaymentProvider } from '@/lib/payments/provider'
import { getBillingStatus, getPlansForRole } from '@/lib/billing'
import { requiresActivationFee, canAccessAdmin } from '@/lib/roles'
import { insertNotification } from '@/lib/notifications'
import { logAuditEvent } from '@/lib/audit'
import { APP_URL } from '@/lib/config/env'
import type { ActionResult } from '@/types/auth'
import type { UserBillingStatus, Subscription, Invoice, BillingPayment, SubscriptionPlan } from '@/types/billing'

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function requireAuth() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { user: null, supabase }
  return { user, supabase }
}

// ─── getMyBilling ─────────────────────────────────────────────────────────────
// Returns the current user's billing status, plans, invoices, and payments.

export async function getMyBilling(): Promise<ActionResult<{
  status:       UserBillingStatus
  plans:        SubscriptionPlan[]
  invoices:     Invoice[]
  payments:     BillingPayment[]
}>> {
  const { user, supabase } = await requireAuth()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }

  if (!profile) return { error: 'Profile not found' }

  const [status, plans, invoicesRes, paymentsRes] = await Promise.all([
    getBillingStatus(user.id, profile.role, supabase),
    getPlansForRole(profile.role, supabase),
    (supabase as any)
      .from('invoices')
      .select('*')
      .eq('user_id', user.id)
      .order('issued_at', { ascending: false })
      .limit(20) as Promise<{ data: Invoice[] | null }>,
    (supabase as any)
      .from('payments')
      .select('*, invoice:invoices(id,amount,status,issued_at)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20) as Promise<{ data: BillingPayment[] | null }>,
  ])

  return {
    success: true,
    data: {
      status,
      plans,
      invoices: invoicesRes.data ?? [],
      payments: paymentsRes.data ?? [],
    },
  }
}

// ─── subscribeToPlan ──────────────────────────────────────────────────────────
// Pays for a plan (activation fee OR monthly/annual subscription).
// Uses the mock provider. Real gateway integration replaces `getPaymentProvider`.

export async function subscribeToPlan(
  input: unknown,
): Promise<ActionResult<{ subscriptionId: string }>> {
  const parsed = subscribePlanSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { user, supabase } = await requireAuth()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('role, account_status')
    .eq('id', user.id)
    .single() as { data: { role: string; account_status: string } | null }

  if (!profile) return { error: 'Profile not found' }
  if (!requiresActivationFee(profile.role)) return { error: 'Your role does not require a subscription.' }

  // Verify the plan belongs to this role
  const adminClient = createAdminClient()
  const { data: plan } = await (adminClient as any)
    .from('subscription_plans')
    .select('*')
    .eq('id', parsed.data.plan_id)
    .eq('role', profile.role)
    .eq('is_active', true)
    .single() as { data: SubscriptionPlan | null }

  if (!plan) return { error: 'Plan not found or not available for your role.' }

  // Prevent double-subscribing to an already-active plan of the same billing_type
  const { data: existing } = await (supabase as any)
    .from('subscriptions')
    .select('id, status, expires_at')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle() as { data: Subscription | null }

  if (existing) {
    const notExpired =
      existing.expires_at === null || new Date(existing.expires_at) > new Date()
    if (notExpired) return { error: 'You already have an active subscription.' }
  }

  // Charge via payment provider
  const provider = await getPaymentProvider(parsed.data.provider as 'mock')
  const result = await provider.charge({
    amount:      plan.amount,
    currency:    plan.currency,
    userId:      user.id,
    description: `${plan.name} — LANDLORDZS`,
  })

  if (!result.success) return { error: result.error ?? 'Payment failed. Please try again.' }

  // Compute expiry based on billing type
  const startsAt = new Date()
  let expiresAt: Date | null = null
  if (plan.billing_type === 'monthly') {
    expiresAt = new Date(startsAt)
    expiresAt.setMonth(expiresAt.getMonth() + 1)
  } else if (plan.billing_type === 'annual') {
    expiresAt = new Date(startsAt)
    expiresAt.setFullYear(expiresAt.getFullYear() + 1)
  }
  // one_time: no expiry (null)

  // Create subscription
  const { data: sub, error: subError } = await (adminClient as any)
    .from('subscriptions')
    .insert({
      user_id:    user.id,
      plan_id:    plan.id,
      status:     'active',
      starts_at:  startsAt.toISOString(),
      expires_at: expiresAt?.toISOString() ?? null,
      auto_renew: plan.billing_type !== 'one_time',
    })
    .select('id')
    .single() as { data: { id: string } | null; error: unknown }

  if (subError || !sub) return { error: 'Failed to create subscription.' }

  // Create invoice
  const { data: invoice } = await (adminClient as any)
    .from('invoices')
    .insert({
      user_id:         user.id,
      subscription_id: sub.id,
      amount:          plan.amount,
      currency:        plan.currency,
      status:          'paid',
      issued_at:       startsAt.toISOString(),
      paid_at:         startsAt.toISOString(),
    })
    .select('id')
    .single() as { data: { id: string } | null }

  // Record payment
  await (adminClient as any).from('payments').insert({
    user_id:            user.id,
    invoice_id:         invoice?.id ?? null,
    provider:           result.reference.startsWith('mock_') ? 'mock' : parsed.data.provider,
    provider_reference: result.reference,
    amount:             plan.amount,
    currency:           plan.currency,
    status:             'completed',
    metadata:           { plan_id: plan.id, billing_type: plan.billing_type },
  })

  // Notify user: payment confirmed + subscription active
  const billingLabel = plan.billing_type === 'one_time'
    ? 'activation fee'
    : plan.billing_type === 'monthly' ? 'monthly plan' : 'annual plan'
  await insertNotification(
    adminClient,
    user.id,
    'subscription',
    'Payment confirmed',
    `Your ${billingLabel} payment was successful. Your account is now active.`,
    '/account/billing',
    { entityType: 'subscription', entityId: sub.id },
  )

  revalidatePath('/account/billing')
  return { success: true, data: { subscriptionId: sub.id } }
}

// ─── cancelSubscription ───────────────────────────────────────────────────────

export async function cancelSubscription(subscriptionId: string): Promise<ActionResult> {
  const { user, supabase } = await requireAuth()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await (supabase as any)
    .from('subscriptions')
    .update({ status: 'cancelled', auto_renew: false })
    .eq('id', subscriptionId)
    .eq('user_id', user.id)
    .in('status', ['active', 'past_due', 'pending'])

  if (error) return { error: error.message }

  revalidatePath('/account/billing')
  return { success: true }
}

// ─── toggleAutoRenew ──────────────────────────────────────────────────────────

export async function toggleAutoRenew(input: unknown): Promise<ActionResult> {
  const parsed = toggleAutoRenewSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { user, supabase } = await requireAuth()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await (supabase as any)
    .from('subscriptions')
    .update({ auto_renew: parsed.data.auto_renew })
    .eq('id', parsed.data.subscription_id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/account/billing')
  return { success: true }
}

// ─── adminGrantActivation ─────────────────────────────────────────────────────
// Admin grants manual activation (no payment required). Creates a subscription
// with status='active' and no plan attached.

export async function adminGrantActivation(input: unknown): Promise<ActionResult> {
  const parsed = adminGrantSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const profile = await getServerProfile()
  if (!profile || !canAccessAdmin(profile.role)) return { error: 'Insufficient permissions.' }

  const adminClient = createAdminClient()

  // Cancel any existing active subscription for this user first
  await (adminClient as any)
    .from('subscriptions')
    .update({ status: 'cancelled' })
    .eq('user_id', parsed.data.user_id)
    .eq('status', 'active')

  const { error } = await (adminClient as any)
    .from('subscriptions')
    .insert({
      user_id:    parsed.data.user_id,
      plan_id:    null,
      status:     'active',
      starts_at:  new Date().toISOString(),
      expires_at: parsed.data.expires_at ?? null,
      auto_renew: false,
    })

  if (error) return { error: error.message }

  // Notify user: manual activation granted
  await insertNotification(
    adminClient,
    parsed.data.user_id,
    'subscription',
    'Account activated',
    'An administrator has manually activated your account.',
    '/account/billing',
  )

  revalidatePath('/admin/billing')
  revalidatePath('/account/billing')
  return { success: true }
}

// ─── adminSuspendSubscription ─────────────────────────────────────────────────

export async function adminSuspendSubscription(subscriptionId: string): Promise<ActionResult> {
  const profile = await getServerProfile()
  if (!profile || !canAccessAdmin(profile.role)) return { error: 'Insufficient permissions.' }

  const adminClient = createAdminClient()
  const { error } = await (adminClient as any)
    .from('subscriptions')
    .update({ status: 'cancelled', auto_renew: false })
    .eq('id', subscriptionId)

  if (error) return { error: error.message }

  revalidatePath('/admin/billing')
  return { success: true }
}

// ─── adminGetSubscriptions ────────────────────────────────────────────────────

export async function adminGetSubscriptions(filters?: {
  status?: string
  role?:   string
}): Promise<ActionResult<Subscription[]>> {
  const profile = await getServerProfile()
  if (!profile || !canAccessAdmin(profile.role)) return { error: 'Insufficient permissions.' }

  const adminClient = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (adminClient as any)
    .from('subscriptions')
    .select('*, plan:subscription_plans(*)')
    .order('created_at', { ascending: false })
    .limit(100)

  if (filters?.status) query = query.eq('status', filters.status)

  const { data, error } = await query as { data: Subscription[] | null; error: unknown }
  if (error) return { error: 'Failed to fetch subscriptions.' }

  return { success: true, data: data ?? [] }
}

// ─── createStripeCheckoutSession ──────────────────────────────────────────────
// Creates a Stripe Checkout session and redirects the user to Stripe.
// On success: Stripe redirects to /account/billing/stripe-return?session_id=xxx
// On cancel:  Stripe redirects to /account/billing

export async function createStripeCheckoutSession(input: {
  plan_id: string
}): Promise<ActionResult<{ url: string }>> {
  const { user, supabase } = await requireAuth()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('role, email, full_name')
    .eq('id', user.id)
    .single() as { data: { role: string; email: string; full_name: string | null } | null }

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

  // Retrieve existing Stripe customer ID if any
  const { data: existingPayment } = await (adminClient as any)
    .from('payments')
    .select('external_customer_id')
    .eq('user_id', user.id)
    .eq('provider', 'stripe')
    .not('external_customer_id', 'is', null)
    .limit(1)
    .maybeSingle() as { data: { external_customer_id: string } | null }

  let customerId = existingPayment?.external_customer_id

  // Create Stripe customer if first-time
  if (!customerId) {
    const provider = await getPaymentProvider('stripe')
    const customer = await provider.createCustomer!(
      user.id,
      profile.email ?? user.email ?? '',
      profile.full_name ?? undefined,
    )
    customerId = customer.customerId
  }

  const provider    = await getPaymentProvider('stripe')
  const appUrl      = APP_URL || 'http://localhost:3000'
  const successUrl  = `${appUrl}/account/billing/stripe-return`
  const cancelUrl   = `${appUrl}/account/billing`

  const session = await provider.createCheckoutSession!({
    amount:      plan.amount,
    currency:    plan.currency,
    userId:      user.id,
    description: `${plan.name} — LANDLORDZS`,
    planId:      plan.id,
    billingType: plan.billing_type,
    customerId,
    successUrl,
    cancelUrl,
    metadata:    { plan_id: plan.id, user_id: user.id, billing_type: plan.billing_type },
  })

  // Record pending payment
  await (adminClient as any).from('payments').insert({
    user_id:              user.id,
    provider:             'stripe',
    provider_reference:   null,
    amount:               plan.amount,
    currency:             plan.currency,
    status:               'pending',
    external_customer_id: customerId,
    checkout_session_id:  session.sessionId,
    metadata:             { plan_id: plan.id, billing_type: plan.billing_type },
  })

  return { success: true, data: { url: session.url } }
}

// ─── confirmStripeSession ─────────────────────────────────────────────────────
// Called from the Stripe return page after the user returns from Stripe.
// Verifies payment and activates the subscription if not already done by webhook.

export async function confirmStripeSession(sessionId: string): Promise<ActionResult<{ subscriptionId?: string }>> {
  const { user } = await requireAuth()
  if (!user) return { error: 'Unauthorized' }

  const adminClient = createAdminClient()

  // Find the pending payment for this session
  const { data: payment } = await (adminClient as any)
    .from('payments')
    .select('*, invoice:invoices(id)')
    .eq('checkout_session_id', sessionId)
    .eq('user_id', user.id)
    .maybeSingle() as { data: (BillingPayment & { checkout_session_id?: string }) | null }

  if (!payment) return { error: 'Payment session not found.' }

  // Already processed (possibly by webhook)
  if (payment.status === 'completed') {
    return { success: true, data: {} }
  }

  // Verify with Stripe
  const provider = await getPaymentProvider('stripe')
  const result   = await provider.verifyPayment!(sessionId)

  if (!result.success) {
    return { error: 'Payment was not completed. Please try again.' }
  }

  const planId      = (payment.metadata as Record<string, string>)?.plan_id
  const billingType = (payment.metadata as Record<string, string>)?.billing_type as 'one_time' | 'monthly' | 'annual'

  const { data: plan } = await (adminClient as any)
    .from('subscription_plans')
    .select('*')
    .eq('id', planId)
    .maybeSingle() as { data: SubscriptionPlan | null }

  if (!plan) return { error: 'Plan not found.' }

  // Create subscription + invoice (idempotent via existing-check)
  const { data: existingSub } = await (adminClient as any)
    .from('subscriptions')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle() as { data: { id: string } | null }

  let subscriptionId = existingSub?.id

  if (!subscriptionId) {
    const startsAt  = new Date()
    let expiresAt: Date | null = null
    if (billingType === 'monthly') {
      expiresAt = new Date(startsAt)
      expiresAt.setMonth(expiresAt.getMonth() + 1)
    } else if (billingType === 'annual') {
      expiresAt = new Date(startsAt)
      expiresAt.setFullYear(expiresAt.getFullYear() + 1)
    }

    const { data: sub } = await (adminClient as any)
      .from('subscriptions')
      .insert({
        user_id:    user.id,
        plan_id:    plan.id,
        status:     'active',
        starts_at:  startsAt.toISOString(),
        expires_at: expiresAt?.toISOString() ?? null,
        auto_renew: billingType !== 'one_time',
      })
      .select('id')
      .single() as { data: { id: string } | null }

    subscriptionId = sub?.id

    const { data: invoice } = await (adminClient as any)
      .from('invoices')
      .insert({
        user_id:         user.id,
        subscription_id: subscriptionId,
        amount:          plan.amount,
        currency:        plan.currency,
        status:          'paid',
        issued_at:       new Date().toISOString(),
        paid_at:         new Date().toISOString(),
      })
      .select('id')
      .single() as { data: { id: string } | null }

    await (adminClient as any)
      .from('payments')
      .update({
        status:               'completed',
        provider_reference:   result.paymentId ?? result.reference,
        external_payment_id:  result.paymentId,
        invoice_id:           invoice?.id ?? null,
        updated_at:           new Date().toISOString(),
      })
      .eq('checkout_session_id', sessionId)

    await insertNotification(
      adminClient,
      user.id,
      'subscription',
      'Payment confirmed (Stripe)',
      `Your payment was successful. Your account is now active.`,
      '/account/billing',
      { entityType: 'subscription', entityId: subscriptionId },
    )
  }

  revalidatePath('/account/billing')
  return { success: true, data: { subscriptionId } }
}

// ─── createPayPalOrder ────────────────────────────────────────────────────────
// Creates a PayPal order and returns the approval URL.
// On success: PayPal redirects to /account/billing/paypal-return?token=xxx

export async function createPayPalOrder(input: {
  plan_id: string
}): Promise<ActionResult<{ url: string; orderId: string }>> {
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

  const provider   = await getPaymentProvider('paypal')
  const appUrl     = APP_URL || 'http://localhost:3000'
  const successUrl = `${appUrl}/account/billing/paypal-return`
  const cancelUrl  = `${appUrl}/account/billing`

  const session = await provider.createCheckoutSession!({
    amount:      plan.amount,
    currency:    plan.currency,
    userId:      user.id,
    description: `${plan.name} — LANDLORDZS`,
    planId:      plan.id,
    billingType: plan.billing_type,
    successUrl,
    cancelUrl,
    metadata:    { plan_id: plan.id, user_id: user.id, billing_type: plan.billing_type },
  })

  // Record pending payment
  await (adminClient as any).from('payments').insert({
    user_id:             user.id,
    provider:            'paypal',
    provider_reference:  null,
    amount:              plan.amount,
    currency:            plan.currency,
    status:              'pending',
    checkout_session_id: session.sessionId,
    metadata:            { plan_id: plan.id, billing_type: plan.billing_type },
  })

  return { success: true, data: { url: session.url, orderId: session.sessionId } }
}

// ─── confirmPayPalOrder ───────────────────────────────────────────────────────
// Called from the PayPal return page after the user returns from PayPal.
// Captures the order and activates the subscription.

export async function confirmPayPalOrder(
  orderId: string,
): Promise<ActionResult<{ subscriptionId?: string }>> {
  const { user } = await requireAuth()
  if (!user) return { error: 'Unauthorized' }

  const adminClient = createAdminClient()

  const { data: payment } = await (adminClient as any)
    .from('payments')
    .select('*')
    .eq('checkout_session_id', orderId)
    .eq('user_id', user.id)
    .maybeSingle() as { data: BillingPayment | null }

  if (!payment) return { error: 'Order not found.' }
  if (payment.status === 'completed') return { success: true, data: {} }

  const provider = await getPaymentProvider('paypal')
  const result   = await provider.verifyPayment!(orderId)

  if (!result.success) {
    await (adminClient as any)
      .from('payments')
      .update({ status: 'failed' })
      .eq('checkout_session_id', orderId)
    return { error: 'PayPal payment was not completed.' }
  }

  const planId      = (payment.metadata as Record<string, string>)?.plan_id
  const billingType = (payment.metadata as Record<string, string>)?.billing_type as 'one_time' | 'monthly' | 'annual'

  const { data: plan } = await (adminClient as any)
    .from('subscription_plans')
    .select('*')
    .eq('id', planId)
    .maybeSingle() as { data: SubscriptionPlan | null }

  if (!plan) return { error: 'Plan not found.' }

  const startsAt  = new Date()
  let expiresAt: Date | null = null
  if (billingType === 'monthly') {
    expiresAt = new Date(startsAt)
    expiresAt.setMonth(expiresAt.getMonth() + 1)
  } else if (billingType === 'annual') {
    expiresAt = new Date(startsAt)
    expiresAt.setFullYear(expiresAt.getFullYear() + 1)
  }

  const { data: sub } = await (adminClient as any)
    .from('subscriptions')
    .insert({
      user_id:    user.id,
      plan_id:    plan.id,
      status:     'active',
      starts_at:  startsAt.toISOString(),
      expires_at: expiresAt?.toISOString() ?? null,
      auto_renew: billingType !== 'one_time',
    })
    .select('id')
    .single() as { data: { id: string } | null }

  const { data: invoice } = await (adminClient as any)
    .from('invoices')
    .insert({
      user_id:         user.id,
      subscription_id: sub?.id,
      amount:          plan.amount,
      currency:        plan.currency,
      status:          'paid',
      issued_at:       new Date().toISOString(),
      paid_at:         new Date().toISOString(),
    })
    .select('id')
    .single() as { data: { id: string } | null }

  await (adminClient as any)
    .from('payments')
    .update({
      status:              'completed',
      provider_reference:  result.paymentId ?? result.reference,
      external_payment_id: result.paymentId,
      invoice_id:          invoice?.id ?? null,
    })
    .eq('checkout_session_id', orderId)

  await insertNotification(
    adminClient,
    user.id,
    'subscription',
    'Payment confirmed (PayPal)',
    `Your PayPal payment was successful. Your account is now active.`,
    '/account/billing',
    { entityType: 'subscription', entityId: sub?.id },
  )

  revalidatePath('/account/billing')
  return { success: true, data: { subscriptionId: sub?.id } }
}

// ─── initiateMobileMoneySubscription ─────────────────────────────────────────
// Initiates a mobile money collection for a billing plan.
// Returns a payment ID to poll for completion.

export async function initiateMobileMoneySubscription(input: {
  plan_id:         string
  mobile_provider: 'mtn_momo' | 'orange_money'
  phone:           string
}): Promise<ActionResult<{ paymentId: string }>> {
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

  const externalRef = crypto.randomUUID()
  const provider    = await getPaymentProvider('mobile_money')
  const result      = await provider.charge({
    amount:      plan.amount,
    currency:    plan.currency,
    userId:      user.id,
    description: `${plan.name} — LANDLORDZS`,
    metadata: {
      phone:          input.phone,
      mobileProvider: input.mobile_provider,
      externalRef,
    },
  })

  if (!result.success && result.status === 'failed') {
    return { error: result.error ?? 'Failed to initiate mobile money payment.' }
  }

  const { data: paymentRow } = await (adminClient as any)
    .from('payments')
    .insert({
      user_id:            user.id,
      provider:           input.mobile_provider,
      provider_reference: result.reference,
      amount:             plan.amount,
      currency:           plan.currency,
      status:             'pending',
      metadata: {
        plan_id:         plan.id,
        billing_type:    plan.billing_type,
        mobile_provider: input.mobile_provider,
        phone:           input.phone,
        external_ref:    externalRef,
      },
    })
    .select('id')
    .single() as { data: { id: string } | null }

  if (!paymentRow) return { error: 'Failed to record payment.' }

  return { success: true, data: { paymentId: paymentRow.id } }
}

// ─── pollMobileMoneyStatus ────────────────────────────────────────────────────
// Called by the client to poll for mobile money payment completion.
// Activates subscription on first successful poll.

export async function pollMobileMoneyStatus(
  paymentId: string,
): Promise<ActionResult<{ status: 'pending' | 'completed' | 'failed'; subscriptionId?: string }>> {
  const { user } = await requireAuth()
  if (!user) return { error: 'Unauthorized' }

  const adminClient = createAdminClient()

  const { data: payment } = await (adminClient as any)
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .eq('user_id', user.id)
    .maybeSingle() as { data: BillingPayment | null }

  if (!payment) return { error: 'Payment not found.' }
  if (payment.status === 'completed') return { success: true, data: { status: 'completed' } }
  if (payment.status === 'failed') return { success: true, data: { status: 'failed' } }

  const meta          = payment.metadata as Record<string, string>
  const mobileProvider = meta.mobile_provider as 'mtn_momo' | 'orange_money'
  const providerRef   = payment.provider_reference

  if (!providerRef) return { success: true, data: { status: 'pending' } }

  const provider = await getPaymentProvider('mobile_money')
  const result   = await (provider as any).verifyPayment(providerRef, {
    mobileProvider,
    externalRef: meta.external_ref,
  })

  if (result.status === 'pending') {
    return { success: true, data: { status: 'pending' } }
  }

  if (result.status === 'failed') {
    await (adminClient as any)
      .from('payments')
      .update({ status: 'failed' })
      .eq('id', paymentId)
    return { success: true, data: { status: 'failed' } }
  }

  // Payment completed — activate subscription
  const planId      = meta.plan_id
  const billingType = meta.billing_type as 'one_time' | 'monthly' | 'annual'

  const { data: plan } = await (adminClient as any)
    .from('subscription_plans')
    .select('*')
    .eq('id', planId)
    .maybeSingle() as { data: SubscriptionPlan | null }

  if (!plan) return { error: 'Plan not found.' }

  const startsAt  = new Date()
  let expiresAt: Date | null = null
  if (billingType === 'monthly') {
    expiresAt = new Date(startsAt)
    expiresAt.setMonth(expiresAt.getMonth() + 1)
  } else if (billingType === 'annual') {
    expiresAt = new Date(startsAt)
    expiresAt.setFullYear(expiresAt.getFullYear() + 1)
  }

  const { data: sub } = await (adminClient as any)
    .from('subscriptions')
    .insert({
      user_id:    user.id,
      plan_id:    plan.id,
      status:     'active',
      starts_at:  startsAt.toISOString(),
      expires_at: expiresAt?.toISOString() ?? null,
      auto_renew: false,
    })
    .select('id')
    .single() as { data: { id: string } | null }

  const { data: invoice } = await (adminClient as any)
    .from('invoices')
    .insert({
      user_id:         user.id,
      subscription_id: sub?.id,
      amount:          plan.amount,
      currency:        plan.currency,
      status:          'paid',
      issued_at:       new Date().toISOString(),
      paid_at:         new Date().toISOString(),
    })
    .select('id')
    .single() as { data: { id: string } | null }

  await (adminClient as any)
    .from('payments')
    .update({
      status:     'completed',
      invoice_id: invoice?.id ?? null,
    })
    .eq('id', paymentId)

  await insertNotification(
    adminClient,
    user.id,
    'subscription',
    'Payment confirmed (Mobile Money)',
    `Your mobile money payment was successful. Your account is now active.`,
    '/account/billing',
    { entityType: 'subscription', entityId: sub?.id },
  )

  revalidatePath('/account/billing')
  return { success: true, data: { status: 'completed', subscriptionId: sub?.id } }
}

// ─── adminRefundPayment ───────────────────────────────────────────────────────

export async function adminRefundPayment(
  paymentId: string,
  amount?:   number,
): Promise<ActionResult> {
  const adminProfile = await getServerProfile()
  if (!adminProfile || !canAccessAdmin(adminProfile.role)) return { error: 'Insufficient permissions.' }

  const adminClient = createAdminClient()
  const { data: payment } = await (adminClient as any)
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .maybeSingle() as { data: BillingPayment | null }

  if (!payment) return { error: 'Payment not found.' }
  if (payment.status !== 'completed') return { error: 'Only completed payments can be refunded.' }

  const providerRef = payment.provider_reference
  if (!providerRef) return { error: 'No provider reference on this payment.' }

  const refundAmount = amount ?? payment.amount
  let refundResult: { success: boolean; reference: string; error?: string }

  try {
    const provider = await getPaymentProvider(payment.provider as 'stripe' | 'paypal' | 'mock')
    refundResult   = await provider.refund(providerRef, refundAmount)
  } catch {
    return { error: 'Could not connect to payment provider for refund.' }
  }

  if (!refundResult.success) {
    return { error: refundResult.error ?? 'Refund failed at the provider.' }
  }

  await (adminClient as any)
    .from('payments')
    .update({
      status:           'refunded',
      refund_reference: refundResult.reference,
      refunded_at:      new Date().toISOString(),
    })
    .eq('id', paymentId)

  // Mark the invoice void if fully refunded
  if (payment.invoice_id && refundAmount >= payment.amount) {
    await (adminClient as any)
      .from('invoices')
      .update({ status: 'void' })
      .eq('id', payment.invoice_id)
  }

  await logAuditEvent({
    adminId:    adminProfile.id,
    actionType: 'payment_refunded',
    entityType: 'payment',
    entityId:   paymentId,
    newValues:  { refund_reference: refundResult.reference, refund_amount: refundAmount },
  })

  revalidatePath('/admin/billing')
  return { success: true }
}

// ─── adminRetryPayment ────────────────────────────────────────────────────────
// Marks a failed payment as pending so the user can re-attempt.
// Does NOT re-charge the card — the user must initiate a new checkout.

export async function adminRetryPayment(paymentId: string): Promise<ActionResult> {
  const adminProfile = await getServerProfile()
  if (!adminProfile || !canAccessAdmin(adminProfile.role)) return { error: 'Insufficient permissions.' }

  const adminClient = createAdminClient()
  const { data: payment } = await (adminClient as any)
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .maybeSingle() as { data: BillingPayment | null }

  if (!payment) return { error: 'Payment not found.' }
  if (payment.status !== 'failed') return { error: 'Only failed payments can be retried.' }

  // Notify the user so they know to re-initiate payment
  await insertNotification(
    adminClient,
    payment.user_id,
    'billing',
    'Action required: Complete your payment',
    'An administrator has flagged your payment for retry. Please visit Billing to complete your subscription.',
    '/account/billing',
  )

  await logAuditEvent({
    adminId:    adminProfile.id,
    actionType: 'payment_retry_flagged',
    entityType: 'payment',
    entityId:   paymentId,
  })

  revalidatePath('/admin/billing')
  return { success: true }
}
