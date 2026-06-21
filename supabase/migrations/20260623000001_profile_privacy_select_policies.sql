-- Migration: Fix #1 from the trust-systems security audit — eliminate
-- unintended profile data exposure.
--
-- Root cause: profiles_select_all / agent_prof_select / vendor_select /
-- prof_select / portitem_select / portimg_select were all defined as
-- `USING (true)` (20260610000016_rls_policies.sql) — every row, every
-- column, readable by anyone (including the public anon key), regardless
-- of the is_public toggle added in 20260618000005_profile_visibility.sql.
-- That toggle only ever gated the app's own routes
-- (src/lib/data/publicProfile.ts) — it had no effect at the database
-- layer, so a private profile's full row (including profiles.email,
-- phone_verified, expo_push_token, approved_by/rejected_by,
-- account_status, and vendor_profiles.tax_id/business_reg/email/phone)
-- remained fetchable directly via PostgREST.
--
-- Fix, in two parts:
--   1. Row policies: SELECT now requires is_public = true (joined back to
--      the owning profile for the five extension/portfolio tables), OR the
--      caller is the row's own owner, OR the caller is an admin. is_public
--      defaults TRUE (existing column, no schema change), so every row
--      that hasn't explicitly opted into privacy keeps today's exact
--      behaviour — fully backward compatible.
--   2. Column privileges: the public anon role (no session at all — the
--      lowest-effort scraping vector, and the one case existing app code
--      never needs) loses SELECT on profiles columns that no anonymous
--      code path reads today (verified by auditing every `.from('profiles')`
--      call site): email, phone_verified, expo_push_token, approved_at,
--      approved_by, rejected_at, rejected_by, registration_completed_at,
--      account_status. `authenticated` keeps its existing column grants
--      untouched — self-profile reads (getServerProfile et al. use
--      `select('*')` while authenticated) and admin/service-role paths are
--      unaffected.
--
-- Out of scope (left for a follow-up, since it requires call-site changes
-- this task's constraints (one migration, no schema redesign, no
-- additional features) rule out): fully hiding those same sensitive
-- columns from one *authenticated* user reading another's *public*
-- profile. Postgres privilege grants are role-wide, not row-aware, so
-- closing that residual gap needs a masking view (or equivalent) plus
-- updating every call site that currently reads `profiles` directly —
-- a larger, separate change.

-- ─── profiles ───────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
CREATE POLICY "profiles_select_public" ON public.profiles
  FOR SELECT USING (
    is_public = true
    OR id = auth.uid()
    OR public.is_admin()
  );

REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (
  id, full_name, display_name, avatar_url, bio, city, phone, role,
  is_verified, is_premium, is_public, onboarding_completed,
  created_at, updated_at
) ON public.profiles TO anon;

-- ─── agent_profiles ─────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "agent_prof_select" ON public.agent_profiles;
CREATE POLICY "agent_prof_select" ON public.agent_profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = agent_profiles.id AND p.is_public)
    OR agent_profiles.id = auth.uid()
    OR public.is_admin()
  );

-- ─── vendor_profiles ────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "vendor_select" ON public.vendor_profiles;
CREATE POLICY "vendor_select" ON public.vendor_profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = vendor_profiles.id AND p.is_public)
    OR vendor_profiles.id = auth.uid()
    OR public.is_admin()
  );

-- ─── professional_profiles ──────────────────────────────────────────────────

DROP POLICY IF EXISTS "prof_select" ON public.professional_profiles;
CREATE POLICY "prof_select" ON public.professional_profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = professional_profiles.id AND p.is_public)
    OR professional_profiles.id = auth.uid()
    OR public.is_admin()
  );

-- ─── portfolio_items (owner is professional_profiles.id == profiles.id) ────

DROP POLICY IF EXISTS "portitem_select" ON public.portfolio_items;
CREATE POLICY "portitem_select" ON public.portfolio_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = portfolio_items.professional_id AND p.is_public)
    OR portfolio_items.professional_id = auth.uid()
    OR public.is_admin()
  );

-- ─── portfolio_images (one level further: image -> item -> professional) ──

DROP POLICY IF EXISTS "portimg_select" ON public.portfolio_images;
CREATE POLICY "portimg_select" ON public.portfolio_images
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.portfolio_items pi
      JOIN public.profiles p ON p.id = pi.professional_id
      WHERE pi.id = portfolio_images.portfolio_id AND p.is_public
    )
    OR EXISTS (
      SELECT 1 FROM public.portfolio_items pi
      WHERE pi.id = portfolio_images.portfolio_id AND pi.professional_id = auth.uid()
    )
    OR public.is_admin()
  );
