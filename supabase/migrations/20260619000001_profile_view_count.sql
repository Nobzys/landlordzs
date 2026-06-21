-- Migration: profile view counter for trust/metrics dashboards.
-- Additive only: new column with a default, new SECURITY DEFINER function.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_view_count INT NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.increment_profile_views(profile_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles SET profile_view_count = profile_view_count + 1 WHERE id = profile_id;
$$;

GRANT EXECUTE ON FUNCTION public.increment_profile_views(UUID) TO authenticated, anon;
