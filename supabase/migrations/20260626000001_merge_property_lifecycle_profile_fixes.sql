-- Migration: reconcile profiles_safe / profiles_update_own with two columns
-- introduced by the feature/property-lifecycle merge that didn't exist when
-- 20260624000001 (profiles_safe) and 20260625000001 (check_profile_self_update)
-- were written:
--
--   - verified_at (20260619000006_profiles_verified_at.sql): that same
--     migration extended profiles_update_own's WITH CHECK to pin it
--     alongside is_verified/role/is_premium so a user can't self-set it.
--     20260620000006 (the null-safety fix) re-pinned it the same way. Our
--     own profiles_update_own rewrite (20260625000001) replaced that whole
--     policy with a call to check_profile_self_update(), which has no
--     verified_at parameter — merging as-is would silently drop that
--     protection. Add it.
--   - profile_view_count (20260619000001_profile_view_count.sql): a public
--     metric, not sensitive — no self-promotion concern, just needs to be
--     selectable through profiles_safe like every other non-masked column.
--
-- Neither column is added to the masked/sensitive list: verified_at is
-- public-facing (parallel to the already-public is_verified flag — "verified
-- since <date>"), and profile_view_count is a plain view counter.

DROP VIEW IF EXISTS public.profiles_safe;
CREATE VIEW public.profiles_safe
WITH (security_barrier = true)
AS
SELECT
  id, full_name, display_name, avatar_url, bio, city, phone, role,
  is_verified, verified_at, profile_view_count, is_premium, is_public,
  created_at, updated_at,
  CASE WHEN id = auth.uid() OR public.is_admin() THEN email                      ELSE NULL END AS email,
  CASE WHEN id = auth.uid() OR public.is_admin() THEN phone_verified             ELSE NULL END AS phone_verified,
  CASE WHEN id = auth.uid() OR public.is_admin() THEN expo_push_token            ELSE NULL END AS expo_push_token,
  CASE WHEN id = auth.uid() OR public.is_admin() THEN approved_at               ELSE NULL END AS approved_at,
  CASE WHEN id = auth.uid() OR public.is_admin() THEN approved_by               ELSE NULL END AS approved_by,
  CASE WHEN id = auth.uid() OR public.is_admin() THEN rejected_at               ELSE NULL END AS rejected_at,
  CASE WHEN id = auth.uid() OR public.is_admin() THEN rejected_by               ELSE NULL END AS rejected_by,
  CASE WHEN id = auth.uid() OR public.is_admin() THEN account_status            ELSE NULL END AS account_status,
  CASE WHEN id = auth.uid() OR public.is_admin() THEN onboarding_completed      ELSE NULL END AS onboarding_completed,
  CASE WHEN id = auth.uid() OR public.is_admin() THEN registration_completed_at ELSE NULL END AS registration_completed_at
FROM public.profiles
WHERE is_public = true OR id = auth.uid() OR public.is_admin();

GRANT SELECT ON public.profiles_safe TO anon, authenticated;

REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT (
  id, full_name, display_name, avatar_url, bio, city, phone, role,
  is_verified, verified_at, profile_view_count, is_premium, is_public,
  created_at, updated_at
) ON public.profiles TO authenticated;

REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (
  id, full_name, display_name, avatar_url, bio, city, phone, role,
  is_verified, verified_at, profile_view_count, is_premium, is_public,
  onboarding_completed, created_at, updated_at
) ON public.profiles TO anon;

CREATE OR REPLACE FUNCTION public.check_profile_self_update(
  p_role            user_role,
  p_is_verified     boolean,
  p_is_premium      boolean,
  p_approved_at     timestamptz,
  p_approved_by     uuid,
  p_rejected_at     timestamptz,
  p_rejected_by     uuid,
  p_account_status  account_status,
  p_verified_at     timestamptz
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
    AND p_verified_at IS NOT DISTINCT FROM p.verified_at
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
      role, is_verified, is_premium, approved_at, approved_by, rejected_at, rejected_by, account_status, verified_at
    )
  );
