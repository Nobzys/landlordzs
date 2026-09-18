-- Migration: Add available_from DATE to professional_profiles
--
-- Enables "This Week" and "This Month" availability filters on the
-- public Property Lawyers (and other professional) directory pages.
--
-- Design:
--   is_available BOOLEAN (existing) = is the professional available right now?
--   available_from DATE (new)       = earliest date they will next be available
--
-- Filter semantics:
--   "Available Now"  → is_available = true
--   "This Week"      → is_available = true
--                      OR available_from BETWEEN week_start AND week_end
--   "This Month"     → is_available = true
--                      OR available_from BETWEEN month_start AND month_end
--
-- Backward compatibility: all existing rows receive available_from = NULL,
-- meaning their availability is determined solely by is_available (unchanged).

ALTER TABLE public.professional_profiles
  ADD COLUMN IF NOT EXISTS available_from DATE;

COMMENT ON COLUMN public.professional_profiles.available_from IS
  'Earliest future date from which this professional will next be available. '
  'NULL = no known return date; use is_available for current status. '
  'Populated by the professional from their dashboard when they are currently busy.';

-- Sparse index — only non-null values participate in date-range queries
CREATE INDEX IF NOT EXISTS idx_prof_available_from
  ON public.professional_profiles (available_from)
  WHERE available_from IS NOT NULL;
