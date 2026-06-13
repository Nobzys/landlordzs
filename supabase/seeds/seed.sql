-- =============================================================
-- LANDLORDZS — Development Seed Data
-- Realistic Cameroon sample data for local development
-- Run: supabase db reset  (applies migrations + this seed)
-- WARNING: Do NOT run against production
-- =============================================================

-- ─── Sample Users (auth.users inserted via Supabase Auth; profiles only here) ─
-- In local dev, create these users via: supabase auth admin create-user
-- then insert profile data referencing those UUIDs.
-- Below uses deterministic UUIDs safe for seeding.

DO $$
DECLARE
  u_admin      UUID := '00000000-0000-0000-0000-000000000001';
  u_agent1     UUID := '00000000-0000-0000-0000-000000000002';
  u_seller1    UUID := '00000000-0000-0000-0000-000000000003';
  u_buyer1     UUID := '00000000-0000-0000-0000-000000000004';
  u_vendor1    UUID := '00000000-0000-0000-0000-000000000005';
  u_contractor UUID := '00000000-0000-0000-0000-000000000006';
  u_architect  UUID := '00000000-0000-0000-0000-000000000007';
  u_lawyer     UUID := '00000000-0000-0000-0000-000000000008';
  u_engineer   UUID := '00000000-0000-0000-0000-000000000009';
  u_buyer2     UUID := '00000000-0000-0000-0000-000000000010';

  agency1      UUID := gen_random_uuid();
  prop1        UUID := gen_random_uuid();
  prop2        UUID := gen_random_uuid();
  prop3        UUID := gen_random_uuid();
  prop4        UUID := gen_random_uuid();
  prop5        UUID := gen_random_uuid();
  vendor_prof  UUID := u_vendor1;
  prod1        UUID := gen_random_uuid();
  prod2        UUID := gen_random_uuid();
  prod3        UUID := gen_random_uuid();
  prod4        UUID := gen_random_uuid();
  prod5        UUID := gen_random_uuid();
  cat_cement   UUID;
  cat_steel    UUID;
  cat_roofing  UUID;
  cat_resi     UUID;
  svc_cat_const UUID;
  job1         UUID := gen_random_uuid();
  job2         UUID := gen_random_uuid();
  tender1      UUID := gen_random_uuid();
  forum_cat    UUID;
  post1        UUID := gen_random_uuid();
  post2        UUID := gen_random_uuid();
BEGIN

-- ─── Profiles ────────────────────────────────────────────────────────────────
INSERT INTO public.profiles (id, email, full_name, display_name, role, city, phone, is_verified, is_premium) VALUES
  (u_admin,      'admin@landlordzs.com',       'Admin LANDLORDZS',     'Admin',          'admin',       'yaounde', '+237 677 000 001', TRUE,  TRUE),
  (u_agent1,     'jean.mvondo@gmail.com',       'Jean-Pierre Mvondo',   'JP Mvondo',      'agent',       'yaounde', '+237 696 112 233', TRUE,  FALSE),
  (u_seller1,    'grace.ekomo@outlook.com',     'Grace Ekomo Ndongo',   'Grace E.',       'seller',      'douala',  '+237 655 445 566', TRUE,  FALSE),
  (u_buyer1,     'paul.tamba@gmail.com',        'Paul Tamba',           'Paul T.',        'buyer',       'buea',    '+237 674 778 899', FALSE, FALSE),
  (u_vendor1,    'construction.supply@cm.com',  'Cameroon Build Supply','CBS Store',      'vendor',      'douala',  '+237 233 421 000', TRUE,  FALSE),
  (u_contractor, 'samy.ngono@cm.com',           'Samuel Ngono',         'Sam Contractor', 'contractor',  'yaounde', '+237 691 234 567', TRUE,  FALSE),
  (u_architect,  'marie.nkeng@architect.cm',    'Marie Nkeng',          'Arch. Nkeng',    'architect',   'douala',  '+237 677 890 123', TRUE,  FALSE),
  (u_lawyer,     'maitre.foning@legalcm.com',   'Me. Bernard Foning',   'Me. Foning',     'lawyer',      'yaounde', '+237 222 202 034', TRUE,  FALSE),
  (u_engineer,   'eng.baka@consultcm.com',      'Christiane Baka',      'Eng. Baka',      'engineer',    'douala',  '+237 690 456 789', TRUE,  FALSE),
  (u_buyer2,     'rita.fouda@yahoo.com',        'Rita Fouda',           'Rita F.',        'buyer',       'limbe',   '+237 652 334 556', FALSE, FALSE)
