-- Migration: Public Profiles (Trust Systems phase). Codifies columns that
-- already exist on the hosted project (added outside migration tracking —
-- confirmed present on every existing row: slug, cover_url, company_name,
-- years_experience, specialties, service_areas, website_url, kyc_level,
-- email_visibility, phone_visibility) so local matches hosted, and wires
-- them into profiles_safe / column grants. ADD COLUMN IF NOT EXISTS is a
-- no-op on hosted (columns already there) and creates them locally.
--
-- email_visibility/phone_visibility gating: applied here only for EMAIL,
-- since profiles_safe.email was already masked to self/admin and this adds
-- a new opt-in escape hatch (default false — zero behavior change for any
-- existing row). phone is deliberately NOT changed here: it has always
-- been a plain passthrough column (relied on by the existing property
-- contact-info feature, which must keep working for every listing
-- regardless of any new profile-level toggle), so phone_visibility is
-- enforced at the application layer for the new /u/[slug] page only,
-- not by changing this shared view.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS slug              TEXT,
  ADD COLUMN IF NOT EXISTS cover_url         TEXT,
  ADD COLUMN IF NOT EXISTS company_name      TEXT,
  ADD COLUMN IF NOT EXISTS years_experience  INT,
  ADD COLUMN IF NOT EXISTS specialties       TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS service_areas      TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS website_url       TEXT,
  ADD COLUMN IF NOT EXISTS kyc_level         TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS email_visibility  BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS phone_visibility  BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_slug_key ON public.profiles(slug) WHERE slug IS NOT NULL;

DROP VIEW IF EXISTS public.profiles_safe;
CREATE VIEW public.profiles_safe
WITH (security_barrier = true)
AS
SELECT
  id, full_name, display_name, avatar_url, bio, city, phone, role,
  is_verified, verified_at, profile_view_count, is_premium, is_public,
  created_at, updated_at,
  slug, cover_url, company_name, years_experience, specialties,
  service_areas, website_url, kyc_level, email_visibility, phone_visibility,
  CASE WHEN id = auth.uid() OR public.is_admin() OR email_visibility THEN email ELSE NULL END AS email,
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
  slug, cover_url, company_name, years_experience, specialties,
  service_areas, website_url, kyc_level, email_visibility, phone_visibility,
  created_at, updated_at
) ON public.profiles TO authenticated;

REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (
  id, full_name, display_name, avatar_url, bio, city, phone, role,
  is_verified, verified_at, profile_view_count, is_premium, is_public,
  slug, cover_url, company_name, years_experience, specialties,
  service_areas, website_url, kyc_level, email_visibility, phone_visibility,
  onboarding_completed, created_at, updated_at
) ON public.profiles TO anon;
