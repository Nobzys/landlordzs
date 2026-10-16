-- Migration: 20261016000001 — Webhook financial integrity
--
-- Fixes the non-atomic two-step pattern in the MTN and Orange Money webhook
-- handlers where a transaction was marked completed BEFORE the wallet credit
-- succeeded, creating a window where the transaction appeared complete but
-- the user's balance was not updated.
--
-- Changes:
--   1. Unique partial index on wallet_transactions — prevents duplicate credits
--      for the same payment transaction regardless of concurrent webhook retries
--      or manual reconciliation attempts.
--
--   2. finalize_payment_webhook — atomic PLPGSQL function that performs the
--      CAS status update AND the wallet credit (or escrow funding) in a single
--      database transaction. Replaces the two-step application-level pattern.
--
--   3. reverse_mtn_payout — atomic function that marks a payout failed AND
--      credits the reversal amount in one transaction. Prevents the payout
--      being marked failed while the wallet credit remains missing.
--
--   4. find_missing_wallet_credits — returns completed wallet-top-up
--      transactions that have no corresponding credit in wallet_transactions.
--      Used for post-migration reconciliation and ongoing monitoring.
--
--   5. apply_missing_wallet_credit — idempotent, audited recovery function for
--      admin-triggered reconciliation of a single missing credit. Restricted to
--      service_role so it cannot be called by authenticated or anon users.


-- ============================================================
-- Safety pre-check: abort if duplicate credits already exist
-- in the subset this index will cover.
-- Run this on staging before applying to production.
-- ============================================================
DO $$
DECLARE
  v_conflicts BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_conflicts
  FROM (
    SELECT reference_id, user_id
    FROM   public.wallet_transactions
    WHERE  reference_type = 'transaction'
      AND  type = 'credit'
    GROUP BY reference_id, user_id
    HAVING COUNT(*) > 1
  ) dups;

  IF v_conflicts > 0 THEN
    RAISE EXCEPTION
      'wallet_transactions has % row(s) that would violate the new unique '
      'index (reference_type=''transaction'', type=''credit'', duplicate '
      '(reference_id, user_id)).  Resolve these duplicates with '
      'find_missing_wallet_credits() before re-applying this migration.',
      v_conflicts;
  END IF;
END;
$$;


-- ============================================================
-- 1. Unique partial index — transaction credits
--
-- Scope: only rows where reference_type = 'transaction' AND type = 'credit'.
-- Rationale:
--   - Every payment transaction has a unique UUID (transactions.id).
--   - A transaction credits exactly one user (the payer).
--   - The index therefore prevents two credit entries for the same payment,
--     regardless of whether they originate from a webhook retry, a concurrent
--     delivery, or a manual reconciliation attempt.
--
-- This index does NOT affect:
--   - Debit entries from the wallet-payment path (type = 'debit').
--   - Payout-related entries (reference_type = 'payout').
--   - Escrow, milestone, commission, or dispute entries.
--   - Multiple lock/unlock entries for retried payouts.
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS uq_wallet_tx_transaction_credit
  ON public.wallet_transactions(reference_id, user_id)
  WHERE reference_type = 'transaction'
    AND type = 'credit';


