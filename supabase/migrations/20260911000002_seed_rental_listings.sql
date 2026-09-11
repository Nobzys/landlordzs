-- Migration: 20260911000002 — Seed development/test rental listings
--
-- PURPOSE: Dev fixture data only. These listings exist so that /rentals, /rentals?type=equipment,
-- and /rentals?type=vehicle render real cards instead of the empty-state message during
-- development. They are NOT real marketplace inventory and NOT real verified owners.
--
-- DEV SEED OWNER:
--   UUID  : 00000000-0000-0000-0000-000000000099
--   Email : dev-seed@landlordzs.internal   (unreachable address — cannot log in)
--   Role  : seller
--
-- LISTINGS: 10 equipment + 10 vehicle = 20 total
--   Equipment pages: 2  (9 on page 1, 1 on page 2)
--   Vehicle pages  : 2  (9 on page 1, 1 on page 2)
--   Combined pages : 3  (9, 9, 2)
--
-- IDEMPOTENCY: auth.users and profiles inserts use ON CONFLICT (id) DO NOTHING.
-- The listings block is wrapped in a guard: skipped if the seed owner already has listings.

-- ── 1. Dev seed auth user (no password — cannot log in) ───────────────────────
INSERT INTO auth.users (
  id, aud, role, email,
  encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token,
  email_change_token_new, email_change
)
VALUES (
  '00000000-0000-0000-0000-000000000099',
  'authenticated', 'authenticated',
  'dev-seed@landlordzs.internal',
  '',  -- no password; this account cannot authenticate
  NOW(), NOW(), NOW(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  '', '', '', ''
)
ON CONFLICT (id) DO NOTHING;

-- ── 2. Dev seed profile ───────────────────────────────────────────────────────
INSERT INTO public.profiles (id, email, full_name, role, account_status)
VALUES (
  '00000000-0000-0000-0000-000000000099',
  'dev-seed@landlordzs.internal',
  'Dev Seed Owner',
  'seller'::public.user_role,
  'active'::public.account_status
)
ON CONFLICT (id) DO NOTHING;

-- ── 3. Dev rental listings ────────────────────────────────────────────────────
-- Guard: skip entirely if seed owner already has listings (idempotent re-run safety)
DO $$
DECLARE
  o   UUID := '00000000-0000-0000-0000-000000000099';

  -- Equipment categories
  c_excavators     UUID;
  c_bulldozers     UUID;
  c_graders        UUID;
  c_dump_trucks    UUID;
  c_cranes         UUID;
  c_concrete_pumps UUID;
  c_generators     UUID;
  c_scaffolding    UUID;
  c_forklifts      UUID;
  c_compactors     UUID;

  -- Vehicle categories
  c_sedan       UUID;
  c_suv         UUID;
  c_pickup      UUID;
  c_luxury      UUID;
  c_minivan     UUID;
  c_bus         UUID;
  c_motorcycle  UUID;
  c_cargo_van   UUID;

BEGIN
  -- Skip if seed listings already exist
  IF EXISTS (SELECT 1 FROM public.rental_listings WHERE owner_id = o) THEN
    RETURN;
  END IF;

  -- Resolve category IDs by slug
  SELECT id INTO c_excavators     FROM public.rental_categories WHERE slug = 'excavators';
  SELECT id INTO c_bulldozers     FROM public.rental_categories WHERE slug = 'bulldozers';
  SELECT id INTO c_graders        FROM public.rental_categories WHERE slug = 'graders';
  SELECT id INTO c_dump_trucks    FROM public.rental_categories WHERE slug = 'dump-trucks';
  SELECT id INTO c_cranes         FROM public.rental_categories WHERE slug = 'cranes';
  SELECT id INTO c_concrete_pumps FROM public.rental_categories WHERE slug = 'concrete-pumps';
  SELECT id INTO c_generators     FROM public.rental_categories WHERE slug = 'generators';
  SELECT id INTO c_scaffolding    FROM public.rental_categories WHERE slug = 'scaffolding';
  SELECT id INTO c_forklifts      FROM public.rental_categories WHERE slug = 'forklifts';
  SELECT id INTO c_compactors     FROM public.rental_categories WHERE slug = 'compactors';

  SELECT id INTO c_sedan      FROM public.rental_categories WHERE slug = 'sedan';
  SELECT id INTO c_suv        FROM public.rental_categories WHERE slug = 'suv';
  SELECT id INTO c_pickup     FROM public.rental_categories WHERE slug = 'pickup-truck';
  SELECT id INTO c_luxury     FROM public.rental_categories WHERE slug = 'luxury-car';
  SELECT id INTO c_minivan    FROM public.rental_categories WHERE slug = 'minivan';
  SELECT id INTO c_bus        FROM public.rental_categories WHERE slug = 'bus';
  SELECT id INTO c_motorcycle FROM public.rental_categories WHERE slug = 'motorcycle';
  SELECT id INTO c_cargo_van  FROM public.rental_categories WHERE slug = 'cargo-van';

  -- ── Equipment listings (10) ─────────────────────────────────────────────────
  INSERT INTO public.rental_listings (
    owner_id, category_id, type,
    name, description,
    make, model_name, year,
    condition, daily_rate, weekly_rate, monthly_rate,
    city, min_rental_days, is_available, is_featured
  ) VALUES

    -- 1. Excavator
    ( o, c_excavators, 'equipment',
      'CAT 320GC Hydraulic Excavator',
      'Heavy-duty 20-tonne hydraulic excavator. Well-maintained, suitable for excavation, trenching, and demolition. Operator available on request.',
      'Caterpillar', '320GC', 2019,
      'good', 120000, 750000, 2800000,
      'douala', 1, true, true ),

    -- 2. Bulldozer
    ( o, c_bulldozers, 'equipment',
      'Komatsu D65-18 Crawler Bulldozer',
      'Medium dozer, ideal for land clearing, grading, and earthmoving. GPS-ready blade. Available with experienced operator.',
      'Komatsu', 'D65-18', 2020,
      'excellent', 150000, 950000, 3500000,
      'yaounde', 1, true, true ),

    -- 3. Grader
    ( o, c_graders, 'equipment',
      'Champion 730A Motor Grader',
      'Versatile 13-tonne motor grader for road grading, levelling, and fine grading operations. Joystick controls.',
      'Champion', '730A', 2018,
      'good', 125000, 800000, 3000000,
      'bafoussam', 1, true, false ),

    -- 4. Dump Truck
    ( o, c_dump_trucks, 'equipment',
      'Volvo A30G Articulated Dump Truck',
      '28-tonne payload articulated hauler. Ideal for quarry, mining, and large earthwork projects. Strong off-road capability.',
      'Volvo', 'A30G', 2019,
      'good', 75000, 480000, 1800000,
      'douala', 1, true, false ),

    -- 5. Crane
    ( o, c_cranes, 'equipment',
      'Liebherr LTM 1090 Mobile Crane (90t)',
      '90-tonne capacity all-terrain mobile crane. Suitable for heavy lifts on construction and industrial sites. Includes certified operator.',
      'Liebherr', 'LTM 1090', 2021,
      'excellent', 200000, 1300000, 5000000,
      'yaounde', 1, true, true ),

    -- 6. Concrete Pump
    ( o, c_concrete_pumps, 'equipment',
      'Putzmeister M52-5 Truck-Mounted Concrete Pump',
      '52-metre reach concrete pump mounted on truck. High output, suitable for high-rise and large slab pours.',
      'Putzmeister', 'M52-5', 2020,
      'good', 90000, 570000, 2100000,
      'douala', 1, true, false ),

    -- 7. Generator
    ( o, c_generators, 'equipment',
      'Perkins 250kVA Diesel Generator',
      'Soundproofed 250kVA generator. Suitable for construction sites, events, and emergency power. Includes ATS panel.',
      'Perkins', '250kVA', 2022,
      'excellent', 22000, 140000, 520000,
      'buea', 1, true, false ),

    -- 8. Scaffolding
    ( o, c_scaffolding, 'equipment',
      'Steel Ringlock Scaffolding Set — 100 m²',
      'Complete heavy-duty ringlock scaffolding system covering 100 m². Includes ledgers, standards, base plates, and guardrails. Delivery available in Douala.',
      NULL, NULL, NULL,
      'good', 12000, 75000, 280000,
      'douala', 3, true, false ),

    -- 9. Forklift
    ( o, c_forklifts, 'equipment',
      'Toyota 8FD30 Diesel Forklift 3T',
      '3-tonne capacity diesel forklift. 3-metre lift height. Suitable for warehouse, port, and construction logistics.',
      'Toyota', '8FD30', 2021,
      'excellent', 40000, 250000, 950000,
      'yaounde', 1, true, false ),

    -- 10. Compactor
    ( o, c_compactors, 'equipment',
      'Dynapac CA250D Soil Compactor',
      '11-tonne vibratory drum compactor. Ideal for compacting road sub-bases, embankments, and granular fills. GPS available.',
      'Dynapac', 'CA250D', 2019,
      'good', 55000, 350000, 1300000,
      'bafoussam', 1, true, false );

  -- ── Vehicle listings (10) ───────────────────────────────────────────────────
  INSERT INTO public.rental_listings (
    owner_id, category_id, type,
    name, description,
    make, model_name, year,
    condition, daily_rate, weekly_rate, monthly_rate,
    city, min_rental_days, is_available, is_featured
  ) VALUES

    -- 1. Sedan — Douala
    ( o, c_sedan, 'vehicle',
      'Toyota Corolla 2021 — Self-Drive',
      'Comfortable and fuel-efficient sedan. Air conditioning, Bluetooth, automatic transmission. Self-drive or with driver available.',
      'Toyota', 'Corolla', 2021,
      'excellent', 25000, 160000, 600000,
      'douala', 1, true, true ),

    -- 2. SUV — Yaoundé
    ( o, c_suv, 'vehicle',
      'Toyota Land Cruiser Prado 2022',
      'Spacious 7-seater SUV. 4WD, leather seats, sunroof. Ideal for executive travel and cross-region trips in Cameroon.',
      'Toyota', 'Land Cruiser Prado', 2022,
      'excellent', 65000, 420000, 1600000,
      'yaounde', 1, true, true ),

    -- 3. Pickup Truck — Bafoussam
    ( o, c_pickup, 'vehicle',
      'Ford Ranger Wildtrak 4x4 2022',
      'Double-cab pickup with 4WD. 1-tonne payload, tow bar, tonneau cover. Great for construction site access and regional travel.',
      'Ford', 'Ranger Wildtrak', 2022,
      'good', 40000, 260000, 980000,
      'bafoussam', 1, true, false ),

    -- 4. Luxury Car — Douala
    ( o, c_luxury, 'vehicle',
      'Mercedes-Benz C-Class C300 2022',
      'Premium executive sedan. Panoramic sunroof, heated leather seats, advanced driver assistance. Chauffeur-driven service available.',
      'Mercedes-Benz', 'C300', 2022,
      'excellent', 120000, 780000, 2900000,
      'douala', 1, true, false ),

    -- 5. Minivan — Yaoundé
    ( o, c_minivan, 'vehicle',
      'Toyota HiAce Grand Cabin 2020 (12-Seater)',
      '12-passenger minivan with air conditioning. Popular for corporate transport and airport transfers across Yaoundé.',
      'Toyota', 'HiAce Grand Cabin', 2020,
      'good', 35000, 220000, 820000,
      'yaounde', 1, true, false ),

    -- 6. Bus — Douala
    ( o, c_bus, 'vehicle',
      'Toyota Coaster 30-Seater Bus 2019',
      'Comfortable 30-passenger mini-bus. Air conditioned, reclining seats, ideal for excursions, conferences, and intercity trips.',
      'Toyota', 'Coaster', 2019,
      'good', 55000, 350000, 1300000,
      'douala', 1, true, false ),

    -- 7. Motorcycle — Buea
    ( o, c_motorcycle, 'vehicle',
      'Honda CB500F Motorcycle 2022',
      'Reliable and agile mid-range motorcycle. Suitable for city commuting and light off-road use. Helmet provided.',
      'Honda', 'CB500F', 2022,
      'good', 15000, 95000, 350000,
      'buea', 1, true, false ),

    -- 8. Cargo Van — Douala
    ( o, c_cargo_van, 'vehicle',
      'Ford Transit L3H2 Cargo Van 2021',
      'Large-volume cargo van, 14 m³ capacity. Ideal for moving, deliveries, and equipment transport across Douala and surrounding areas.',
      'Ford', 'Transit L3H2', 2021,
      'excellent', 45000, 290000, 1100000,
      'douala', 1, true, false ),

    -- 9. Sedan — Bamenda (second sedan for filter/pagination variety)
    ( o, c_sedan, 'vehicle',
      'Toyota Camry 2023 — Executive Sedan',
      'Premium mid-size sedan, automatic, full leather interior. Available with driver. Well-maintained and recently serviced.',
      'Toyota', 'Camry', 2023,
      'new', 28000, 180000, 680000,
      'bamenda', 1, true, false ),

    -- 10. SUV — Douala (second SUV)
    ( o, c_suv, 'vehicle',
      'Hyundai Tucson 2022 — Family SUV',
      'Stylish 5-seater crossover SUV. Fuel-efficient, comfortable, with modern infotainment. Great for city and highway use.',
      'Hyundai', 'Tucson', 2022,
      'good', 58000, 375000, 1400000,
      'douala', 1, true, false );

END $$;
