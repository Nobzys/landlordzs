-- Migration: Profile visibility toggle for public profile pages (Phase 3 — Trust Systems)
-- Additive only: one column, default TRUE preserves today's implicit-public
-- behaviour for every existing row. No RLS change — profiles_select_all
-- already allows public SELECT; visibility is enforced at the route layer
-- (same defence-in-depth pattern already used for property status in
-- src/app/(marketing)/properties/[id]/page.tsx).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT TRUE;
