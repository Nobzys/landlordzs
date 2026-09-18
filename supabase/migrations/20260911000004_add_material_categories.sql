-- Migration: 20260911000004 — Add missing Building Materials product categories
--
-- Adds two categories that appear in the homepage and materials reference
-- but were absent from the original seed:
--   • Sand & Gravel  (sort_order 13)
--   • Solar Equipment (sort_order 14)
--
-- Uses ON CONFLICT (slug) DO NOTHING for idempotency.

INSERT INTO public.product_categories (name, name_fr, slug, sort_order)
VALUES
  ('Sand & Gravel',    'Sable & Gravier',           'sand-gravel',     13),
  ('Solar Equipment',  'Équipements Solaires',       'solar-equipment', 14)
ON CONFLICT (slug) DO NOTHING;
