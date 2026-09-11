-- Migration: 20260911000003 — Add filterable type-specific attributes to rental_listings
--
-- Architecture: Flat columns (not JSONB) — all 6 fields are active sidebar filter
-- controls. Flat columns use .eq() consistent with the existing type/city/condition
-- filter pattern and are B-tree indexable.
--
-- Equipment-specific:
--   with_operator   BOOLEAN — operator included in daily rate
--
-- Vehicle-specific:
--   with_driver     BOOLEAN — chauffeur/driver service included
--   has_ac          BOOLEAN — air conditioning fitted
--   has_gps         BOOLEAN — GPS tracker fitted
--   has_child_seat  BOOLEAN — child seat available
--   fuel_type       TEXT    — 'petrol'|'diesel'|'electric'|'hybrid' (nullable)
--
-- Defaults: BOOLEAN columns default FALSE — safe for all existing rows, no backfill.
-- fuel_type is nullable TEXT — NULL means "not specified / not applicable".
-- Existing seed rows (20 listings) receive FALSE / NULL — correct default behaviour.
-- RLS: unchanged — existing row-level policies (rentlist_select / rentlist_insert /
--      rentlist_update) are column-agnostic and cover the new columns automatically.
--
-- Idempotency: Each ALTER TABLE is guarded by an information_schema existence check.
--              Indexes use CREATE INDEX IF NOT EXISTS.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'rental_listings' AND column_name = 'with_operator'
  ) THEN
    ALTER TABLE public.rental_listings ADD COLUMN with_operator  BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'rental_listings' AND column_name = 'with_driver'
  ) THEN
    ALTER TABLE public.rental_listings ADD COLUMN with_driver    BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'rental_listings' AND column_name = 'has_ac'
  ) THEN
    ALTER TABLE public.rental_listings ADD COLUMN has_ac         BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'rental_listings' AND column_name = 'has_gps'
  ) THEN
    ALTER TABLE public.rental_listings ADD COLUMN has_gps        BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'rental_listings' AND column_name = 'has_child_seat'
  ) THEN
    ALTER TABLE public.rental_listings ADD COLUMN has_child_seat BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'rental_listings' AND column_name = 'fuel_type'
  ) THEN
    ALTER TABLE public.rental_listings ADD COLUMN fuel_type      TEXT;
  END IF;
END $$;

-- Partial indexes — scoped to the type and the TRUE/non-null case to keep them small
CREATE INDEX IF NOT EXISTS idx_rental_with_operator
  ON public.rental_listings(with_operator)  WHERE type = 'equipment' AND with_operator  = TRUE;
CREATE INDEX IF NOT EXISTS idx_rental_with_driver
  ON public.rental_listings(with_driver)    WHERE type = 'vehicle'   AND with_driver    = TRUE;
CREATE INDEX IF NOT EXISTS idx_rental_has_ac
  ON public.rental_listings(has_ac)         WHERE type = 'vehicle'   AND has_ac         = TRUE;
CREATE INDEX IF NOT EXISTS idx_rental_has_gps
  ON public.rental_listings(has_gps)        WHERE type = 'vehicle'   AND has_gps        = TRUE;
CREATE INDEX IF NOT EXISTS idx_rental_has_child_seat
  ON public.rental_listings(has_child_seat) WHERE type = 'vehicle'   AND has_child_seat = TRUE;
CREATE INDEX IF NOT EXISTS idx_rental_fuel_type
  ON public.rental_listings(fuel_type)      WHERE fuel_type IS NOT NULL;
