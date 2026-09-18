-- Migration: Add availability_status to professional_profiles
--
-- Adds an explicit 4-state availability that the professional sets from
-- their dashboard, replacing the blunt is_available boolean toggle.
--
-- States:
--   now        = currently accepting new clients
--   week       = available during the current calendar week
--   month      = available during the current calendar month
--   unavailable = not currently accepting clients
--
-- is_available is kept in sync (true for now/week/month, false for unavailable)
-- so that any existing code that reads is_available continues to work correctly.
--
-- Backward compat: existing rows are initialised from is_available.

ALTER TABLE public.professional_profiles
  ADD COLUMN IF NOT EXISTS availability_status TEXT NOT NULL DEFAULT 'now'
  CHECK (availability_status IN ('now', 'week', 'month', 'unavailable'));

-- Initialise from the existing is_available flag so no data is lost
UPDATE public.professional_profiles
  SET availability_status = CASE
    WHEN is_available THEN 'now'
    ELSE 'unavailable'
  END;

CREATE INDEX IF NOT EXISTS idx_prof_availability_status
  ON public.professional_profiles (availability_status);

COMMENT ON COLUMN public.professional_profiles.availability_status IS
  'Explicit availability window chosen by the professional from their dashboard.
   now        = currently available
   week       = available this calendar week
   month      = available this calendar month
   unavailable = not accepting clients (excluded from all availability filters)';
