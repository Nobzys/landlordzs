-- Migration: Atomic wallet lock/unlock functions
-- Replaces read-modify-write patterns that are vulnerable to race conditions
-- under concurrent payout requests from the same user.

-- Atomically increment the locked amount on a wallet.
-- Called when a payout is requested so that available balance is correctly reduced.
CREATE OR REPLACE FUNCTION public.wallet_lock(p_user_id UUID, p_amount BIGINT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.wallets SET locked = locked + p_amount WHERE user_id = p_user_id;
END;
$$;

-- Atomically decrement the locked amount on a wallet, flooring at zero.
-- Called when a payout succeeds, fails, or is cancelled by the user.
-- GREATEST prevents locked from going negative if called twice or with a stale amount.
CREATE OR REPLACE FUNCTION public.wallet_unlock(p_user_id UUID, p_amount BIGINT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.wallets SET locked = GREATEST(0, locked - p_amount) WHERE user_id = p_user_id;
END;
$$;
