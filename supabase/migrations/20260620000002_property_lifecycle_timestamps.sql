-- Migration: lifecycle timestamps for properties.
-- featured_until / rented_at / deleted_at are net-new. sold_at already
-- exists (added in 20260610000006_properties.sql) but is currently never
-- written by any action — included here as IF NOT EXISTS for safety/
-- idempotency only; this statement no-ops for that column.
-- Purely additive: no existing column is altered, renamed, or dropped.

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS featured_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sold_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rented_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_at      TIMESTAMPTZ;
