-- Migration: 0020 — Add onboarding + push token columns to profiles
-- Safe: uses ADD COLUMN IF NOT EXISTS; idempotent

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed  BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS expo_push_token       TEXT,
  ADD COLUMN IF NOT EXISTS phone_verified        BOOLEAN     NOT NULL DEFAULT FALSE;

-- Index for onboarding funnel queries (e.g. incomplete onboarding admin dashboard)
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding
  ON public.profiles (onboarding_completed)
  WHERE onboarding_completed = FALSE;

-- Backfill: mark existing seeded users as onboarded
-- (only the admin and agent seeded in seed.sql need full onboarding)
UPDATE public.profiles
SET    onboarding_completed = TRUE
WHERE  role = 'admin'
AND    full_name IS NOT NULL;
