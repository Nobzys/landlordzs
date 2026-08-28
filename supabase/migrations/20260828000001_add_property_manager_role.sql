-- Migration: add property_manager to user_role enum and create profile table
-- WARNING: ALTER TYPE ADD VALUE is irreversible without a DB dump/restore.

-- Step 1: extend the enum
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'property_manager';

-- Step 2: property manager profile table
CREATE TABLE IF NOT EXISTS public.property_manager_profiles (
  id                       uuid        PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  license_number           text,
  managed_properties_count integer     NOT NULL DEFAULT 0,
  rating_avg               numeric,
  rating_count             integer,
  created_at               timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.property_manager_profiles ENABLE ROW LEVEL SECURITY;

-- own row + admin read
CREATE POLICY "pm_prof_select"
  ON public.property_manager_profiles
  FOR SELECT
  USING (id = auth.uid() OR public.is_admin());

-- insert own row (onboarding)
CREATE POLICY "pm_prof_insert"
  ON public.property_manager_profiles
  FOR INSERT
  WITH CHECK (id = auth.uid());

-- update own row
CREATE POLICY "pm_prof_update"
  ON public.property_manager_profiles
  FOR UPDATE
  USING  (id = auth.uid())
  WITH CHECK (id = auth.uid());
