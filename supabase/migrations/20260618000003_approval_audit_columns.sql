-- Migration: approval audit trail for the existing account_status-based
-- approval workflow (adminApproveProfessional / adminRejectProfessional /
-- completeOnboarding in src/lib/actions/auth.ts). Purely additive — no
-- existing column, table, or data is touched.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS approved_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by  UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS rejected_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_by  UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS registration_completed_at TIMESTAMPTZ;

-- Extend profiles_update_own (originally hardened in
-- 20260613000003_fix_profiles_update_rls.sql) so the new approve/reject
-- audit columns are pinned to their previous value, same as role/
-- is_verified/is_premium. These must only ever be written by an admin via
-- the service-role client (createAdminClient(), which bypasses RLS).
-- registration_completed_at is intentionally left unrestricted — it is set
-- by completeOnboarding() using the user's own client and carries no
-- privilege implication.

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
    AND (
      account_status = (SELECT account_status FROM public.profiles WHERE id = auth.uid())
      OR account_status = 'pending_verification'
    )
  );
