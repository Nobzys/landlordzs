-- ─────────────────────────────────────────────────────────────────────────────
-- LANDLORDZS — profiles table (corrected for existing enum types)
-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor → New query)
--
-- Assumes the following enum types already exist in your database:
--   user_role      : admin | buyer | seller | agent | vendor |
--                    contractor | engineer | architect | lawyer
--   account_status : active | suspended | banned | pending_verification
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Table ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
  id                   UUID           PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                TEXT           NOT NULL,
  full_name            TEXT,
  display_name         TEXT,
  role                 user_role      NOT NULL DEFAULT 'buyer',
  city                 TEXT,
  phone                TEXT,
  phone_verified       BOOLEAN        NOT NULL DEFAULT FALSE,
  avatar_url           TEXT,
  bio                  TEXT,
  is_verified          BOOLEAN        NOT NULL DEFAULT FALSE,
  is_premium           BOOLEAN        NOT NULL DEFAULT FALSE,
  account_status       account_status NOT NULL DEFAULT 'active',
  onboarding_completed BOOLEAN        NOT NULL DEFAULT FALSE,
  expo_push_token      TEXT,
  created_at           TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- 2. updated_at trigger ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3. Auto-create profile on new auth.users row ────────────────────────────────
-- Pulls full_name and role from the metadata passed to supabase.auth.signUp().
-- The ::user_role cast converts the text value from JSON metadata to the enum.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'buyer')::user_role
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Backfill any existing auth users who have no profile row ─────────────────
-- The ::user_role cast is required here too — the JSON operator ->> returns text.

INSERT INTO public.profiles (id, email, full_name, role)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', ''),
  COALESCE(u.raw_user_meta_data->>'role', 'buyer')::user_role
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 5. Row-Level Security ───────────────────────────────────────────────────────

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
