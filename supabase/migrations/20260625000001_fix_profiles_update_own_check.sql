-- Fix: profiles_update_own's WITH CHECK clause (20260618000004) directly
-- references account_status/approved_at/approved_by/rejected_at/rejected_by
-- via correlated subqueries against public.profiles. Fix #2b
-- (20260624000001) revoked SELECT on exactly those five columns from
-- `authenticated` to mask them from other users. Evaluating an RLS policy
-- expression requires column-level SELECT privilege on every column it
-- references, including inside its own subqueries — so the policy itself
-- started failing with "permission denied for table profiles" on every
-- self-update, for every user (admin included), the moment that grant was
-- revoked.
--
-- Fix: move the self-promotion check into a SECURITY DEFINER function
-- (same pattern as the existing is_admin()/has_active_account() helpers),
-- so it runs with the function owner's privileges instead of the caller's.
-- No grant is re-opened — account_status/approved_*/rejected_* remain
-- unreadable to `authenticated` via direct SELECT; only this function may
-- read them, and only to compare them, never to return their values.
-- Business rule (self-promotion blocked) and RLS itself are unchanged.

CREATE OR REPLACE FUNCTION public.check_profile_self_update(
  p_role            user_role,
  p_is_verified     boolean,
  p_is_premium      boolean,
  p_approved_at     timestamptz,
  p_approved_by     uuid,
  p_rejected_at     timestamptz,
  p_rejected_by     uuid,
  p_account_status  account_status
) RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    p_role          = p.role
    AND p_is_verified = p.is_verified
    AND p_is_premium  = p.is_premium
    AND p_approved_at IS NOT DISTINCT FROM p.approved_at
    AND p_approved_by IS NOT DISTINCT FROM p.approved_by
    AND p_rejected_at IS NOT DISTINCT FROM p.rejected_at
    AND p_rejected_by IS NOT DISTINCT FROM p.rejected_by
    AND (p_account_status = p.account_status OR p_account_status = 'pending_verification')
  FROM public.profiles p
  WHERE p.id = auth.uid();
$$;

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND public.check_profile_self_update(
      role, is_verified, is_premium, approved_at, approved_by, rejected_at, rejected_by, account_status
    )
  );
