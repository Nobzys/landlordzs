-- Migration: 20260613000001 — Phase P1 database fixes
-- Fixes 6 critical issues identified in production readiness audit.
-- All statements are idempotent (CREATE OR REPLACE, DROP IF EXISTS, etc.).

-- ============================================================
-- Fix 1: release_escrow RPC
-- Root cause: function was commented out in 0004_functions.sql with a
-- syntax error on the INSERT line (stray 's' after closing paren).
-- This fix also replaces the direct wallet UPDATE with a call to
-- wallet_transfer(NULL, ...) so wallet_transactions are recorded.
-- ============================================================

CREATE OR REPLACE FUNCTION public.release_escrow(p_escrow_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_escrow    public.escrow_accounts%ROWTYPE;
  v_release   BIGINT;
BEGIN
  SELECT * INTO v_escrow
  FROM public.escrow_accounts
  WHERE id = p_escrow_id AND status = 'funded'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Escrow % not found or not in funded state', p_escrow_id;
  END IF;

  v_release := v_escrow.amount - COALESCE(v_escrow.platform_fee, 0);

  -- Credit payee wallet and record wallet_transaction.
  -- p_from_id = NULL means "platform credit" — wallet_transfer skips the
  -- balance check and debit, only executing the credit INSERT.
  PERFORM public.wallet_transfer(
    NULL,
    v_escrow.payee_id,
    v_release,
    'escrow',
    p_escrow_id,
    'Escrow released to payee'
  );

  UPDATE public.escrow_accounts
  SET status = 'released', released_at = NOW()
  WHERE id = p_escrow_id;

  INSERT INTO public.escrow_events (escrow_id, event_type, description, metadata)
  VALUES (
    p_escrow_id,
    'released',
    'Escrow released to payee',
    jsonb_build_object(
      'release_amount', v_release,
      'platform_fee',   v_escrow.platform_fee,
      'payee_id',       v_escrow.payee_id
    )
  );
END;
$$;


-- ============================================================
-- Fix 2: wallet_transfer — full rewrite with three modes:
--   (a) p_from_id = NULL, p_to_id set  → credit only (platform pays user)
--   (b) p_from_id set, p_to_id = NULL  → debit only  (user pays platform/escrow)
--   (c) both set, different IDs         → full transfer
-- Root cause of original bug: no guard for p_from_id = p_to_id
-- (silent net-zero) and no support for debit-only mode (p_to_id = NULL).
-- ============================================================

CREATE OR REPLACE FUNCTION public.wallet_transfer(
  p_from_id  UUID,
  p_to_id    UUID,
  p_amount   BIGINT,
  p_ref_type TEXT DEFAULT NULL,
  p_ref_id   UUID DEFAULT NULL,
  p_desc     TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from_bal BIGINT;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'wallet_transfer: amount must be positive, got %', p_amount;
  END IF;

  IF p_from_id IS NULL AND p_to_id IS NULL THEN
    RAISE EXCEPTION 'wallet_transfer: at least one of p_from_id or p_to_id must be non-null';
  END IF;

  IF p_from_id IS NOT NULL AND p_from_id = p_to_id THEN
    RAISE EXCEPTION 'wallet_transfer: sender and receiver must be different (got %)', p_from_id;
  END IF;

  -- Debit sender (skip when p_from_id IS NULL — platform credit)
  IF p_from_id IS NOT NULL THEN
    SELECT balance INTO v_from_bal
    FROM public.wallets
    WHERE user_id = p_from_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'wallet_transfer: no wallet for sender %', p_from_id;
    END IF;

    IF v_from_bal < p_amount THEN
      RAISE EXCEPTION 'wallet_transfer: insufficient balance (have %, need %)', v_from_bal, p_amount;
    END IF;

    UPDATE public.wallets
    SET balance = balance - p_amount
    WHERE user_id = p_from_id;

    INSERT INTO public.wallet_transactions
      (wallet_id, user_id, type, amount, balance_before, balance_after,
       reference_type, reference_id, description)
    SELECT w.id, p_from_id, 'debit', p_amount,
           v_from_bal, v_from_bal - p_amount,
           p_ref_type, p_ref_id, p_desc
    FROM public.wallets w WHERE w.user_id = p_from_id;
  END IF;

  -- Credit receiver (skip when p_to_id IS NULL — debit only, user pays platform)
  IF p_to_id IS NOT NULL THEN
    UPDATE public.wallets
    SET balance = balance + p_amount
    WHERE user_id = p_to_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'wallet_transfer: no wallet for receiver %', p_to_id;
    END IF;

    -- balance_before = w.balance - p_amount because UPDATE already ran
    INSERT INTO public.wallet_transactions
      (wallet_id, user_id, type, amount, balance_before, balance_after,
       reference_type, reference_id, description)
    SELECT w.id, p_to_id, 'credit', p_amount,
           w.balance - p_amount, w.balance,
           p_ref_type, p_ref_id, p_desc
    FROM public.wallets w WHERE w.user_id = p_to_id;
  END IF;
END;
$$;


-- ============================================================
-- Fix 2b: profiles.status → profiles.account_status column rename
-- Root cause: migration 0003 created the column as "status" but all
-- TypeScript code (ProfileRow, auth actions, admin pages) reference
-- "account_status". This caused:
--   - signIn account_status check to always return undefined (suspended
--     users could log in)
--   - adminSuspendAccount update to silently fail
--   - admin user list to show undefined status for all users
-- No RLS policies reference the profiles.status column so rename is safe.
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'status'
  ) THEN
    ALTER TABLE public.profiles RENAME COLUMN status TO account_status;
  END IF;
END;
$$;


-- ============================================================
-- Fix 3: on_auth_user_created trigger
-- Root cause: trigger was commented out in 0003_auth_profiles.sql.
-- Without it, signing up creates an auth.users row but NO profiles
-- row, so getServerProfile() falls back to a synthesized object
-- and any DB operation against profiles fails silently.
-- ============================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- Fix 4: wallet auto-creation trigger
-- Root cause: no mechanism creates a wallets row when a profile
-- is first inserted. wallet balance queries, top-ups, and payouts
-- all fail for users who have never topped up (no wallet row).
-- The trigger fires on profiles rather than auth.users so it also
-- covers manually-seeded profiles and admin-created accounts.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.wallets (user_id, balance, locked, currency)
  VALUES (NEW.id, 0, 0, 'XAF')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_profile();

-- Backfill: create wallet rows for any existing profiles that don't have one
INSERT INTO public.wallets (user_id, balance, locked, currency)
SELECT p.id, 0, 0, 'XAF'
FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM public.wallets w WHERE w.user_id = p.id)
ON CONFLICT (user_id) DO NOTHING;


-- ============================================================
-- Fix 5: payouts INSERT RLS policy for authenticated users
-- Root cause: 0016_rls_policies.sql only created:
--   payout_own  FOR SELECT USING (recipient_id = auth.uid())
--   payout_admin FOR ALL USING (is_admin())
-- requestPayout() uses the user's supabase client to INSERT into
-- payouts, which fails with RLS violation.
-- ============================================================

DROP POLICY IF EXISTS "payout_insert" ON public.payouts;
CREATE POLICY "payout_insert" ON public.payouts
  FOR INSERT
  WITH CHECK (recipient_id = auth.uid());


-- ============================================================
-- Fix 6: escrow_accounts UPDATE RLS policy for payer/payee
-- Root cause: 0016_rls_policies.sql only allowed admin to UPDATE
-- escrow_accounts. fundEscrow() and disputeEscrow() use the user's
-- supabase client and need to UPDATE the status column.
-- ============================================================

DROP POLICY IF EXISTS "escrow_update_parties" ON public.escrow_accounts;
CREATE POLICY "escrow_update_parties" ON public.escrow_accounts
  FOR UPDATE
  USING (payer_id = auth.uid() OR payee_id = auth.uid());
