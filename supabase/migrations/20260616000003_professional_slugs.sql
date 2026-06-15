-- Migration: Professional Slugs + Public Badge RPC
-- Additive-only. Adds slug column to profiles, auto-generates slugs,
-- and creates SECURITY DEFINER functions for public badge reads.
--
-- Why SECURITY DEFINER functions:
--   verification_requests RLS allows only user_id = auth.uid() OR admin.
--   Public profile pages need badge status without weakening that policy.
--   These functions return ONLY status (no documents, notes, reviewer info).

-- ─── 1. Add slug column ───────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS slug TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_slug
  ON public.profiles(slug)
  WHERE slug IS NOT NULL;

-- ─── 2. Slug generation function ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.generate_profile_slug(
  p_full_name    TEXT,
  p_display_name TEXT,
  p_email        TEXT,
  p_id           UUID
) RETURNS TEXT
LANGUAGE sql IMMUTABLE
AS $$
  SELECT
    regexp_replace(
      lower(
        regexp_replace(
          COALESCE(
            NULLIF(trim(p_full_name),    ''),
            NULLIF(trim(p_display_name), ''),
            split_part(COALESCE(p_email, ''), '@', 1),
            'user'
          ),
          '[^a-zA-Z0-9\s]', '', 'g'
        )
      ),
      '\s+', '-', 'g'
    ) || '-' || substr(p_id::text, 1, 8)
$$;

-- ─── 3. Trigger: auto-set slug on INSERT ─────────────────────────────────────

CREATE OR REPLACE FUNCTION public.trigger_set_profile_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.slug IS NULL THEN
    NEW.slug := public.generate_profile_slug(
      NEW.full_name, NEW.display_name, NEW.email, NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  CREATE TRIGGER set_profile_slug
    BEFORE INSERT ON public.profiles
    FOR EACH ROW
    WHEN (NEW.slug IS NULL)
    EXECUTE FUNCTION public.trigger_set_profile_slug();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 4. Backfill existing rows ────────────────────────────────────────────────

UPDATE public.profiles
SET slug = public.generate_profile_slug(full_name, display_name, email, id)
WHERE slug IS NULL;

-- ─── 5. Single-user badge status (for individual profile pages) ───────────────
-- Returns 'approved', 'under_review', or 'expired' — never 'rejected' or 'pending'.
-- Returns NULL when no qualifying row exists (no badge shown).

CREATE OR REPLACE FUNCTION public.get_professional_badge_status(p_user_id UUID)
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT status::TEXT
  FROM verification_requests
  WHERE user_id = p_user_id
    AND verification_type = 'identity'
    AND status IN ('approved', 'under_review', 'expired')
  ORDER BY submitted_at DESC NULLS LAST
  LIMIT 1;
$$;

-- ─── 6. Bulk badge statuses (for list/grid pages) ────────────────────────────
-- Accepts an array of user_ids, returns one row per user with their best status.
-- Ordered by: approved > under_review > expired (most positive status first).

CREATE OR REPLACE FUNCTION public.get_professional_badges(p_user_ids UUID[])
RETURNS TABLE(user_id UUID, status TEXT)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT ON (vr.user_id)
    vr.user_id,
    vr.status::TEXT
  FROM verification_requests vr
  WHERE vr.user_id = ANY(p_user_ids)
    AND vr.verification_type = 'identity'
    AND vr.status IN ('approved', 'under_review', 'expired')
  ORDER BY
    vr.user_id,
    CASE vr.status
      WHEN 'approved'     THEN 1
      WHEN 'under_review' THEN 2
      WHEN 'expired'      THEN 3
    END,
    vr.submitted_at DESC NULLS LAST;
$$;
