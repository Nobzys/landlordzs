-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: payment_provider_columns
-- Purpose  : Track the payment provider used for each subscription, invoice,
--            and escrow transaction. Add bank-transfer specific columns to the
--            payments table to support the manual verification flow.
--
-- Safety   : Additive only — no DROP, TRUNCATE, or column renames.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── subscriptions.payment_provider ───────────────────────────────────────────
-- Which payment method funded this subscription.
-- NULL = pre-existing rows (admin grant or mock).
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS payment_provider TEXT DEFAULT NULL;

COMMENT ON COLUMN subscriptions.payment_provider IS
  'Payment method used: mtn_momo | orange_money | bank_transfer | stripe | paypal | mock';

-- ── invoices.payment_provider ─────────────────────────────────────────────────
-- Mirrors subscriptions.payment_provider for the linked invoice.
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS payment_provider TEXT DEFAULT NULL;

COMMENT ON COLUMN invoices.payment_provider IS
  'Payment method used to settle this invoice.';

-- ── payments: bank transfer columns ──────────────────────────────────────────
-- Tracks the manual bank-transfer verification flow.
-- pending_verification → admin reviews → completed (approved) / failed (rejected).

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS bank_transfer_reference        TEXT,
  ADD COLUMN IF NOT EXISTS bank_transfer_approved_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS bank_transfer_approved_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS bank_transfer_rejection_reason TEXT;

COMMENT ON COLUMN payments.bank_transfer_reference        IS 'User-submitted bank transfer reference / receipt number.';
COMMENT ON COLUMN payments.bank_transfer_approved_by      IS 'Admin profile who approved or rejected this transfer.';
COMMENT ON COLUMN payments.bank_transfer_approved_at      IS 'Timestamp when the admin actioned this transfer.';
COMMENT ON COLUMN payments.bank_transfer_rejection_reason IS 'Reason given by admin when rejecting a bank transfer.';

-- ── Index: find pending bank transfers quickly ────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_payments_bank_transfer_pending
  ON payments (user_id, created_at DESC)
  WHERE bank_transfer_reference IS NOT NULL
    AND status NOT IN ('completed', 'failed', 'refunded');

-- ── Index: subscriptions by provider ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_subscriptions_payment_provider
  ON subscriptions (payment_provider)
  WHERE payment_provider IS NOT NULL;

-- ── Index: invoices by provider ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_invoices_payment_provider
  ON invoices (payment_provider)
  WHERE payment_provider IS NOT NULL;
