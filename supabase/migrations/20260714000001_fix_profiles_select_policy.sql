-- Migration: 20260714000001 — Grant SELECT on profiles + restore missing RLS policies
--
-- PRIMARY ROOT CAUSE (confirmed via live DB inspection):
--   public.profiles has no SELECT privilege for the 'authenticated' or 'anon'
--   PostgreSQL roles. PostgreSQL privilege checks fire BEFORE RLS evaluation.
--   Without GRANT SELECT, every profile read by the application returns
--   "permission denied for table profiles" (error 42501) regardless of which
--   RLS policies exist. getServerProfile() catches the null result and synthesises
--   a buyer profile from auth.user_metadata, routing every user — including the
--   admin — to the buyer experience.
--
--   Confirmed via information_schema.role_table_grants: 'anon' and 'authenticated'
--   both have DELETE/INSERT/UPDATE/REFERENCES/TRIGGER/TRUNCATE but NOT SELECT.
--
-- SECONDARY ISSUE:
--   migration 20260610000016_rls_policies.sql attempted to create
--   profiles_select_all (USING true) but the entire file rolled back because
--   profiles_update_own (line 75) already existed and had no DROP IF EXISTS guard.
--   Later remote-only migrations added profiles_select_public and profiles_admin_all,
--   but profiles_select_all (USING true) was never committed.
--   Without it, when _getAccessToken() falls back to the sb_publishable_* anon key
--   (non-JWT), auth.uid() is NULL in PostgREST. profiles_select_public evaluates
--   (is_public = true OR NULL OR false) — only is_public=true rows survive. While
--   the admin's profile currently has is_public=true, this is fragile.
--
-- This migration is idempotent (GRANT IF NOT EXISTS behaviour; DROP IF EXISTS guards).

-- ── Layer 1: Grant SELECT privilege ─────────────────────────────────────────
-- Allows PostgREST to attempt the read; RLS then decides which rows are visible.
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;

-- ── Layer 2: Unconditional SELECT policy ─────────────────────────────────────
-- Ensures profile rows are returned even when auth.uid() is NULL (anon-key
-- fallback in _getAccessToken). The existing profiles_select_public policy
-- restricts to is_public=true for public access, but is_public is per-row;
-- profiles_select_all (USING true) guarantees own-profile reads always succeed.
-- This matches the intent of 20260610000016 line 74 that was never committed.
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
CREATE POLICY "profiles_select_all"
  ON public.profiles
  FOR SELECT
  USING (true);

-- ── Layer 3: Admin bypass policy ─────────────────────────────────────────────
-- Already present in the live DB (added by a remote-only migration) but
-- recreated here with a DROP IF EXISTS guard so the migration is idempotent
-- and the local files match the intended state.
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;
CREATE POLICY "profiles_admin_all"
  ON public.profiles
  FOR ALL
  USING (public.is_admin());
