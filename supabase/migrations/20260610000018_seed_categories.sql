-- Migration: 0018 — Seed: Categories & Platform Settings
-- Static lookup data; safe to re-run (ON CONFLICT DO NOTHING)

INSERT INTO public.property_categories (name, name_fr, slug, icon, sort_order) VALUES
  ('Residential',  'Résidentiel', 'residential', 'house',     1),
  ('Commercial',   'Commercial',  'commercial',  'building',  2),
  ('Industrial',   'Industriel',  'industrial',  'warehouse', 3),
  ('Land',         'Terrain',     'land',        'map',       4),
  ('Agricultural', 'Agricole',    'agricultural','tree',      5)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.service_categories (name, name_fr, slug, icon, sort_order) VALUES
  ('Construction',     'Construction',       'construction',     'hard-hat',           1),
  ('Plumbing',         'Plomberie',          'plumbing',         'wrench',             2),
  ('Electrical',       'Électricité',        'electrical',       'zap',                3),
  ('Interior Design',  'Design Intérieur',   'interior-design',  'palette',            4),
  ('Architecture',     'Architecture',       'architecture',     'drafting-compass',   5),
  ('Legal Services',   'Services Juridiques','legal-services',   'scale',              6),
  ('Surveying',        'Géomètre',           'surveying',        'ruler',              7),
  ('Landscaping',      'Paysagisme',         'landscaping',      'tree',               8),
  ('Security',         'Sécurité',           'security',         'shield',             9),
  ('Cleaning',         'Nettoyage',          'cleaning',         'sparkles',          10)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.product_categories (name, name_fr, slug, sort_order) VALUES
  ('Cement & Concrete',    'Ciment & Béton',            'cement-concrete',    1),
  ('Steel & Metal',        'Acier & Métal',             'steel-metal',        2),
  ('Timber & Wood',        'Bois & Timber',             'timber-wood',        3),
  ('Bricks & Blocks',      'Briques & Blocs',           'bricks-blocks',      4),
  ('Roofing',              'Toiture',                   'roofing',            5),
  ('Tiles & Flooring',     'Carrelage & Sols',          'tiles-flooring',     6),
  ('Paint & Coatings',     'Peinture & Revêtements',    'paint-coatings',     7),
  ('Plumbing Supplies',    'Fournitures Plomberie',     'plumbing-supplies',  8),
  ('Electrical Supplies',  'Fournitures Électriques',   'electrical-supplies',9),
  ('Tools & Equipment',    'Outils & Équipements',      'tools-equipment',   10),
  ('Doors & Windows',      'Portes & Fenêtres',         'doors-windows',     11),
  ('Sanitary Ware',        'Sanitaires',                'sanitary-ware',     12)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.rental_categories
(name, name_fr, slug, type)
VALUES
('Heavy Machinery', 'Machines Lourdes', 'heavy-machinery', 'equipment'),
('Power Tools', 'Outillage Électrique', 'power-tools', 'equipment'),
('Scaffolding', 'Échafaudage', 'scaffolding', 'equipment'),
('Generators', 'Groupes Électrogènes', 'generators', 'equipment'),
('Trucks', 'Camions', 'trucks', 'vehicle'),
('Excavators', 'Excavatrices', 'excavators', 'vehicle'),
('Cranes', 'Grues', 'cranes', 'vehicle'),
('Pickup & Vans', 'Pickups & Vans', 'pickup-vans', 'vehicle')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.forum_categories (name, name_fr, slug, description, sort_order) VALUES
  ('Real Estate Market',  'Marché Immobilier',      'real-estate-market',  'Cameroon property market trends and news',     1),
  ('Construction Tips',   'Conseils Construction',  'construction-tips',   'Share building knowledge and best practices',  2),
  ('Legal & Documents',   'Juridique & Documents',  'legal-documents',     'Property law, titres fonciers, notarial acts', 3),
  ('Materials & Pricing', 'Matériaux & Prix',       'materials-pricing',   'Building material prices and supplier reviews',4),
  ('Rentals',             'Locations',              'rentals',             'Rental listings and tenant rights',            5),
  ('General Discussion',  'Discussion Générale',    'general-discussion',  'Off-topic real estate conversations',          6)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.platform_settings (key, value, type, description) VALUES
  ('platform_commission_pct',      '2.50',  'number',  'Platform commission on property transactions (%)'),
  ('agent_commission_pct',         '3.00',  'number',  'Default agent commission rate (%)'),
  ('vendor_commission_pct',        '5.00',  'number',  'Platform commission on product sales (%)'),
  ('escrow_auto_release_days',     '30',    'number',  'Days before escrow auto-release'),
  ('max_property_images',          '20',    'number',  'Max images per property listing'),
  ('max_product_images',           '10',    'number',  'Max images per product'),
  ('featured_listing_fee_xaf',     '15000', 'number',  'Fee for featured property listing (XAF)'),
  ('property_listing_fee_xaf',     '0',     'number',  'Fee to list a property (0 = free)'),
  ('min_withdrawal_xaf',           '5000',  'number',  'Minimum wallet withdrawal (XAF)'),
  ('kyc_required_for_seller',      'true',  'boolean', 'Require KYC verification to list properties'),
  ('kyc_required_for_vendor',      'true',  'boolean', 'Require KYC verification to sell products'),
  ('max_saved_searches',           '10',    'number',  'Max saved searches per user'),
  ('currency',                     'XAF',   'string',  'Default platform currency'),
  ('site_name',                    'LANDLORDZS', 'string', 'Platform display name'),
  ('support_email',                'support@landlordzs.com', 'string', 'Support contact email'),
  ('mtn_momo_enabled',             'true',  'boolean', 'Enable MTN Mobile Money payments'),
  ('orange_money_enabled',         'true',  'boolean', 'Enable Orange Money payments'),
  ('stripe_enabled',               'false', 'boolean', 'Enable Stripe card payments'),
  ('maintenance_mode',             'false', 'boolean', 'Put platform in maintenance mode')
ON CONFLICT (key) DO NOTHING;
