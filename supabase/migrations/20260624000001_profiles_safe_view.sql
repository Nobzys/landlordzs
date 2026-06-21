-- Migration: Fix #2 (+ #2b) from the trust-systems security audit —
-- eliminate exposure of sensitive profile fields BETWEEN AUTHENTICATED
-- USERS.
--
-- Fix #1 (20260623000001) made profiles row-visibility respect is_public,
-- but a row that *is* visible (public, or a row the caller doesn't own)
-- still exposed every column to any authenticated user querying the base
-- table directly — including email, phone_verified, expo_push_token, the
-- admin-audit columns (approved_at/by, rejected_at/by), and (added in #2b)
-- account_status, onboarding_completed, registration_completed_at. None
-- of these ten columns have a legitimate non-self, non-admin reader
-- anywhere in this codebase (verified by auditing every
-- `.from('profiles')` call site, twice — once for #2, once again for #2b
-- after the follow-up question about the three fields originally left
-- unmasked).
--
-- Fix: a security-barrier view, `profiles_safe`, that passes through the
-- remaining public columns untouched and masks the ten sensitive columns
-- to NULL unless the caller is the row owner or an admin. The view re-
-- asserts the exact same row-visibility rule as the base table's RLS
-- policy (is_public OR self OR admin) directly in its WHERE clause —
-- necessary because Postgres views run with the *view owner's* table
-- privileges by default, which would otherwise bypass RLS entirely for
-- every caller (confirmed empirically against local Supabase: omitting
-- this WHERE clause leaked private rows to anon). `security_invoker` is
-- deliberately left at its default (false): turning it on would require
-- the caller to hold the very column grants this view exists to avoid
-- granting, defeating the masking.
--
-- account_status/onboarding_completed/registration_completed_at were
-- initially left unmasked in #2 (dozens of self-only call sites read
-- account_status off the base table for the caller's own row, and these
-- three carry lower severity than email/phone_verified/expo_push_token/
-- admin-audit columns). Re-auditing found only ONE non-self, non-admin-
-- client read of any of the three in the whole codebase
-- (admin/properties/[id]/page.tsx's agent list, filtered by
-- account_status — now redirected to this view), so the original
-- deferral was overcautious; #2b closes it in the same view rather than
-- leaving it for a separate change.
--
-- `phone` and `role` remain broadly granted (unchanged from Fix #1) — both
-- are already shown on public profile pages and/or needed by existing
-- cross-user business logic (property contact info, review eligibility
-- checks), per the call-site audit.

DROP VIEW IF EXISTS public.profiles_safe;
CREATE VIEW public.profiles_safe
WITH (security_barrier = true)
AS
SELECT
  id, full_name, display_name, avatar_url, bio, city, phone, role,
  is_verified, is_premium, is_public, created_at, updated_at,
  CASE WHEN id = auth.uid() OR public.is_admin() THEN email                      ELSE NULL END AS email,
  CASE WHEN id = auth.uid() OR public.is_admin() THEN phone_verified             ELSE NULL END AS phone_verified,
  CASE WHEN id = auth.uid() OR public.is_admin() THEN expo_push_token            ELSE NULL END AS expo_push_token,
  CASE WHEN id = auth.uid() OR public.is_admin() THEN approved_at               ELSE NULL END AS approved_at,
  CASE WHEN id = auth.uid() OR public.is_admin() THEN approved_by               ELSE NULL END AS approved_by,
  CASE WHEN id = auth.uid() OR public.is_admin() THEN rejected_at               ELSE NULL END AS rejected_at,
  CASE WHEN id = auth.uid() OR public.is_admin() THEN rejected_by               ELSE NULL END AS rejected_by,
  CASE WHEN id = auth.uid() OR public.is_admin() THEN account_status            ELSE NULL END AS account_status,
  CASE WHEN id = auth.uid() OR public.is_admin() THEN onboarding_completed      ELSE NULL END AS onboarding_completed,
  CASE WHEN id = auth.uid() OR public.is_admin() THEN registration_completed_at ELSE NULL END AS registration_completed_at
FROM public.profiles
WHERE is_public = true OR id = auth.uid() OR public.is_admin();

GRANT SELECT ON public.profiles_safe TO anon, authenticated;

-- Column-level lockdown on the base table for `authenticated` (mirrors the
-- `anon` lockdown already applied in Fix #1): the ten sensitive columns
-- are removed entirely so the only way to read them at all is through the
-- view's masking logic above. Every other existing column stays granted —
-- this is a pure removal of unused privilege, not a new restriction on any
-- column any call site actually relies on for a self/role-based read.
REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT (
  id, full_name, display_name, avatar_url, bio, city, phone, role,
  is_verified, is_premium, is_public, created_at, updated_at
) ON public.profiles TO authenticated;