-- ============================================================
-- 2. finalize_payment_webhook
--
-- Atomically transitions a payment transaction from its current status to
-- 'completed' or 'failed' and, on completion, either credits the payer's
-- wallet (wallet top-up) or marks the escrow account as funded.
--
-- All three operations — the CAS status update, the wallet credit, and the
-- escrow update — run inside a single implicit database transaction.  A
-- failure in any step (e.g. wallet_transfer raising an exception because the
-- receiver wallet does not exist) rolls back the entire transaction, leaving
-- the payment transaction in its pre-call status so that a subsequent
-- provider-callback retry can succeed.
--
-- Parameters:
--   p_txn_id         — transactions.id (UUID)
--   p_new_status     — 'completed' or 'failed'
--   p_current_status — expected current status for the CAS guard
--   p_provider_ref   — provider's transaction / financial-transaction id
--   p_failure_reason — failure description (only used when p_new_status = 'failed')
--   p_desc           — wallet credit description (only used when completing a top-up)
--
-- Return values:
--   'completed_and_credited'          — top-up completed and wallet credited
--   'completed_and_escrow_funded'     — escrow payment completed and escrow funded
--   'completed_escrow_already_settled'— escrow row was already funded/settled
--   'failed'                          — transaction marked failed (no wallet op)
--   'already_terminal'                — transaction already in a terminal state
--   'cas_missed'                      — current status does not match p_current_status
--   'not_found'                       — transaction not found
-- ============================================================
CREATE OR REPLACE FUNCTION public.finalize_payment_webhook(
  p_txn_id          UUID,
  p_new_status      TEXT,
  p_current_status  TEXT,
  p_provider_ref    TEXT,
  p_failure_reason  TEXT,
  p_desc            TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_txn             public.transactions%ROWTYPE;
  TERMINAL_STATUSES TEXT[] := ARRAY['completed','failed','cancelled','refunded'];
BEGIN
  -- Acquire a row-level lock so concurrent webhook deliveries are serialized.
  -- The second concurrent caller waits here; once the first commits, the
  -- second re-reads the updated status and hits the terminal-state guard.
  SELECT * INTO v_txn
  FROM   public.transactions
  WHERE  id = p_txn_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 'not_found';
  END IF;

  -- Idempotency guard: duplicate or late callback, already in terminal state.
  IF v_txn.status = ANY(TERMINAL_STATUSES) THEN
    RETURN 'already_terminal';
  END IF;

  -- CAS guard: status changed under us (concurrent callback won the race).
  IF v_txn.status != p_current_status THEN
    RETURN 'cas_missed';
  END IF;

  -- ── Transition to failed ────────────────────────────────────────────────
  IF p_new_status = 'failed' THEN
    UPDATE public.transactions
    SET  status         = 'failed',
         provider_ref   = COALESCE(p_provider_ref, provider_ref),
         failed_at      = NOW(),
         failure_reason = p_failure_reason
    WHERE id = p_txn_id;

    RETURN 'failed';
  END IF;

  -- ── Transition to completed ─────────────────────────────────────────────
  UPDATE public.transactions
  SET  status       = 'completed',
       provider_ref = COALESCE(p_provider_ref, provider_ref),
       completed_at = NOW()
  WHERE id = p_txn_id;

  -- Wallet top-up: credit the payer's wallet.
  -- wallet_transfer raises an exception if any invariant fails (zero amount,
  -- no receiver wallet, etc.), which rolls back BOTH the UPDATE above and
  -- the credit INSERT — keeping the transaction in its pre-call status.
  IF v_txn.escrow_id IS NULL THEN
    PERFORM public.wallet_transfer(
      NULL,
      v_txn.payer_id,
      v_txn.net_amount,
      'transaction',
      p_txn_id,
      p_desc
    );
    RETURN 'completed_and_credited';
  END IF;

  -- Escrow payment: mark the escrow account as funded.
  -- The CAS on status = 'pending' handles the (rare) concurrent case where
  -- two webhook deliveries both passed the transaction CAS but race on escrow.
  UPDATE public.escrow_accounts
  SET  status    = 'funded',
       funded_at = NOW()
  WHERE id     = v_txn.escrow_id
    AND status = 'pending';

  IF NOT FOUND THEN
    -- Escrow was already funded (concurrent delivery) or is in an unexpected
    -- state.  The transaction is now correctly marked completed; this is not
    -- a fatal inconsistency.
    RETURN 'completed_escrow_already_settled';
  END IF;

  RETURN 'completed_and_escrow_funded';
END;
$$;


-- ============================================================
-- 3. reverse_mtn_payout
--
-- Atomically marks an MTN MoMo payout as failed AND credits the reversal
-- amount back to the recipient's wallet in one database transaction.
--
-- The FOR UPDATE lock serializes concurrent FAILED callbacks so only one
-- call performs the reversal.  Subsequent calls see status = 'failed'
-- (terminal) and return 'already_terminal' without a second credit.
--
-- Note: unlike transaction credits, payout reversals are intentionally NOT
-- covered by the unique-index guard because a retried payout (different
-- processing attempts of the same payout row) legitimately produces a new
-- debit entry followed by a new reversal credit.  The atomicity of this
-- function is sufficient to prevent within-attempt double-credit.
--
-- Parameters:
--   p_payout_id      — payouts.id
--   p_current_status — expected current status (CAS guard)
--   p_failure_reason — reason string for the failed payout record
--
-- Return values:
--   'reversed'        — payout marked failed and wallet credited
--   'already_terminal'— payout already in a terminal state
--   'cas_missed'      — status changed concurrently
--   'not_found'       — payout row not found
-- ============================================================
CREATE OR REPLACE FUNCTION public.reverse_mtn_payout(
  p_payout_id       UUID,
  p_current_status  TEXT,
  p_failure_reason  TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payout          public.payouts%ROWTYPE;
  TERMINAL_STATUSES TEXT[] := ARRAY['completed','failed','cancelled'];
BEGIN
  SELECT * INTO v_payout
  FROM   public.payouts
  WHERE  id = p_payout_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 'not_found';
  END IF;

  IF v_payout.status = ANY(TERMINAL_STATUSES) THEN
    RETURN 'already_terminal';
  END IF;

  IF v_payout.status != p_current_status THEN
    RETURN 'cas_missed';
  END IF;

  UPDATE public.payouts
  SET  status         = 'failed',
       failed_at      = NOW(),
       failure_reason = p_failure_reason
  WHERE id = p_payout_id;

  -- Credit the recipient's wallet (reversal).
  -- Exception here rolls back both the UPDATE and the credit INSERT, leaving
  -- the payout in its pre-call status so the next webhook delivery can retry.
  PERFORM public.wallet_transfer(
    NULL,
    v_payout.recipient_id,
    v_payout.amount,
    'payout',
    p_payout_id,
    'Payout reversal — MTN disbursement failed'
  );

  RETURN 'reversed';
END;
$$;


-- ============================================================
-- 4. find_missing_wallet_credits
--
-- Returns wallet top-up transactions (no escrow_id) whose status is
-- 'completed' but that have no corresponding credit entry in
-- wallet_transactions.  These are candidates for reconciliation via
-- apply_missing_wallet_credit.
--
-- A transaction in this state can only arise from:
--   (a) the old two-step webhook handler (pre-migration) where the CAS
--       succeeded but wallet_transfer subsequently failed, or
--   (b) a direct admin database modification.
--
-- The result set is informational — it DOES NOT automatically credit any
-- wallet.  Each row must be reviewed and recovered individually via
-- apply_missing_wallet_credit.
-- ============================================================
CREATE OR REPLACE FUNCTION public.find_missing_wallet_credits()
RETURNS TABLE(
  txn_id       UUID,
  payer_id     UUID,
  net_amount   BIGINT,
  provider     TEXT,
  provider_ref TEXT,
  completed_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.id          AS txn_id,
    t.payer_id,
    t.net_amount,
    t.provider::TEXT,
    t.provider_ref,
    t.completed_at
  FROM public.transactions t
  WHERE t.status     = 'completed'
    AND t.escrow_id  IS NULL
    AND t.payer_id   IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM   public.wallet_transactions wt
      WHERE  wt.reference_type = 'transaction'
        AND  wt.reference_id   = t.id
        AND  wt.type           = 'credit'
        AND  wt.user_id        = t.payer_id
    )
  ORDER BY t.completed_at DESC;
$$;


-- ============================================================
-- 5. apply_missing_wallet_credit
--
-- Idempotent, audited recovery function for a single missing wallet credit.
-- Intended to be called by an admin server action after the admin has
-- verified the provider-confirmed payment and reviewed find_missing_wallet_credits.
--
-- Guards:
--   - Transaction must exist and be 'completed'.
--   - Transaction must have no escrow_id (top-up only; escrow uses a
--     separate recovery path via release_escrow).
--   - A credit for this transaction must not already exist (idempotent:
--     returns 'already_credited' rather than double-crediting).
--   - Logs the recovery to admin_logs for the audit trail.
--
-- Parameters:
--   p_txn_id   — the transaction to recover
--   p_actor_id — the admin user performing the recovery (for audit logging)
--
-- Return values:
--   'credited'           — wallet credited successfully
--   'already_credited'   — credit already exists; no action taken
--   'not_found'          — transaction not found
--   'not_completed'      — transaction is not in completed state
--   'is_escrow_payment'  — escrow payments are not handled by this function
--   'payer_missing'      — transaction has no payer_id
-- ============================================================
CREATE OR REPLACE FUNCTION public.apply_missing_wallet_credit(
  p_txn_id   UUID,
  p_actor_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_txn public.transactions%ROWTYPE;
BEGIN
  SELECT * INTO v_txn
  FROM   public.transactions
  WHERE  id = p_txn_id
  FOR UPDATE;

  IF NOT FOUND           THEN RETURN 'not_found'; END IF;
  IF v_txn.status != 'completed' THEN RETURN 'not_completed'; END IF;
  IF v_txn.escrow_id IS NOT NULL THEN RETURN 'is_escrow_payment'; END IF;
  IF v_txn.payer_id  IS NULL     THEN RETURN 'payer_missing'; END IF;

  -- Idempotency: skip if a credit already exists.
  -- (The unique index enforces this at DB level; this check provides an
  -- explicit early return and avoids the exception from a duplicate INSERT.)
  IF EXISTS (
    SELECT 1 FROM public.wallet_transactions
    WHERE  reference_type = 'transaction'
      AND  reference_id   = p_txn_id
      AND  type           = 'credit'
      AND  user_id        = v_txn.payer_id
  ) THEN
    RETURN 'already_credited';
  END IF;

  -- Credit the wallet.  wallet_transfer raises an exception on failure,
  -- rolling back both this credit and the admin_logs INSERT below.
  PERFORM public.wallet_transfer(
    NULL,
    v_txn.payer_id,
    v_txn.net_amount,
    'transaction',
    p_txn_id,
    'Admin reconciliation: missing wallet credit applied'
  );

  -- Audit trail.
  INSERT INTO public.admin_logs(
    actor_id, action, target_type, target_id, new_data, ip_address
  )
  VALUES (
    p_actor_id,
    'wallet_credit_reconciliation',
    'transaction',
    p_txn_id,
    jsonb_build_object(
      'net_amount',    v_txn.net_amount,
      'payer_id',      v_txn.payer_id,
      'provider',      v_txn.provider,
      'recovered_at',  NOW()
    ),
    'server'
  );

  RETURN 'credited';
END;
$$;


-- ============================================================
-- Permissions
-- Restrict all five functions to service_role (createAdminClient).
-- Authenticated and anon roles must not be able to invoke financial
-- RPCs directly through the PostgREST /rpc/ endpoint.
-- ============================================================
REVOKE ALL ON FUNCTION public.finalize_payment_webhook(UUID,TEXT,TEXT,TEXT,TEXT,TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reverse_mtn_payout(UUID,TEXT,TEXT)                      FROM PUBLIC;
REVOKE ALL ON FUNCTION public.find_missing_wallet_credits()                            FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_missing_wallet_credit(UUID,UUID)                  FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.finalize_payment_webhook(UUID,TEXT,TEXT,TEXT,TEXT,TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.reverse_mtn_payout(UUID,TEXT,TEXT)                      TO service_role;
GRANT EXECUTE ON FUNCTION public.find_missing_wallet_credits()                            TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_missing_wallet_credit(UUID,UUID)                  TO service_role;
