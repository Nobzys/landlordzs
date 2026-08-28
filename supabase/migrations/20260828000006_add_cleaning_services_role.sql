-- Phase 14.1: Add 'cleaning_services' to user_role and profession_type enums.
-- Cleaning services professionals share the existing professional_profiles table
-- (profession_type column) — no new profile table is created.
-- IF NOT EXISTS: safe to re-run; no-op if already present.

ALTER TYPE public.user_role     ADD VALUE IF NOT EXISTS 'cleaning_services';
ALTER TYPE public.profession_type ADD VALUE IF NOT EXISTS 'cleaning_services';
