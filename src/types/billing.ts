// ─── Billing enums ────────────────────────────────────────────────────────────

export type BillingType = 'one_time' | 'monthly' | 'annual'

export type SubscriptionStatus = 'pending' | 'active' | 'past_due' | 'expired' | 'cancelled'

export type InvoiceStatus = 'pending' | 'paid' | 'void' | 'overdue'

export type BillingPaymentStatus = 'pending' | 'pending_verification' | 'completed' | 'failed' | 'refunded'

// ─── Row interfaces ───────────────────────────────────────────────────────────

export interface SubscriptionPlan {
  id:           string
  role:         string
  name:         string
  billing_type: BillingType
  amount:       number
  currency:     string
  features:     string[]
  is_active:    boolean
  created_at:   string
  updated_at:   string
}

export interface Subscription {
  id:                    string
  user_id:               string
  plan_id:               string | null
  status:                SubscriptionStatus
  starts_at:             string
  expires_at:            string | null
  auto_renew:            boolean
  grace_period_ends_at:  string | null
  /** Payment method used to fund this subscription (null = admin grant / legacy) */
  payment_provider:      string | null
  created_at:            string
  updated_at:            string
  /** Populated via join when available */
  plan?:                 SubscriptionPlan | null
}

export interface Invoice {
  id:               string
  user_id:          string
  subscription_id:  string | null
  amount:           number
  currency:         string
  status:           InvoiceStatus
  issued_at:        string
  paid_at:          string | null
  /** Payment method used to settle this invoice (null = legacy / admin grant) */
  payment_provider: string | null
  created_at:       string
  updated_at:       string
}

export interface BillingPayment {
  id:                               string
  user_id:                          string
  invoice_id:                       string | null
  provider:                         string
  provider_reference:               string | null
  amount:                           number
  currency:                         string
  status:                           BillingPaymentStatus
  metadata:                         Record<string, unknown>
  /** Bank transfer: user-submitted receipt / reference number */
  bank_transfer_reference:          string | null
  /** Admin who actioned the bank transfer verification */
  bank_transfer_approved_by:        string | null
  bank_transfer_approved_at:        string | null
  bank_transfer_rejection_reason:   string | null
  created_at:                       string
  updated_at:                       string
  /** Populated via join when available */
  invoice?:                         Invoice | null
}

// ─── Computed billing status ──────────────────────────────────────────────────

export interface UserBillingStatus {
  /** true for free roles (buyer, tenant, visitor) — always allowed to publish */
  requiresPayment:       boolean
  /** Derived: subscription is active (status=active and not expired) */
  isActivated:           boolean
  /** Alias for isActivated — kept for clarity in UI conditionals */
  hasActiveSubscription: boolean
  /** Current subscription row (null when none exists) */
  subscription:          Subscription | null
  /** The plan attached to the current subscription (null when admin-granted or none) */
  plan:                  SubscriptionPlan | null
}

// ─── Display helpers ──────────────────────────────────────────────────────────

export const BILLING_TYPE_LABELS: Record<BillingType, string> = {
  one_time: 'One-time',
  monthly:  'Monthly',
  annual:   'Annual',
}

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  pending:   'Pending',
  active:    'Active',
  past_due:  'Past Due',
  expired:   'Expired',
  cancelled: 'Cancelled',
}

export const SUBSCRIPTION_STATUS_COLORS: Record<SubscriptionStatus, string> = {
  pending:   'bg-yellow-100 text-yellow-700',
  active:    'bg-emerald-100 text-emerald-700',
  past_due:  'bg-orange-100 text-orange-700',
  expired:   'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  pending: 'Pending',
  paid:    'Paid',
  void:    'Void',
  overdue: 'Overdue',
}

export const INVOICE_STATUS_COLORS: Record<InvoiceStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  paid:    'bg-emerald-100 text-emerald-700',
  void:    'bg-gray-100 text-gray-500',
  overdue: 'bg-red-100 text-red-700',
}

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending:              'Pending',
  pending_verification: 'Awaiting Verification',
  completed:            'Completed',
  failed:               'Failed',
  refunded:             'Refunded',
}

export const PAYMENT_STATUS_COLORS: Record<string, string> = {
  pending:              'bg-yellow-100 text-yellow-700',
  pending_verification: 'bg-blue-100 text-blue-700',
  completed:            'bg-emerald-100 text-emerald-700',
  failed:               'bg-red-100 text-red-700',
  refunded:             'bg-gray-100 text-gray-500',
}
