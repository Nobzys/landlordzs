import type { DbPaymentStatus, DbEscrowStatus } from './database'

// ─── Enums ────────────────────────────────────────────────────────────────────

export type TransactionType =
  | 'property_sale' | 'property_rent' | 'product_purchase' | 'service_payment'
  | 'rental_payment' | 'subscription' | 'commission' | 'refund' | 'escrow_deposit'
  | 'escrow_release' | 'wallet_topup' | 'wallet_withdrawal' | 'payout'

export type PaymentProvider = 'mtn_momo' | 'orange_money' | 'stripe' | 'bank_transfer' | 'cash' | 'wallet'
export type MobileProvider  = Extract<PaymentProvider, 'mtn_momo' | 'orange_money'>
export type MilestoneStatus = 'pending' | 'in_progress' | 'completed' | 'approved' | 'disputed'
export type CommissionStatus = 'pending' | 'paid' | 'cancelled'
export type CommissionType   = 'agent' | 'platform' | 'referral'

// ─── Row types ────────────────────────────────────────────────────────────────

export interface WalletRow {
  id:         string
  user_id:    string
  balance:    number
  locked:     number
  currency:   string
  created_at: string
  updated_at: string
}

export interface TransactionRow {
  id:              string
  payer_id:        string | null
  payee_id:        string | null
  type:            TransactionType
  status:          DbPaymentStatus
  amount:          number
  fee:             number
  net_amount:      number
  currency:        string
  provider:        PaymentProvider | null
  provider_ref:    string | null
  provider_status: string | null
  provider_meta:   Record<string, unknown>
  reference_type:  string | null
  reference_id:    string | null
  escrow_id:       string | null
  description:     string | null
  initiated_at:    string
  completed_at:    string | null
  failed_at:       string | null
  failure_reason:  string | null
  created_at:      string
  updated_at:      string
}

export interface WalletTransactionRow {
  id:             string
  wallet_id:      string
  user_id:        string
  type:           'credit' | 'debit' | 'lock' | 'unlock'
  amount:         number
  balance_before: number
  balance_after:  number
  currency:       string
  reference_type: string | null
  reference_id:   string | null
  description:    string | null
  created_at:     string
}

export interface EscrowAccountRow {
  id:               string
  reference_type:   string
  reference_id:     string
  payer_id:         string
  payee_id:         string
  amount:           number
  currency:         string
  platform_fee:     number
  platform_fee_pct: number
  status:           DbEscrowStatus
  funded_at:        string | null
  release_date:     string | null
  released_at:      string | null
  disputed_at:      string | null
  resolved_at:      string | null
  dispute_reason:   string | null
  resolution_notes: string | null
  created_at:       string
  updated_at:       string
}

export interface EscrowMilestoneRow {
  id:           string
  escrow_id:    string
  title:        string
  description:  string | null
  amount:       number
  percentage:   number | null
  status:       MilestoneStatus
  due_date:     string | null
  completed_at: string | null
  approved_at:  string | null
  disputed_at:  string | null
  evidence_urls: string[]
  notes:        string | null
  created_at:   string
  updated_at:   string
}

export interface EscrowEventRow {
  id:          string
  escrow_id:   string
  actor_id:    string | null
  event_type:  string
  description: string | null
  metadata:    Record<string, unknown>
  created_at:  string
}

export interface PayoutRow {
  id:              string
  recipient_id:    string
  amount:          number
  fee:             number
  net_amount:      number
  currency:        string
  provider:        PaymentProvider
  account_details: { phone: string; name?: string }
  status:          DbPaymentStatus
  provider_ref:    string | null
  initiated_at:    string | null
  completed_at:    string | null
  failed_at:       string | null
  failure_reason:  string | null
  created_at:      string
  updated_at:      string
}

export interface CommissionRecordRow {
  id:              string
  transaction_id:  string | null
  earner_id:       string
  commission_type: CommissionType
  reference_type:  string
  reference_id:    string
  amount:          number
  rate_pct:        number
  currency:        string
  status:          CommissionStatus
  paid_at:         string | null
  created_at:      string
}

// ─── Rich join types ──────────────────────────────────────────────────────────

type MinProfile = { id: string; full_name: string | null; display_name: string | null; avatar_url: string | null }

export interface TransactionWithParties extends TransactionRow {
  payer: MinProfile | null
  payee: MinProfile | null
}

export interface EscrowWithDetails extends EscrowAccountRow {
  milestones: EscrowMilestoneRow[]
  events:     EscrowEventRow[]
  payer:      MinProfile
  payee:      MinProfile
}

// ─── Payment initiation ───────────────────────────────────────────────────────

export interface InitiatePaymentInput {
  amount:         number
  provider:       Extract<PaymentProvider, 'mtn_momo' | 'orange_money' | 'wallet'>
  phone?:         string
  reference_type?: string
  reference_id?:  string
  description?:   string
  escrow_id?:     string
  transaction_type?: TransactionType
}

export interface PaymentInitiationResult {
  transaction_id: string
  provider_ref:   string | null
  status:         DbPaymentStatus
  payment_url?:   string
}

// ─── Payout request ───────────────────────────────────────────────────────────

export interface RequestPayoutInput {
  amount:   number
  provider: MobileProvider
  phone:    string
  name?:    string
}
