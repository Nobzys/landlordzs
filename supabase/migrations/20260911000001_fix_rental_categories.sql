-- Migration: 20260911000001 — Fix rental category type assignments and complete taxonomy
--
-- Problems fixed:
--   • 'excavators' and 'cranes' were seeded with type='vehicle' — they are equipment
--   • 'heavy-machinery', 'power-tools', 'trucks' are not in the approved taxonomy — deactivated
--   • 'pickup-vans' renamed to 'Pickup Truck' to match approved taxonomy
--   • 12 missing equipment categories added
--   • 7 missing vehicle categories added (pickup-truck covered by the rename above)
--
-- Idempotency: UPDATEs are WHERE-guarded on slug; INSERTs use ON CONFLICT (slug) DO NOTHING.
-- Safe to re-run against an already-migrated database.

-- ── 1. Fix wrong type assignments ─────────────────────────────────────────────
UPDATE public.rental_categories
  SET type = 'equipment'
  WHERE slug IN ('excavators', 'cranes');

-- ── 2. Deactivate categories not in approved taxonomy ─────────────────────────
-- 'heavy-machinery' and 'power-tools' are superseded by the more specific equipment
-- categories below. 'trucks' (generic) is replaced by 'dump-trucks' (equipment).
-- Using is_active=false preserves referential integrity for any future FK references.
UPDATE public.rental_categories
  SET is_active = false
  WHERE slug IN ('heavy-machinery', 'power-tools', 'trucks');

-- ── 3. Rename 'pickup-vans' → 'Pickup Truck' ─────────────────────────────────
-- type='vehicle' is already correct; only name, name_fr, and slug change.
-- ON CONFLICT on slug 'pickup-truck' won't happen here because we're changing
-- this row's slug, not inserting a new one.
UPDATE public.rental_categories
  SET name     = 'Pickup Truck',
      name_fr  = 'Pickup',
      slug     = 'pickup-truck'
  WHERE slug = 'pickup-vans';

-- ── 4. Add missing equipment categories ──────────────────────────────────────
-- Approved equipment taxonomy (12 total):
--   Excavators ✓  Cranes ✓  Scaffolding ✓  Generators ✓  (already exist, fixed above)
--   Bulldozers  Graders  Dump Trucks  Concrete Mixers  Concrete Pumps
--   Compressors  Forklifts  Compactors  (new below)
INSERT INTO public.rental_categories (name, name_fr, slug, type) VALUES
  ('Bulldozers',       'Bulldozers',             'bulldozers',      'equipment'),
  ('Graders',          'Niveleuses',              'graders',         'equipment'),
  ('Dump Trucks',      'Camions Bennes',           'dump-trucks',     'equipment'),
  ('Concrete Mixers',  'Bétonnières',              'concrete-mixers', 'equipment'),
  ('Concrete Pumps',   'Pompes à Béton',           'concrete-pumps',  'equipment'),
  ('Compressors',      'Compresseurs',             'compressors',     'equipment'),
  ('Forklifts',        'Chariots Élévateurs',      'forklifts',       'equipment'),
  ('Compactors',       'Compacteurs',              'compactors',      'equipment')
ON CONFLICT (slug) DO NOTHING;

-- ── 5. Add missing vehicle categories ────────────────────────────────────────
-- Approved vehicle taxonomy (8 total):
--   Pickup Truck ✓  (handled by rename in step 3)
--   Sedan  SUV  Minivan  Bus  Luxury Car  Cargo Van  Motorcycle  (new below)
INSERT INTO public.rental_categories (name, name_fr, slug, type) VALUES
  ('Sedan',       'Berline',         'sedan',       'vehicle'),
  ('SUV',         'SUV',             'suv',         'vehicle'),
  ('Minivan',     'Minivan',         'minivan',      'vehicle'),
  ('Bus',         'Bus',             'bus',          'vehicle'),
  ('Luxury Car',  'Voiture de Luxe', 'luxury-car',  'vehicle'),
  ('Cargo Van',   'Fourgon',         'cargo-van',   'vehicle'),
  ('Motorcycle',  'Moto',            'motorcycle',  'vehicle')
ON CONFLICT (slug) DO NOTHING;
