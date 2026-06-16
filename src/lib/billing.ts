// ─── Server-side billing utilities ───────────────────────────────────────────
// Pure async helpers — import in server actions and page components only.
// Never import in client components.

import { requiresActivationFee } from '@/lib/roles'
import type { UserBillingStatus, Subscription, SubscriptionPlan } from '@/types/billing'

// ─── getBillingStatus ─────────────────────────────────────────────────────────
// Returns the full billing state for a user. Roles that never require payment
// return a stub with all access flags set to true.

export async function getBillingStatus(
  userId: string,
  role: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
): Promise<UserBillingStatus> {
  if (!requiresActivationFee(role)) {
    return {
      requiresPayment:       false,
      isActivated:           true,
      hasActiveSubscription: true,
      subscription:          null,
      plan:                  null,
    }
  }

  // Fetch the most recent subscription for this user, newest first.
  const { data: sub } = await (supabase as any)
    .from('subscriptions')
    .select('*, plan:subscription_plans(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle() as { data: (Subscription & { plan: SubscriptionPlan | null }) | null }

  const now = new Date()
  const isActive =
    sub?.status === 'active' &&
    (sub.expires_at === null || new Date(sub.expires_at) > now)

  // Grace period: treat 'past_due' within grace period as partially active
  // (allow existing content to stay visible but block new publishing).
  const inGrace =
    sub?.status === 'past_due' &&
    sub.grace_period_ends_at !== null &&
    new Date(sub.grace_period_ends_at) > now

  return {
    requiresPayment:       true,
    isActivated:           isActive || inGrace,
    hasActiveSubscription: isActive,
    subscription:          sub ?? null,
    plan:                  sub?.plan ?? null,
  }
}

// ─── checkCanPublishContent ───────────────────────────────────────────────────
// Returns true when a user is allowed to create/publish new content.
// Free roles are always allowed. Paid roles need an active subscription.

export async function checkCanPublishContent(
  userId: string,
  role: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
): Promise<boolean> {
  if (!requiresActivationFee(role)) return true
  const status = await getBillingStatus(userId, role, supabase)
  return status.hasActiveSubscription
}

// ─── getPlansForRole ──────────────────────────────────────────────────────────
// Returns all active subscription plans for the given role, sorted by amount.

export async function getPlansForRole(
  role: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
): Promise<SubscriptionPlan[]> {
  const { data } = await (supabase as any)
    .from('subscription_plans')
    .select('*')
    .eq('role', role)
    .eq('is_active', true)
    .order('amount', { ascending: true }) as { data: SubscriptionPlan[] | null }

  return data ?? []
}
