-- Fix: 20260619000006_profiles_verified_at.sql redefined profiles_update_own
-- and regressed the null-safety fix from 20260618000004 — it pinned
-- approved_at/approved_by/rejected_at/rejected_by back to plain `=` and
-- added verified_at with plain `=` too. Per SQL three-valued logic,
-- `NULL = NULL` is UNKNOWN (not TRUE), so the WITH CHECK clause rejected
-- every self-update (e.g. updateBasicProfile) for any user who has never
-- been approved, rejected, or verified by an admin — i.e. most non-admin
-- users. Admin accounts were unaffected only because they also match the
-- separate, fully-permissive profiles_admin_all policy.
--
-- Switch all five nullable-column pins to `IS NOT DISTINCT FROM`, which
-- treats NULL = NULL as a match. role/is_verified/is_premium stay on `=`
-- since they are NOT NULL columns.

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id              = auth.uid()
    AND role        = (SELECT role        FROM public.profiles WHERE id = auth.uid())
    AND is_verified = (SELECT is_verified FROM public.profiles WHERE id = auth.uid())
    AND is_premium  = (SELECT is_premium  FROM public.profiles WHERE id = auth.uid())
    AND approved_at IS NOT DISTINCT FROM (SELECT approved_at FROM public.profiles WHERE id = auth.uid())
    AND approved_by IS NOT DISTINCT FROM (SELECT approved_by FROM public.profiles WHERE id = auth.uid())
    AND rejected_at IS NOT DISTINCT FROM (SELECT rejected_at FROM public.profiles WHERE id = auth.uid())
    AND rejected_by IS NOT DISTINCT FROM (SELECT rejected_by FROM public.profiles WHERE id = auth.uid())
    AND verified_at IS NOT DISTINCT FROM (SELECT verified_at FROM public.profiles WHERE id = auth.uid())
    AND (
      account_status = (SELECT account_status FROM public.profiles WHERE id = auth.uid())
      OR account_status = 'pending_verification'
    )
  );
