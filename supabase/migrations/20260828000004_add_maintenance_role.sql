-- Phase 13.1: Add 'maintenance' to profession_type enum and remove the now-redundant
-- inline CHECK constraint on professional_profiles.
-- NOTE: ALTER TYPE ADD VALUE cannot be used alongside a constraint that references
-- the new value in the same transaction (PostgreSQL SQLSTATE 55P04). The explicit
-- CHECK constraint is redundant — the enum type itself enforces allowed values —
-- so it is dropped without recreation. The enum is the sole constraint.

-- 1. Extend the enum (IF NOT EXISTS: safe to re-run; value already added in prior attempt)
ALTER TYPE public.profession_type ADD VALUE IF NOT EXISTS 'maintenance';

-- 2. Drop the redundant CHECK constraint — enum type enforces valid values
ALTER TABLE public.professional_profiles
  DROP CONSTRAINT IF EXISTS professional_profiles_profession_type_check;
