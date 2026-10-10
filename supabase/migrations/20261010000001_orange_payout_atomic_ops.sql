-- Migration: 20261010000001 — Atomic Orange Money payout completion and cancellation
--
-- Context: Orange Money has no public B2C disbursement API. Payouts are processed
-- manually by an admin via the Orange Money portal. The admin must:
--   1. Call processPayoutAdmin  — moves payout to 'processing' (no wallet debit yet)
--   2. Send funds manually via the Orange Money portal
--   3. Call confirmOrangePayoutAdmin — this migration's function performs the atomic
--      wallet debit + lock release + payout completion in a single transaction
--
-- Both functions lock the payout row with FOR UPDATE so concurrent calls are
-- serialized. The second concurrent caller re-evaluates the WHERE after the first
-- commits and returns 'not_processing' if the status has already changed.

-- ─── complete_orange_payout ───────────────────────────────────────────────────
-- Called by confirmOrangePayoutAdmin after the admin has confirmed the external
-- transfer was sent. Debits the recipient wallet and marks the payout completed.
-- Returns 'completed' on success, 'not_processing' if the payout is not in the
-- expected state (already completed, cancelled, or not yet processing).

CREATE OR REPLACE FUNCTION public.complete_orange_payout(p_payout_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recipient_id UUID;
  v_amount       BIGINT;
BEGIN
  -- Lock the payout row. Only match status = 'processing' so that a second
  -- concurrent call waits here, then re-evaluates and finds NOT FOUND.
  SELECT recipient_id, amount
  INTO   v_recipient_id, v_amount
  FROM   public.payouts
  WHERE  id = p_payout_id
    AND  status = 'processing'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 'not_processing';
  END IF;

  -- Debit the recipient's wallet balance. wallet_transfer raises an exception if
  -- balance < amount, rolling back this entire transaction (payout stays processing).
  -- p_amount = amount (gross): matches the lock placed by wallet_lock at requestPayout.
  PERFORM public.wallet_transfer(
    v_recipient_id,
    NULL,
    v_amount,
    'payout',
    p_payout_id,
    'Payout withdrawal'
  );

  -- Release the lock placed when the payout was originally requested.
  PERFORM public.wallet_unlock(v_recipient_id, v_amount);

  -- Mark payout completed. The AND status = 'processing' is redundant given the
  -- FOR UPDATE above, but provides a defensive guard.
  UPDATE public.payouts
  SET    status       = 'completed',
         completed_at = NOW()
  WHERE  id = p_payout_id
    AND  status = 'processing';

  RETURN 'completed';
END;
$$;


-- ─── cancel_orange_payout ─────────────────────────────────────────────────────
-- Called by cancelProcessingPayoutAdmin when the admin was unable to complete the
-- external transfer. Releases the wallet lock only — the balance was never debited
-- in the Orange Money processing path — and marks the payout failed.
-- Returns 'cancelled' on success, 'not_processing' if already terminal.

CREATE OR REPLACE FUNCTION public.cancel_orange_payout(p_payout_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recipient_id UUID;
  v_amount       BIGINT;
BEGIN
  SELECT recipient_id, amount
  INTO   v_recipient_id, v_amount
  FROM   public.payouts
  WHERE  id = p_payout_id
    AND  status = 'processing'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 'not_processing';
  END IF;

  -- Release the lock only. The wallet balance was not debited in this path
  -- (debit is deferred to complete_orange_payout), so no wallet_transfer needed.
  PERFORM public.wallet_unlock(v_recipient_id, v_amount);

  UPDATE public.payouts
  SET    status         = 'failed',
         failed_at      = NOW(),
         failure_reason = 'Cancelled by admin'
  WHERE  id = p_payout_id
    AND  status = 'processing';

  RETURN 'cancelled';
END;
$$;


-- ─── Permissions ─────────────────────────────────────────────────────────────
-- These functions perform financial operations without RLS. Restrict execution
-- to service_role (used by createAdminClient) so authenticated or anon roles
-- cannot invoke them directly through the PostgREST RPC endpoint.

REVOKE ALL ON FUNCTION public.complete_orange_payout(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_orange_payout(UUID)  FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.complete_orange_payout(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.cancel_orange_payout(UUID)  TO service_role;
