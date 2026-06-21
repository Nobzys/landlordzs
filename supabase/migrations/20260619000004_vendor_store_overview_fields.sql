-- Migration: store overview fields for the vendor dashboard (Issue 3 —
-- Material Vendor Dashboard). The "Store Overview" page must show delivery
-- areas and business hours; vendor_profiles has no equivalent columns today.
-- Additive only: two nullable columns, no data migration needed.

ALTER TABLE public.vendor_profiles
  ADD COLUMN IF NOT EXISTS delivery_areas public.cameroon_city[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS business_hours TEXT;

SELECT pg_notify('pgrst', 'reload schema');