ON CONFLICT (id) DO NOTHING;

-- ─── Agency ──────────────────────────────────────────────────────────────────
INSERT INTO public.agencies (id, owner_id, name, slug, description, phone, email, city, is_active) VALUES
  (agency1, u_agent1,
   'Prestige Immobilier Cameroun', 'prestige-immobilier-cm',
   'Agence immobilière leader à Yaoundé et Douala. Spécialisée dans les propriétés résidentielles et commerciales haut de gamme.',
   '+237 222 230 101', 'contact@prestige-immo.cm', 'yaounde', TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO public.agent_profiles (id, agency_id, specializations, service_areas, experience_years, commission_rate, bio) VALUES
  (u_agent1, agency1,
   ARRAY['residential','commercial','land'],
   ARRAY['yaounde','douala','buea']::public.cameroon_city[],
   8, 3.00,
   'Agent immobilier certifié avec 8 ans d''expérience au Cameroun. Spécialiste des propriétés à Bastos, Omnisport et Bonapriso.')
ON CONFLICT DO NOTHING;

-- ─── Resolve category UUIDs ───────────────────────────────────────────────────
SELECT id INTO cat_cement  FROM public.product_categories WHERE slug = 'cement-concrete';
SELECT id INTO cat_steel   FROM public.product_categories WHERE slug = 'steel-metal';
SELECT id INTO cat_roofing FROM public.product_categories WHERE slug = 'roofing';
SELECT id INTO cat_resi    FROM public.property_categories WHERE slug = 'residential';
SELECT id INTO svc_cat_const FROM public.service_categories WHERE slug = 'construction';
SELECT id INTO forum_cat   FROM public.forum_categories WHERE slug = 'real-estate-market';

-- ─── Properties ──────────────────────────────────────────────────────────────
INSERT INTO public.properties (
  id, owner_id, agent_id, category_id,
  title, title_fr, slug, description, description_fr,
  listing_type, property_type, status, city, neighborhood,
  price, currency, bedrooms, bathrooms, area_sqm,
  land_title, is_furnished, has_security, has_generator, has_borehole,
  is_featured, is_verified, published_at
) VALUES
  -- 1. House in Bastos, Yaoundé
  (prop1, u_seller1, u_agent1, cat_resi,
   '4-Bedroom Villa in Bastos Yaoundé', 'Villa 4 Chambres à Bastos Yaoundé',
   'villa-4ch-bastos-yaounde-a1b2c3d4',
   'Magnificent 4-bedroom villa in the prestigious Bastos neighbourhood. Fully secured compound with 24/7 security, backup generator, and borehole water. Close to embassies and international schools.',
   'Magnifique villa 4 chambres dans le prestigieux quartier de Bastos. Résidence sécurisée 24h/24 avec gardien, groupe électrogène et forage.',
   'sale', 'villa', 'active', 'yaounde', 'Bastos',
   150000000, 'XAF', 4, 3, 350.00,
   'titre_foncier', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, NOW()),

  -- 2. Apartment in Bonapriso, Douala
  (prop2, u_seller1, u_agent1, cat_resi,
   '2-Bedroom Apartment for Rent in Bonapriso', 'Appartement 2 Chambres à Louer Bonapriso',
   'appt-2ch-bonapriso-douala-e5f6g7h8',
   'Modern 2-bedroom apartment in Bonapriso, Douala. Air-conditioned, tiled throughout, with parking and 24/7 security. Walking distance to Bonapriso market and restaurants.',
   'Appartement moderne 2 chambres à Bonapriso, Douala. Climatisé, carrelé, avec parking et sécurité 24h/24.',
   'rent', 'apartment', 'active', 'douala', 'Bonapriso',
   350000, 'XAF', 2, 1, 90.00,
   'bail_emphyteotique', FALSE, TRUE, FALSE, FALSE, FALSE, TRUE, NOW()),

  -- 3. Commercial space in Akwa, Douala
  (prop3, u_seller1, NULL, cat_resi,
   'Commercial Space for Sale in Akwa Business District', 'Local Commercial à Vendre Akwa',
   'local-commercial-akwa-douala-i9j0k1l2',
   'Prime commercial space of 200 sqm in the heart of Akwa business district. Ground floor, high foot traffic, ideal for offices, showroom, or retail.',
   'Local commercial de 200 m² en plein cœur du quartier d''affaires d''Akwa. Rez-de-chaussée, fort passage.',
   'sale', 'commercial_space', 'active', 'douala', 'Akwa',
   200000000, 'XAF', 0, 2, 200.00,
   'titre_foncier', FALSE, TRUE, TRUE, FALSE, FALSE, TRUE, NOW()),

  -- 4. Land in Buea
  (prop4, u_buyer2, NULL, cat_resi,
   'Serviced Land Plot Near UB Campus Buea', 'Terrain Viabilisé Près du Campus UB Buea',
   'terrain-viabilise-ub-buea-m3n4o5p6',
   '600 sqm serviced land plot near the University of Buea campus. Electricity and water connections available. Quiet neighbourhood, ideal for residential construction.',
   'Parcelle de 600 m² viabilisée près du campus de l''Université de Buea. Raccordements eau et électricité disponibles.',
   'sale', 'land', 'active', 'buea', 'Great Soppo',
   25000000, 'XAF', 0, 0, 600.00,
   'titre_foncier', FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, NOW()),

  -- 5. Studio in Limbe
  (prop5, u_buyer2, NULL, cat_resi,
   'Cosy Studio Apartment for Rent in Limbe', 'Studio à Louer à Limbe',
   'studio-limbe-q7r8s9t0',
   'Furnished studio apartment 300m from Limbe beach. Ocean view, fully tiled, with kitchenette. Ideal for professionals and couples.',
   'Studio meublé à 300m de la plage de Limbe. Vue sur mer, bien carrelé, avec kitchenette.',
   'rent', 'studio', 'active', 'limbe', 'Down Beach',
   80000, 'XAF', 1, 1, 35.00,
   'none', TRUE, FALSE, FALSE, FALSE, FALSE, FALSE, NOW())
ON CONFLICT DO NOTHING;

-- Property images (sample)
INSERT INTO public.property_images (property_id, url, is_primary, sort_order) VALUES
  (prop1, 'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800', TRUE,  1),
  (prop1, 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800', FALSE, 2),
  (prop2, 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800', TRUE,  1),
  (prop3, 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800', TRUE,  1),
  (prop4, 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800', TRUE,  1),
  (prop5, 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800', TRUE,  1)
ON CONFLICT DO NOTHING;

-- Property amenities for prop1
INSERT INTO public.property_amenities (property_id, category, name, has_feature) VALUES
  (prop1, 'utilities',  'Generator',     TRUE),
  (prop1, 'utilities',  'Borehole Water',TRUE),
  (prop1, 'utilities',  'ENEO Power',    TRUE),
  (prop1, 'security',   '24/7 Security', TRUE),
  (prop1, 'security',   'CCTV',          TRUE),
  (prop1, 'interior',   'Air Conditioning', TRUE),
  (prop1, 'interior',   'Tiled Floors',  TRUE),
  (prop1, 'exterior',   'Parking',       TRUE),
  (prop1, 'exterior',   'Garden',        TRUE),
  (prop1, 'exterior',   'Swimming Pool', FALSE)
ON CONFLICT DO NOTHING;

-- ─── Vendor & Products ────────────────────────────────────────────────────────
INSERT INTO public.vendor_profiles (id, store_name, store_slug, store_description, phone, email, city, is_verified) VALUES
  (u_vendor1,
   'Cameroon Build Supply',
   'cameroon-build-supply',
   'Fournisseur leader de matériaux de construction au Cameroun. Ciment, fer, toiture et plus. Livraison à domicile disponible à Douala et Yaoundé.',
   '+237 233 421 000', 'orders@cameroonbuildsupply.com', 'douala', TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO public.products (id, vendor_id, category_id, name, name_fr, slug, description, price, currency, stock_qty, unit, is_active, is_featured) VALUES
  (prod1, u_vendor1, cat_cement,
   'Dangote Cement 50kg',
   'Ciment Dangote 50kg',
   'dangote-cement-50kg',
   'High-quality Portland cement. Ideal for all construction works. Minimum order: 10 bags.',
   6500, 'XAF', 5000, 'bag', TRUE, TRUE),

  (prod2, u_vendor1, cat_cement,
   'CimencamPlus 50kg Bag',
   'Cimencam Plus Sac 50kg',
   'cimencam-plus-50kg',
   'Local Cameroonian cement, perfect for masonry and plastering. Very fine grind for smooth finishes.',
   6200, 'XAF', 3000, 'bag', TRUE, FALSE),

  (prod3, u_vendor1, cat_steel,
   'Iron Rods 12mm (Per Bundle)',
   'Fer à béton 12mm (par botte)',
   'iron-rods-12mm-bundle',
   'High-tensile iron rods for reinforced concrete. Bundle of 10 rods, 12m each. Grade 60.',
   145000, 'XAF', 200, 'bundle', TRUE, TRUE),

  (prod4, u_vendor1, cat_roofing,
   'Corrugated Iron Sheet (0.5mm × 12 sheets)',
   'Tôle ondulée 0.5mm (lot de 12)',
   'corrugated-iron-sheet-05mm-12',
   'Galvanised corrugated roofing sheets. 0.5mm thickness, 2.4m × 0.9m per sheet. Rust-resistant coating.',
   85000, 'XAF', 800, 'pack', TRUE, FALSE),

  (prod5, u_vendor1, cat_steel,
   'Sand (1 Truckload ~10m³)',
   'Sable (1 camion ~10m³)',
   'sand-river-10m3',
   'Clean river sand for construction. Delivered by truck. Suitable for concrete mixing and plastering.',
   75000, 'XAF', 50, 'truck', TRUE, FALSE)
ON CONFLICT DO NOTHING;

INSERT INTO public.product_images (product_id, url, is_primary) VALUES
  (prod1, 'https://images.unsplash.com/photo-1518709766631-a6a7f45921c3?w=400', TRUE),
  (prod3, 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400', TRUE),
  (prod4, 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400', TRUE)
ON CONFLICT DO NOTHING;

-- ─── Professionals ────────────────────────────────────────────────────────────
INSERT INTO public.professional_profiles (
  id, profession_type, company_name, specializations,
  service_areas, experience_years, hourly_rate, day_rate, bio, is_available, is_verified
) VALUES
  (u_contractor, 'contractor',
   'Ngono Construction & Bâtiment',
   ARRAY['residential_construction','renovation','masonry','tiling'],
   ARRAY['yaounde','douala']::public.cameroon_city[],
   12, 15000, 90000,
   'Entrepreneur en bâtiment avec 12 ans d''expérience. Spécialisé en construction résidentielle et rénovation. Certifié COBAC. Portfolio disponible sur demande.',
   TRUE, TRUE),

  (u_architect, 'architect',
   'Nkeng Architecture Studio',
   ARRAY['residential_design','commercial_design','interior_design','urban_planning'],
   ARRAY['douala','yaounde','buea']::public.cameroon_city[],
   9, 25000, 150000,
   'Architecte diplômée de l''ENSPD Yaoundé avec 9 ans d''expérience. Membre de l''Ordre National des Architectes du Cameroun. Spécialisée en design contemporain africain.',
   TRUE, TRUE),

  (u_lawyer, 'lawyer',
   'Cabinet Foning & Associés',
   ARRAY['property_law','contract_law','land_disputes','conveyancing'],
   ARRAY['yaounde','douala']::public.cameroon_city[],
   15, 30000, 200000,
   'Maître Bernard Foning - Avocat au Barreau du Cameroun depuis 15 ans. Expert en droit immobilier, transactions foncières et litiges de propriété.',
   TRUE, TRUE),

  (u_engineer, 'engineer',
   'Baka Structural Engineering Consult',
   ARRAY['structural_engineering','soil_testing','project_supervision','bill_of_quantities'],
   ARRAY['douala','yaounde','buea']::public.cameroon_city[],
   7, 20000, 120000,
   'Ingénieure Civil diplômée de POLYTECHNIQUE Yaoundé. Spécialisée en études de sol, fondations et supervision de chantier.',
   TRUE, TRUE)
ON CONFLICT DO NOTHING;

-- ─── Service Listings ─────────────────────────────────────────────────────────
INSERT INTO public.service_listings (
  provider_id, category_id, title, description, price_type, base_price, currency,
  service_areas, is_active, is_featured
) VALUES
  (u_contractor, svc_cat_const,
   'Complete House Construction — Clé en Main',
   'Construction complète de maison résidentielle clé en main. Plan, fondations, structure, toiture, plomberie, électricité. Devis gratuit sous 48h.',
   'negotiable', NULL, 'XAF',
   ARRAY['yaounde','douala']::public.cameroon_city[], TRUE, TRUE),

  (u_architect, svc_cat_const,
   'Architectural Design & Building Permit',
   'Full architectural design service including 2D/3D plans, perspective views, and assistance obtaining building permits from urban planning authorities.',
   'fixed', 500000, 'XAF',
   ARRAY['douala','yaounde','buea']::public.cameroon_city[], TRUE, TRUE)
ON CONFLICT DO NOTHING;

-- ─── Jobs ─────────────────────────────────────────────────────────────────────
INSERT INTO public.jobs (
  id, poster_id, title, description, requirements, category, job_type,
  city, salary_min, salary_max, currency, salary_period,
  skills_required, status, published_at, expires_at
) VALUES
  (job1, u_vendor1,
   'Site Engineer — Construction Projects Douala',
   'We are seeking a qualified Site Engineer to supervise multiple residential and commercial construction projects in Douala. You will ensure quality standards, manage subcontractors, and report to the project manager.',
   '- Degree in Civil Engineering or equivalent\n- 3+ years site supervision experience\n- Strong knowledge of Cameroonian building codes\n- Valid driving licence\n- French required, English a plus',
   'Engineering', 'full_time', 'douala',
   300000, 500000, 'XAF', 'month',
   ARRAY['civil_engineering','site_supervision','autocad','quality_control'],
   'active', NOW(), NOW() + INTERVAL '60 days'),

  (job2, u_seller1,
   'Real Estate Agent — Yaoundé Residential Market',
   'Join our growing team as a commissioned real estate agent in Yaoundé. Manage client relationships, conduct property viewings, negotiate deals, and close sales. Commission-based role with high earning potential.',
   '- 2+ years sales or real estate experience\n- Excellent communication skills in French and English\n- Own motorcycle or vehicle preferred\n- Knowledge of Yaoundé neighbourhoods essential',
   'Real Estate', 'contract', 'yaounde',
   150000, 800000, 'XAF', 'month',
   ARRAY['sales','negotiation','customer_service','real_estate'],
   'active', NOW(), NOW() + INTERVAL '45 days')
ON CONFLICT DO NOTHING;

-- ─── Tender ──────────────────────────────────────────────────────────────────
INSERT INTO public.tenders (
  id, poster_id, title, description, scope_of_work, requirements,
  category, city, budget_min, budget_max, currency, status,
  submission_deadline, start_date, completion_date, published_at
) VALUES
  (tender1, u_seller1,
   'Construction of 6-Unit Residential Block — Logbessou Douala',
   'We invite qualified construction companies to bid for the construction of a 6-unit residential apartment block in Logbessou, Douala. The project includes foundation, structure, finishing, plumbing, and electrical works.',
   'Complete construction of 6-unit G+1 residential block on a 900 sqm plot. Includes:\n- Foundation and structure works\n- Roofing (aluminium sheets)\n- Masonry and plastering\n- Plumbing (CDE connection)\n- Electrical (AES connection)\n- Tiling and painting\n- External works (fence, gate, car park)',
   'Companies must provide:\n- Valid business registration\n- At least 3 completed similar projects\n- Detailed BOQ and timeline\n- Insurance certificate\n- References from past clients',
   'Residential Construction', 'douala',
   40000000, 70000000, 'XAF', 'published',
   CURRENT_DATE + INTERVAL '21 days',
   CURRENT_DATE + INTERVAL '30 days',
   CURRENT_DATE + INTERVAL '18 months',
   NOW())
ON CONFLICT DO NOTHING;

-- ─── Forum Posts ──────────────────────────────────────────────────────────────
INSERT INTO public.forum_posts (
  id, author_id, category_id, title, slug, content, status, view_count, reply_count
) VALUES
  (post1, u_buyer1, forum_cat,
   'Best neighbourhoods to buy property in Yaoundé 2026?',
   'best-neighbourhoods-yaounde-2026',
   'Hello everyone! I am looking to buy my first home in Yaoundé and would like advice from people who know the market well.

My budget is around 50-80 million FCFA. I need a 3-bedroom house or large apartment. I work near the Palais des Congrès area so proximity matters, but I am open to anywhere safe with good access.

I have been looking at Bastos (too expensive for my budget), Omnisport, Mfandena, and Tsinga. Any thoughts on these areas? Which has the best value for money and which should I avoid?

Also curious about the infrastructure situation — which areas have the most reliable electricity and water supply?

Merci d''avance pour vos conseils!',
   'active', 47, 3),

  (post2, u_buyer2, forum_cat,
   'How to verify a Titre Foncier before buying — step by step guide?',
   'how-verify-titre-foncier-cameroon',
   'I am about to purchase a plot of land in Buea and the seller has shown me what he says is a Titre Foncier. I want to make sure it is authentic before paying.

Can someone explain the exact steps to verify a Titre Foncier at the Conservation Foncière? I have heard there are fake documents circulating and I want to be sure.

Specifically I want to know:
1. Which office to visit in Buea (or if it must be done in Yaoundé)
2. What documents I need to bring
3. How long the verification takes
4. What fees are involved
5. Any red flags to watch for in a potentially fake TF

I would also appreciate if a lawyer or notary could weigh in. Thank you!',
   'active', 89, 5)
ON CONFLICT DO NOTHING;

-- Forum comments
INSERT INTO public.forum_comments (post_id, author_id, content) VALUES
  (post1, u_agent1,
   'Bonjour! Comme agent immobilier basé à Yaoundé depuis 8 ans, voici mon avis: pour votre budget de 50-80M FCFA, je recommande Mfandena ou Omnisport. Tsinga est aussi une bonne option. Bastos est effectivement hors budget. Omnisport a eu beaucoup de développements ces 2 dernières années et l''accès à l''axe lourd facilite les déplacements. DM si vous voulez organiser des visites!'),
  (post2, u_lawyer,
   'Maître Foning ici. Pour vérifier un Titre Foncier à Buea, vous devez vous rendre à la Conservation Foncière du département du Fako, situé à Mile 17 Buea. Apportez: une copie du TF, votre CNI, et 5000 FCFA pour les frais de consultation. La vérification prend 30 minutes à 2 jours selon l''affluence. Demandez un extrait de copie certifiée conforme. Les faux TF ont souvent des numéros qui ne correspondent pas aux archives — la vérification physique est le seul moyen sûr. N''achetez JAMAIS sans faire cette vérification au préalable.')
ON CONFLICT DO NOTHING;

-- ─── Wallets (initial 0 balance) ─────────────────────────────────────────────
INSERT INTO public.wallets (user_id, balance, locked, currency) VALUES
  (u_admin,      0, 0, 'XAF'),
  (u_agent1,     0, 0, 'XAF'),
  (u_seller1,    0, 0, 'XAF'),
  (u_buyer1,     0, 0, 'XAF'),
  (u_vendor1,    0, 0, 'XAF'),
  (u_contractor, 0, 0, 'XAF'),
  (u_architect,  0, 0, 'XAF'),
  (u_lawyer,     0, 0, 'XAF'),
  (u_engineer,   0, 0, 'XAF'),
  (u_buyer2,     0, 0, 'XAF')
ON CONFLICT (user_id) DO NOTHING;

-- ─── Notification preferences ─────────────────────────────────────────────────
INSERT INTO public.notification_preferences (user_id, email_enabled, push_enabled, sms_enabled) VALUES
  (u_admin,      TRUE, TRUE, FALSE),
  (u_agent1,     TRUE, TRUE, TRUE),
  (u_seller1,    TRUE, TRUE, TRUE),
  (u_buyer1,     TRUE, TRUE, FALSE),
  (u_vendor1,    TRUE, TRUE, TRUE),
  (u_contractor, TRUE, TRUE, FALSE),
  (u_architect,  TRUE, TRUE, FALSE),
  (u_lawyer,     TRUE, FALSE, FALSE),
  (u_engineer,   TRUE, TRUE, FALSE),
  (u_buyer2,     TRUE, FALSE, FALSE)
ON CONFLICT (user_id) DO NOTHING;

-- ─── Sample property favorites ────────────────────────────────────────────────
INSERT INTO public.property_favorites (user_id, property_id) VALUES
  (u_buyer1,  prop1),
  (u_buyer1,  prop2),
  (u_buyer2,  prop3),
  (u_buyer2,  prop1)
ON CONFLICT DO NOTHING;

-- ─── Sample property view counts ──────────────────────────────────────────────
UPDATE public.properties SET view_count = 142, enquiry_count = 8  WHERE id = prop1;
UPDATE public.properties SET view_count = 98,  enquiry_count = 12 WHERE id = prop2;
UPDATE public.properties SET view_count = 67,  enquiry_count = 4  WHERE id = prop3;
UPDATE public.properties SET view_count = 34,  enquiry_count = 2  WHERE id = prop4;
UPDATE public.properties SET view_count = 21,  enquiry_count = 3  WHERE id = prop5;

END $$;
