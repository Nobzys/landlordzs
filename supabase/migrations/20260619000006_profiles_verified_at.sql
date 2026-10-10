-- Migration: profiles.verified_at — single timestamp admins/users can key
-- off to know when a verified badge was granted, instead of joining
-- kyc_records every time. Purely additive, alongside the existing
-- profiles.is_verified boolean.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- profiles_update_own (most recently redefined in
-- 20260618000003_approval_audit_columns.sql) pins privileged columns to
-- their existing value so only the service-role admin client can change
-- them. verified_at carries the same privilege implication as is_verified
-- and must be pinned the same way, or a user could set their own
-- verified_at via their own session.
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id              = auth.uid()
    AND role        = (SELECT role        FROM public.profiles WHERE id = auth.uid())
    AND is_verified = (SELECT is_verified FROM public.profiles WHERE id = auth.uid())
    AND is_premium  = (SELECT is_premium  FROM public.profiles WHERE id = auth.uid())
    AND approved_at = (SELECT approved_at FROM public.profiles WHERE id = auth.uid())
    AND approved_by = (SELECT approved_by FROM public.profiles WHERE id = auth.uid())
    AND rejected_at = (SELECT rejected_at FROM public.profiles WHERE id = auth.uid())
    AND rejected_by = (SELECT rejected_by FROM public.profiles WHERE id = auth.uid())
    AND verified_at = (SELECT verified_at FROM public.profiles WHERE id = auth.uid())
    AND (
      account_status = (SELECT account_status FROM public.profiles WHERE id = auth.uid())
      OR account_status = 'pending_verification'
    )
  );
