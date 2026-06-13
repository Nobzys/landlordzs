-- ============================================================
-- LANDLORDZS — Complete Supabase PostgreSQL Schema v2.0
-- Production-ready | Cameroon Real Estate & Marketplace
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE user_role AS ENUM (
  'admin','moderator','buyer','seller','agent',
  'vendor','contractor','engineer','architect','lawyer'
);
CREATE TYPE account_status AS ENUM ('active','suspended','banned','pending_verification','deactivated');
CREATE TYPE verification_status AS ENUM ('pending','submitted','under_review','approved','rejected','expired');
CREATE TYPE kyc_level AS ENUM ('none','basic','standard','enhanced');
CREATE TYPE property_type AS ENUM (
  'apartment','house','villa','studio','duplex','penthouse',
  'land','commercial_space','office','warehouse','shop','farm'
);
CREATE TYPE listing_type AS ENUM ('sale','rent','short_term','lease','auction');
CREATE TYPE property_status AS ENUM (
  'draft','pending_review','active','under_offer','sold','rented','off_market','expired','rejected'
);
CREATE TYPE land_title_type AS ENUM (
  'titre_foncier','acte_de_vente','bail_emphyteotique','convention','lettre_attribution','none'
);
CREATE TYPE cameroon_city AS ENUM (
  'yaounde','douala','buea','bamenda','limbe','kribi',
  'bafoussam','ngaoundere','maroua','garoua','bertoua',
  'ebolowa','kumba','nkongsamba','edea','other'
);
CREATE TYPE transaction_type AS ENUM (
  'property_sale','property_rent','product_purchase','service_payment',
  'rental_payment','subscription','commission','refund','escrow_deposit',
  'escrow_release','wallet_topup','wallet_withdrawal','payout'
);
CREATE TYPE payment_provider AS ENUM ('mtn_momo','orange_money','stripe','bank_transfer','cash','wallet');
CREATE TYPE payment_status AS ENUM ('pending','processing','completed','failed','cancelled','refunded');
CREATE TYPE escrow_status AS ENUM ('pending','funded','released','disputed','refunded','cancelled');
CREATE TYPE milestone_status AS ENUM ('pending','in_progress','completed','approved','disputed');
CREATE TYPE order_status AS ENUM (
  'pending','confirmed','processing','shipped','delivered','cancelled','returned','refunded'
);
CREATE TYPE booking_status AS ENUM ('pending','confirmed','active','completed','cancelled','no_show');
CREATE TYPE service_request_status AS ENUM (
  'open','quoted','accepted','in_progress','completed','disputed','cancelled'
);
CREATE TYPE job_type AS ENUM ('full_time','part_time','contract','freelance','internship');
CREATE TYPE job_status AS ENUM ('draft','active','closed','expired','filled');
CREATE TYPE application_status AS ENUM (
  'submitted','reviewed','shortlisted','interviewed','accepted','rejected','withdrawn'
);
CREATE TYPE tender_status AS ENUM ('draft','published','closed','awarded','cancelled');
CREATE TYPE currency_code AS ENUM ('XAF','USD','EUR','GBP');
CREATE TYPE profession_type AS ENUM ('contractor','engineer','architect','lawyer');
CREATE TYPE report_type AS ENUM ('spam','fraud','inappropriate','misleading','illegal','harassment','other');
CREATE TYPE report_status AS ENUM ('pending','reviewing','resolved','dismissed');
CREATE TYPE notification_type AS ENUM (
  'message','enquiry','offer','booking','payment','review',
  'property_update','order_update','service_update','job_update',
  'system','promotional','verification'
);
CREATE TYPE post_status AS ENUM ('active','pinned','closed','hidden','deleted');
CREATE TYPE reaction_type AS ENUM ('like','dislike','helpful','not_helpful');

-- ============================================================
-- UTILITY: updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION attach_updated_at(tbl TEXT) RETURNS VOID AS $$
BEGIN
  EXECUTE format(
    'CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I
     FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at()', tbl);
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- UTILITY: Role helpers (SECURITY DEFINER avoids RLS recursion)
-- ============================================================
CREATE OR REPLACE FUNCTION get_my_role() RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_moderator() RETURNS BOOLEAN AS $$
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================================
-- SECTION 1: AUTH & PROFILES
-- ============================================================
CREATE TABLE public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT NOT NULL UNIQUE,
  full_name       TEXT NOT NULL DEFAULT '',
  display_name    TEXT,
  avatar_url      TEXT,
  cover_url       TEXT,
  phone           TEXT,
  phone_verified  BOOLEAN NOT NULL DEFAULT FALSE,
  role            user_role NOT NULL DEFAULT 'buyer',
  status          account_status NOT NULL DEFAULT 'active',
  kyc_level       kyc_level NOT NULL DEFAULT 'none',
  bio             TEXT,
  city            cameroon_city,
  address         TEXT,
  latitude        DECIMAL(10,8),
  longitude       DECIMAL(11,8),
  language        TEXT NOT NULL DEFAULT 'fr',
  currency        currency_code NOT NULL DEFAULT 'XAF',
  timezone        TEXT NOT NULL DEFAULT 'Africa/Douala',
  is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
  is_premium      BOOLEAN NOT NULL DEFAULT FALSE,
  last_seen_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SELECT attach_updated_at('profiles');
CREATE INDEX idx_profiles_role   ON public.profiles(role);
CREATE INDEX idx_profiles_status ON public.profiles(status);
CREATE INDEX idx_profiles_city   ON public.profiles(city);
CREATE INDEX idx_profiles_email  ON public.profiles(email);

CREATE TABLE public.email_verifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token      TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_email_verif_user  ON public.email_verifications(user_id);
CREATE INDEX idx_email_verif_token ON public.email_verifications(token);

CREATE TABLE public.phone_verifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  phone       TEXT NOT NULL,
  otp_hash    TEXT NOT NULL,
  attempts    INT NOT NULL DEFAULT 0,
  expires_at  TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_phone_verif_user ON public.phone_verifications(user_id);

CREATE TABLE public.kyc_records (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  level              kyc_level NOT NULL DEFAULT 'basic',
  status             verification_status NOT NULL DEFAULT 'pending',
  national_id_number TEXT,
  national_id_front  TEXT,
  national_id_back   TEXT,
  selfie_url         TEXT,
  proof_of_address   TEXT,
  business_reg       TEXT,
  reviewed_by        UUID REFERENCES public.profiles(id),
  review_notes       TEXT,
  submitted_at       TIMESTAMPTZ,
  reviewed_at        TIMESTAMPTZ,
  expires_at         TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SELECT attach_updated_at('kyc_records');
CREATE INDEX idx_kyc_user   ON public.kyc_records(user_id);
CREATE INDEX idx_kyc_status ON public.kyc_records(status);

CREATE TABLE public.user_permissions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  permission TEXT NOT NULL,
  granted_by UUID REFERENCES public.profiles(id),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, permission)
);
CREATE INDEX idx_user_permissions_user ON public.user_permissions(user_id);

CREATE TABLE public.user_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  device_name TEXT,
  device_type TEXT,
  ip_address  TEXT,
  user_agent  TEXT,
  last_active TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_user_sessions_user ON public.user_sessions(user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name',''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role,'buyer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- SECTION 2: AGENCIES & AGENTS
-- ============================================================
CREATE TABLE public.agencies (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  slug             TEXT NOT NULL UNIQUE,
  logo_url         TEXT,
  cover_url        TEXT,
  description      TEXT,
  license_number   TEXT,
  license_verified BOOLEAN NOT NULL DEFAULT FALSE,
  phone            TEXT,
  email            TEXT,
  website          TEXT,
  city             cameroon_city,
  address          TEXT,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  rating_avg       DECIMAL(3,2) NOT NULL DEFAULT 0,
  rating_count     INT NOT NULL DEFAULT 0,
  listing_count    INT NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SELECT attach_updated_at('agencies');
CREATE INDEX idx_agencies_owner ON public.agencies(owner_id);
CREATE INDEX idx_agencies_city  ON public.agencies(city);

CREATE TABLE public.agent_profiles (
  id               UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  agency_id        UUID REFERENCES public.agencies(id) ON DELETE SET NULL,
  license_number   TEXT,
  license_verified BOOLEAN NOT NULL DEFAULT FALSE,
  specializations  TEXT[] NOT NULL DEFAULT '{}',
  service_areas    cameroon_city[] NOT NULL DEFAULT '{}',
  languages        TEXT[] NOT NULL DEFAULT '{fr}',
  experience_years INT NOT NULL DEFAULT 0,
  rating_avg       DECIMAL(3,2) NOT NULL DEFAULT 0,
  rating_count     INT NOT NULL DEFAULT 0,
  listing_count    INT NOT NULL DEFAULT 0,
  sold_count       INT NOT NULL DEFAULT 0,
  commission_rate  DECIMAL(5,2) NOT NULL DEFAULT 3.00,
  bio              TEXT,
  is_featured      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SELECT attach_updated_at('agent_profiles');
CREATE INDEX idx_agent_agency ON public.agent_profiles(agency_id);

-- ============================================================
-- SECTION 3: PROPERTIES
-- ============================================================
CREATE TABLE public.property_categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  name_fr    TEXT NOT NULL,
  slug       TEXT NOT NULL UNIQUE,
  icon       TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.properties (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  agent_id         UUID REFERENCES public.agent_profiles(id) ON DELETE SET NULL,
  category_id      UUID REFERENCES public.property_categories(id),
  title            TEXT NOT NULL,
  title_fr         TEXT,
  slug             TEXT NOT NULL UNIQUE,
  description      TEXT,
  description_fr   TEXT,
  listing_type     listing_type NOT NULL DEFAULT 'sale',
  property_type    property_type NOT NULL,
  status           property_status NOT NULL DEFAULT 'draft',
  city             cameroon_city NOT NULL,
  neighborhood     TEXT,
  address          TEXT,
  latitude         DECIMAL(10,8),
  longitude        DECIMAL(11,8),
  price            BIGINT NOT NULL,
  price_negotiable BOOLEAN NOT NULL DEFAULT FALSE,
  currency         currency_code NOT NULL DEFAULT 'XAF',
  price_per        TEXT,
  bedrooms         INT,
  bathrooms        INT,
  toilets          INT,
  area_sqm         DECIMAL(10,2),
  plot_area_sqm    DECIMAL(10,2),
  floor_number     INT,
  total_floors     INT,
  year_built       INT,
  parking_spaces   INT NOT NULL DEFAULT 0,
  land_title       land_title_type NOT NULL DEFAULT 'none',
  title_number     TEXT,
  is_furnished     BOOLEAN NOT NULL DEFAULT FALSE,
  has_pool         BOOLEAN NOT NULL DEFAULT FALSE,
  has_garden       BOOLEAN NOT NULL DEFAULT FALSE,
  has_security     BOOLEAN NOT NULL DEFAULT FALSE,
  has_generator    BOOLEAN NOT NULL DEFAULT FALSE,
  has_borehole     BOOLEAN NOT NULL DEFAULT FALSE,
  is_featured      BOOLEAN NOT NULL DEFAULT FALSE,
  is_verified      BOOLEAN NOT NULL DEFAULT FALSE,
  is_urgent        BOOLEAN NOT NULL DEFAULT FALSE,
  view_count       INT NOT NULL DEFAULT 0,
  enquiry_count    INT NOT NULL DEFAULT 0,
  favorite_count   INT NOT NULL DEFAULT 0,
  search_vector    TSVECTOR,
  published_at     TIMESTAMPTZ,
  expires_at       TIMESTAMPTZ,
  sold_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SELECT attach_updated_at('properties');
CREATE INDEX idx_prop_owner    ON public.properties(owner_id);
CREATE INDEX idx_prop_agent    ON public.properties(agent_id);
CREATE INDEX idx_prop_city     ON public.properties(city);
CREATE INDEX idx_prop_status   ON public.properties(status);
CREATE INDEX idx_prop_type     ON public.properties(property_type);
CREATE INDEX idx_prop_listing  ON public.properties(listing_type);
CREATE INDEX idx_prop_price    ON public.properties(price);
CREATE INDEX idx_prop_search   ON public.properties USING GIN(search_vector);
CREATE INDEX idx_prop_location ON public.properties(latitude, longitude);

CREATE OR REPLACE FUNCTION properties_before_save() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := lower(regexp_replace(unaccent(NEW.title),'[^a-z0-9]+','-','g'))
                || '-' || substr(gen_random_uuid()::text,1,8);
  END IF;
  NEW.search_vector :=
    SETWEIGHT(TO_TSVECTOR('french', COALESCE(unaccent(NEW.title),'')), 'A') ||
    SETWEIGHT(TO_TSVECTOR('french', COALESCE(unaccent(COALESCE(NEW.description,'')),'')), 'B') ||
    SETWEIGHT(TO_TSVECTOR('simple', COALESCE(NEW.city::text,'')), 'C') ||
    SETWEIGHT(TO_TSVECTOR('simple', COALESCE(NEW.neighborhood,'')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER properties_before_save_trigger
  BEFORE INSERT OR UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION properties_before_save();

CREATE TABLE public.property_images (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  caption     TEXT,
  is_primary  BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order  INT NOT NULL DEFAULT 0,
  width       INT,
  height      INT,
  size_bytes  INT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_prop_images_prop ON public.property_images(property_id);

CREATE TABLE public.property_videos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id     UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  url             TEXT NOT NULL,
  thumbnail       TEXT,
  title           TEXT,
  duration_sec    INT,
  is_virtual_tour BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order      INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_prop_videos_prop ON public.property_videos(property_id);

CREATE TABLE public.property_amenities (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  category    TEXT NOT NULL,
  name        TEXT NOT NULL,
  icon        TEXT,
  has_feature BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(property_id, name)
);
CREATE INDEX idx_prop_amenities_prop ON public.property_amenities(property_id);

CREATE TABLE public.property_verifications (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id    UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  verified_by    UUID REFERENCES public.profiles(id),
  status         verification_status NOT NULL DEFAULT 'pending',
  title_document TEXT,
  survey_plan    TEXT,
  other_docs     TEXT[] NOT NULL DEFAULT '{}',
  notes          TEXT,
  verified_at    TIMESTAMPTZ,
  expires_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SELECT attach_updated_at('property_verifications');
CREATE INDEX idx_prop_verif_prop ON public.property_verifications(property_id);

CREATE TABLE public.property_views (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  viewer_id   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ip_address  TEXT,
  user_agent  TEXT,
  source      TEXT,
  viewed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_prop_views_prop   ON public.property_views(property_id);
CREATE INDEX idx_prop_views_viewer ON public.property_views(viewer_id);

CREATE TABLE public.property_favorites (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, property_id)
);
CREATE INDEX idx_prop_favs_user ON public.property_favorites(user_id);
CREATE INDEX idx_prop_favs_prop ON public.property_favorites(property_id);

CREATE TABLE public.saved_searches (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  search_type  TEXT NOT NULL DEFAULT 'property',
  filters      JSONB NOT NULL DEFAULT '{}',
  alert_email  BOOLEAN NOT NULL DEFAULT FALSE,
  alert_push   BOOLEAN NOT NULL DEFAULT FALSE,
  last_run_at  TIMESTAMPTZ,
  result_count INT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SELECT attach_updated_at('saved_searches');
CREATE INDEX idx_saved_searches_user ON public.saved_searches(user_id);

CREATE TABLE public.property_inquiries (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id  UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  sender_id    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name         TEXT NOT NULL,
  email        TEXT NOT NULL,
  phone        TEXT,
  message      TEXT NOT NULL,
  inquiry_type TEXT NOT NULL DEFAULT 'general',
  is_read      BOOLEAN NOT NULL DEFAULT FALSE,
  replied_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_prop_inq_prop   ON public.property_inquiries(property_id);
CREATE INDEX idx_prop_inq_sender ON public.property_inquiries(sender_id);

-- ============================================================
-- SECTION 4: VENDORS & MARKETPLACE
-- ============================================================
CREATE TABLE public.vendor_profiles (
  id                UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  store_name        TEXT NOT NULL,
  store_slug        TEXT NOT NULL UNIQUE,
  store_logo        TEXT,
  store_banner      TEXT,
  store_description TEXT,
  business_reg      TEXT,
  tax_id            TEXT,
  phone             TEXT,
  email             TEXT,
  website           TEXT,
  city              cameroon_city,
  address           TEXT,
  is_verified       BOOLEAN NOT NULL DEFAULT FALSE,
  is_featured       BOOLEAN NOT NULL DEFAULT FALSE,
  rating_avg        DECIMAL(3,2) NOT NULL DEFAULT 0,
  rating_count      INT NOT NULL DEFAULT 0,
  product_count     INT NOT NULL DEFAULT 0,
  order_count       INT NOT NULL DEFAULT 0,
  commission_rate   DECIMAL(5,2) NOT NULL DEFAULT 5.00,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SELECT attach_updated_at('vendor_profiles');
CREATE INDEX idx_vendor_slug ON public.vendor_profiles(store_slug);
CREATE INDEX idx_vendor_city ON public.vendor_profiles(city);

CREATE TABLE public.product_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id   UUID REFERENCES public.product_categories(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  name_fr     TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  icon        TEXT,
  image_url   TEXT,
  description TEXT,
  sort_order  INT NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_product_cat_parent ON public.product_categories(parent_id);

CREATE TABLE public.products (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id      UUID NOT NULL REFERENCES public.vendor_profiles(id) ON DELETE CASCADE,
  category_id    UUID REFERENCES public.product_categories(id),
  name           TEXT NOT NULL,
  name_fr        TEXT,
  slug           TEXT NOT NULL UNIQUE,
  description    TEXT,
  description_fr TEXT,
  sku            TEXT UNIQUE,
  brand          TEXT,
  model          TEXT,
  price          BIGINT NOT NULL,
  original_price BIGINT,
  currency       currency_code NOT NULL DEFAULT 'XAF',
  stock_qty      INT NOT NULL DEFAULT 0,
  min_order_qty  INT NOT NULL DEFAULT 1,
  max_order_qty  INT,
  unit           TEXT NOT NULL DEFAULT 'unit',
  weight_kg      DECIMAL(8,3),
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured    BOOLEAN NOT NULL DEFAULT FALSE,
  is_available   BOOLEAN NOT NULL DEFAULT TRUE,
  rating_avg     DECIMAL(3,2) NOT NULL DEFAULT 0,
  rating_count   INT NOT NULL DEFAULT 0,
  view_count     INT NOT NULL DEFAULT 0,
  order_count    INT NOT NULL DEFAULT 0,
  specifications JSONB NOT NULL DEFAULT '{}',
  tags           TEXT[] NOT NULL DEFAULT '{}',
  search_vector  TSVECTOR,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SELECT attach_updated_at('products');
CREATE INDEX idx_products_vendor   ON public.products(vendor_id);
CREATE INDEX idx_products_category ON public.products(category_id);
CREATE INDEX idx_products_price    ON public.products(price);
CREATE INDEX idx_products_search   ON public.products USING GIN(search_vector);
CREATE INDEX idx_products_tags     ON public.products USING GIN(tags);

CREATE TABLE public.product_images (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  alt_text   TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_product_images_prod ON public.product_images(product_id);

CREATE TABLE public.product_variants (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  sku        TEXT UNIQUE,
  price      BIGINT,
  stock_qty  INT NOT NULL DEFAULT 0,
  attributes JSONB NOT NULL DEFAULT '{}',
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SELECT attach_updated_at('product_variants');
CREATE INDEX idx_product_variants_prod ON public.product_variants(product_id);

CREATE TABLE public.inventory_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id    UUID REFERENCES public.product_variants(id) ON DELETE CASCADE,
  change_type   TEXT NOT NULL,
  quantity_delta INT NOT NULL,
  stock_before  INT NOT NULL,
  stock_after   INT NOT NULL,
  reference_id  UUID,
  notes         TEXT,
  created_by    UUID REFERENCES public.profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_inventory_prod ON public.inventory_logs(product_id);

CREATE TABLE public.cart_items (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE,
  quantity   INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, product_id, variant_id)
);
SELECT attach_updated_at('cart_items');
CREATE INDEX idx_cart_user ON public.cart_items(user_id);

CREATE TABLE public.orders (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id            UUID NOT NULL REFERENCES public.profiles(id),
  vendor_id           UUID NOT NULL REFERENCES public.vendor_profiles(id),
  status              order_status NOT NULL DEFAULT 'pending',
  subtotal            BIGINT NOT NULL,
  shipping_fee        BIGINT NOT NULL DEFAULT 0,
  discount_amount     BIGINT NOT NULL DEFAULT 0,
  commission          BIGINT NOT NULL DEFAULT 0,
  total               BIGINT NOT NULL,
  currency            currency_code NOT NULL DEFAULT 'XAF',
  shipping_name       TEXT,
  shipping_phone      TEXT,
  shipping_address    TEXT,
  shipping_city       cameroon_city,
  payment_status      payment_status NOT NULL DEFAULT 'pending',
  payment_provider    payment_provider,
  payment_ref         TEXT,
  paid_at             TIMESTAMPTZ,
  notes               TEXT,
  confirmed_at        TIMESTAMPTZ,
  shipped_at          TIMESTAMPTZ,
  delivered_at        TIMESTAMPTZ,
  cancelled_at        TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SELECT attach_updated_at('orders');
CREATE INDEX idx_orders_buyer   ON public.orders(buyer_id);
CREATE INDEX idx_orders_vendor  ON public.orders(vendor_id);
CREATE INDEX idx_orders_status  ON public.orders(status);
CREATE INDEX idx_orders_created ON public.orders(created_at DESC);

CREATE TABLE public.order_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id   UUID NOT NULL REFERENCES public.products(id),
  variant_id   UUID REFERENCES public.product_variants(id),
  product_name TEXT NOT NULL,
  quantity     INT NOT NULL CHECK (quantity > 0),
  unit_price   BIGINT NOT NULL,
  total_price  BIGINT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_order_items_order   ON public.order_items(order_id);
CREATE INDEX idx_order_items_product ON public.order_items(product_id);

-- ============================================================
-- SECTION 5: PROFESSIONAL SERVICES
-- ============================================================
CREATE TABLE public.professional_profiles (
  id               UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  profession_type  profession_type NOT NULL,
  company_name     TEXT,
  license_number   TEXT,
  license_verified BOOLEAN NOT NULL DEFAULT FALSE,
  specializations  TEXT[] NOT NULL DEFAULT '{}',
  service_areas    cameroon_city[] NOT NULL DEFAULT '{}',
  languages        TEXT[] NOT NULL DEFAULT '{fr}',
  experience_years INT NOT NULL DEFAULT 0,
  hourly_rate      BIGINT,
  day_rate         BIGINT,
  currency         currency_code NOT NULL DEFAULT 'XAF',
  rating_avg       DECIMAL(3,2) NOT NULL DEFAULT 0,
  rating_count     INT NOT NULL DEFAULT 0,
  project_count    INT NOT NULL DEFAULT 0,
  bio              TEXT,
  website          TEXT,
  is_available     BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured      BOOLEAN NOT NULL DEFAULT FALSE,
  is_verified      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (profession_type IN ('contractor','engineer','architect','lawyer'))
);
SELECT attach_updated_at('professional_profiles');
CREATE INDEX idx_prof_type  ON public.professional_profiles(profession_type);
CREATE INDEX idx_prof_areas ON public.professional_profiles USING GIN(service_areas);

CREATE TABLE public.portfolio_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  project_type    TEXT,
  city            cameroon_city,
  client_name     TEXT,
  budget_xaf      BIGINT,
  duration_months INT,
  completed_at    DATE,
  is_featured     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SELECT attach_updated_at('portfolio_items');
CREATE INDEX idx_portfolio_prof ON public.portfolio_items(professional_id);

CREATE TABLE public.portfolio_images (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES public.portfolio_items(id) ON DELETE CASCADE,
  url          TEXT NOT NULL,
  caption      TEXT,
  is_cover     BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order   INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_portfolio_images_item ON public.portfolio_images(portfolio_id);

CREATE TABLE public.service_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  name_fr     TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  icon        TEXT,
  description TEXT,
  sort_order  INT NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.service_listings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id   UUID REFERENCES public.service_categories(id),
  title         TEXT NOT NULL,
  description   TEXT,
  scope         TEXT,
  price_type    TEXT NOT NULL DEFAULT 'fixed',
  base_price    BIGINT,
  currency      currency_code NOT NULL DEFAULT 'XAF',
  delivery_days INT,
  service_areas cameroon_city[] NOT NULL DEFAULT '{}',
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured   BOOLEAN NOT NULL DEFAULT FALSE,
  rating_avg    DECIMAL(3,2) NOT NULL DEFAULT 0,
  rating_count  INT NOT NULL DEFAULT 0,
  booking_count INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SELECT attach_updated_at('service_listings');
CREATE INDEX idx_svc_listings_provider ON public.service_listings(provider_id);
CREATE INDEX idx_svc_listings_category ON public.service_listings(category_id);

CREATE TABLE public.service_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.service_categories(id),
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  budget_min  BIGINT,
  budget_max  BIGINT,
  currency    currency_code NOT NULL DEFAULT 'XAF',
  city        cameroon_city,
  address     TEXT,
  deadline    DATE,
  status      service_request_status NOT NULL DEFAULT 'open',
  attachments TEXT[] NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SELECT attach_updated_at('service_requests');
CREATE INDEX idx_svc_req_client ON public.service_requests(client_id);
CREATE INDEX idx_svc_req_status ON public.service_requests(status);
CREATE INDEX idx_svc_req_city   ON public.service_requests(city);

CREATE TABLE public.service_quotations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id    UUID NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  provider_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount        BIGINT NOT NULL,
  currency      currency_code NOT NULL DEFAULT 'XAF',
  timeline_days INT,
  proposal      TEXT NOT NULL,
  attachments   TEXT[] NOT NULL DEFAULT '{}',
  status        TEXT NOT NULL DEFAULT 'pending',
  expires_at    TIMESTAMPTZ,
  accepted_at   TIMESTAMPTZ,
  rejected_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(request_id, provider_id)
);
SELECT attach_updated_at('service_quotations');
CREATE INDEX idx_svc_quot_request  ON public.service_quotations(request_id);
CREATE INDEX idx_svc_quot_provider ON public.service_quotations(provider_id);

CREATE TABLE public.service_contracts (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id         UUID REFERENCES public.service_requests(id),
  quotation_id       UUID REFERENCES public.service_quotations(id),
  client_id          UUID NOT NULL REFERENCES public.profiles(id),
  provider_id        UUID NOT NULL REFERENCES public.profiles(id),
  title              TEXT NOT NULL,
  scope              TEXT NOT NULL,
  deliverables       TEXT,
  total_amount       BIGINT NOT NULL,
  currency           currency_code NOT NULL DEFAULT 'XAF',
  start_date         DATE,
  end_date           DATE,
  status             TEXT NOT NULL DEFAULT 'draft',
  client_signed      BOOLEAN NOT NULL DEFAULT FALSE,
  provider_signed    BOOLEAN NOT NULL DEFAULT FALSE,
  client_signed_at   TIMESTAMPTZ,
  provider_signed_at TIMESTAMPTZ,
  document_url       TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SELECT attach_updated_at('service_contracts');
CREATE INDEX idx_svc_contracts_client   ON public.service_contracts(client_id);
CREATE INDEX idx_svc_contracts_provider ON public.service_contracts(provider_id);

CREATE TABLE public.service_bookings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id       UUID NOT NULL REFERENCES public.service_listings(id) ON DELETE CASCADE,
  client_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider_id      UUID NOT NULL REFERENCES public.profiles(id),
  status           booking_status NOT NULL DEFAULT 'pending',
  scheduled_at     TIMESTAMPTZ,
  started_at       TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  amount           BIGINT NOT NULL,
  currency         currency_code NOT NULL DEFAULT 'XAF',
  notes            TEXT,
  payment_status   payment_status NOT NULL DEFAULT 'pending',
  payment_provider payment_provider,
  payment_ref      TEXT,
  paid_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SELECT attach_updated_at('service_bookings');
CREATE INDEX idx_svc_book_client   ON public.service_bookings(client_id);
CREATE INDEX idx_svc_book_provider ON public.service_bookings(provider_id);
CREATE INDEX idx_svc_book_listing  ON public.service_bookings(listing_id);

-- ============================================================
-- SECTION 6: EQUIPMENT & VEHICLE RENTALS
-- ============================================================
CREATE TABLE public.rental_categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  name_fr    TEXT NOT NULL,
  slug       TEXT NOT NULL UNIQUE,
  type       TEXT NOT NULL DEFAULT 'equipment',
  icon       TEXT,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.rental_listings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id     UUID REFERENCES public.rental_categories(id),
  type            TEXT NOT NULL DEFAULT 'equipment',
  name            TEXT NOT NULL,
  description     TEXT,
  make            TEXT,
  model_name      TEXT,
  year            INT,
  condition       TEXT NOT NULL DEFAULT 'good',
  daily_rate      BIGINT NOT NULL,
  weekly_rate     BIGINT,
  monthly_rate    BIGINT,
  deposit_amount  BIGINT NOT NULL DEFAULT 0,
  currency        currency_code NOT NULL DEFAULT 'XAF',
  city            cameroon_city,
  address         TEXT,
  images          TEXT[] NOT NULL DEFAULT '{}',
  min_rental_days INT NOT NULL DEFAULT 1,
  max_rental_days INT,
  is_available    BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured     BOOLEAN NOT NULL DEFAULT FALSE,
  rating_avg      DECIMAL(3,2) NOT NULL DEFAULT 0,
  rating_count    INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SELECT attach_updated_at('rental_listings');
CREATE INDEX idx_rental_owner ON public.rental_listings(owner_id);
CREATE INDEX idx_rental_type  ON public.rental_listings(type);
CREATE INDEX idx_rental_city  ON public.rental_listings(city);

CREATE TABLE public.rental_bookings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id          UUID NOT NULL REFERENCES public.rental_listings(id) ON DELETE CASCADE,
  renter_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  owner_id            UUID NOT NULL REFERENCES public.profiles(id),
  start_date          DATE NOT NULL,
  end_date            DATE NOT NULL,
  days_count          INT NOT NULL,
  daily_rate          BIGINT NOT NULL,
  subtotal            BIGINT NOT NULL,
  deposit             BIGINT NOT NULL DEFAULT 0,
  total               BIGINT NOT NULL,
  currency            currency_code NOT NULL DEFAULT 'XAF',
  status              booking_status NOT NULL DEFAULT 'pending',
  pickup_notes        TEXT,
  return_notes        TEXT,
  payment_status      payment_status NOT NULL DEFAULT 'pending',
  payment_provider    payment_provider,
  payment_ref         TEXT,
  paid_at             TIMESTAMPTZ,
  deposit_refunded_at TIMESTAMPTZ,
  checked_out_at      TIMESTAMPTZ,
  returned_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_date > start_date)
);
SELECT attach_updated_at('rental_bookings');
CREATE INDEX idx_rental_book_listing ON public.rental_bookings(listing_id);
CREATE INDEX idx_rental_book_renter  ON public.rental_bookings(renter_id);
CREATE INDEX idx_rental_book_dates   ON public.rental_bookings(start_date, end_date);

-- ============================================================
-- SECTION 7: COMMUNITY FORUM
-- ============================================================
CREATE TABLE public.forum_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id   UUID REFERENCES public.forum_categories(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  name_fr     TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT,
  icon        TEXT,
  color       TEXT,
  sort_order  INT NOT NULL DEFAULT 0,
  post_count  INT NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.forum_posts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id   UUID NOT NULL REFERENCES public.forum_categories(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  content       TEXT NOT NULL,
  content_html  TEXT,
  status        post_status NOT NULL DEFAULT 'active',
  is_pinned     BOOLEAN NOT NULL DEFAULT FALSE,
  is_closed     BOOLEAN NOT NULL DEFAULT FALSE,
  is_featured   BOOLEAN NOT NULL DEFAULT FALSE,
  view_count    INT NOT NULL DEFAULT 0,
  reply_count   INT NOT NULL DEFAULT 0,
  like_count    INT NOT NULL DEFAULT 0,
  last_reply_at TIMESTAMPTZ,
  last_reply_by UUID REFERENCES public.profiles(id),
  search_vector TSVECTOR,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SELECT attach_updated_at('forum_posts');
CREATE INDEX idx_forum_posts_author   ON public.forum_posts(author_id);
CREATE INDEX idx_forum_posts_category ON public.forum_posts(category_id);
CREATE INDEX idx_forum_posts_status   ON public.forum_posts(status);
CREATE INDEX idx_forum_posts_search   ON public.forum_posts USING GIN(search_vector);
CREATE INDEX idx_forum_posts_created  ON public.forum_posts(created_at DESC);

CREATE TABLE public.forum_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  author_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_id   UUID REFERENCES public.forum_comments(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  is_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  like_count  INT NOT NULL DEFAULT 0,
  is_hidden   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SELECT attach_updated_at('forum_comments');
CREATE INDEX idx_forum_comments_post   ON public.forum_comments(post_id);
CREATE INDEX idx_forum_comments_author ON public.forum_comments(author_id);
CREATE INDEX idx_forum_comments_parent ON public.forum_comments(parent_id);

CREATE TABLE public.forum_reactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  target_id   UUID NOT NULL,
  reaction    reaction_type NOT NULL DEFAULT 'like',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, target_type, target_id)
);
CREATE INDEX idx_forum_reactions_target ON public.forum_reactions(target_type, target_id);
CREATE INDEX idx_forum_reactions_user   ON public.forum_reactions(user_id);

-- ============================================================
-- SECTION 8: MESSAGING
-- ============================================================
CREATE TABLE public.conversations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type         TEXT NOT NULL DEFAULT 'direct',
  title        TEXT,
  context_type TEXT,
  context_id   UUID,
  is_archived  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SELECT attach_updated_at('conversations');

CREATE TABLE public.conversation_participants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role            TEXT NOT NULL DEFAULT 'member',
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_read_at    TIMESTAMPTZ,
  is_muted        BOOLEAN NOT NULL DEFAULT FALSE,
  left_at         TIMESTAMPTZ,
  UNIQUE(conversation_id, user_id)
);
CREATE INDEX idx_conv_participants_user ON public.conversation_participants(user_id);
CREATE INDEX idx_conv_participants_conv ON public.conversation_participants(conversation_id);

CREATE TABLE public.messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  content_type    TEXT NOT NULL DEFAULT 'text',
  reply_to_id     UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  is_edited       BOOLEAN NOT NULL DEFAULT FALSE,
  edited_at       TIMESTAMPTZ,
  is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at      TIMESTAMPTZ,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_messages_conv   ON public.messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON public.messages(sender_id);

CREATE TABLE public.message_attachments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  file_name  TEXT NOT NULL,
  file_type  TEXT NOT NULL,
  file_size  INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_msg_attach_msg ON public.message_attachments(message_id);

-- ============================================================
-- SECTION 9: NOTIFICATIONS
-- ============================================================
CREATE TABLE public.notification_preferences (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  email_enabled     BOOLEAN NOT NULL DEFAULT TRUE,
  push_enabled      BOOLEAN NOT NULL DEFAULT TRUE,
  sms_enabled       BOOLEAN NOT NULL DEFAULT FALSE,
  types             JSONB NOT NULL DEFAULT '{}',
  quiet_hours_start TIME,
  quiet_hours_end   TIME,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SELECT attach_updated_at('notification_preferences');

CREATE TABLE public.notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type       notification_type NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  data       JSONB NOT NULL DEFAULT '{}',
  action_url TEXT,
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  read_at    TIMESTAMPTZ,
  sent_email BOOLEAN NOT NULL DEFAULT FALSE,
  sent_push  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notif_user   ON public.notifications(user_id, created_at DESC);
CREATE INDEX idx_notif_unread ON public.notifications(user_id) WHERE NOT is_read;

-- ============================================================
-- SECTION 10: REVIEWS
-- ============================================================
CREATE TABLE public.reviews (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_type   TEXT NOT NULL,
  target_id     UUID NOT NULL,
  rating        INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title         TEXT,
  body          TEXT,
  cleanliness   INT CHECK (cleanliness BETWEEN 1 AND 5),
  communication INT CHECK (communication BETWEEN 1 AND 5),
  value         INT CHECK (value BETWEEN 1 AND 5),
  accuracy      INT CHECK (accuracy BETWEEN 1 AND 5),
  images        TEXT[] NOT NULL DEFAULT '{}',
  is_verified   BOOLEAN NOT NULL DEFAULT FALSE,
  is_featured   BOOLEAN NOT NULL DEFAULT FALSE,
  is_hidden     BOOLEAN NOT NULL DEFAULT FALSE,
  helpful_count INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(reviewer_id, target_type, target_id)
);
SELECT attach_updated_at('reviews');
CREATE INDEX idx_reviews_reviewer ON public.reviews(reviewer_id);
CREATE INDEX idx_reviews_target   ON public.reviews(target_type, target_id);

CREATE TABLE public.review_responses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id    UUID NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE UNIQUE,
  responder_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body         TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SELECT attach_updated_at('review_responses');

-- ============================================================
-- SECTION 11: PAYMENTS, WALLETS & ESCROW
-- ============================================================
CREATE TABLE public.wallets (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  balance    BIGINT NOT NULL DEFAULT 0 CHECK (balance >= 0),
  locked     BIGINT NOT NULL DEFAULT 0 CHECK (locked >= 0),
  currency   currency_code NOT NULL DEFAULT 'XAF',
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SELECT attach_updated_at('wallets');

CREATE TABLE public.wallet_transactions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id      UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES public.profiles(id),
  type           TEXT NOT NULL,
  amount         BIGINT NOT NULL CHECK (amount > 0),
  balance_before BIGINT NOT NULL,
  balance_after  BIGINT NOT NULL,
  currency       currency_code NOT NULL DEFAULT 'XAF',
  reference_type TEXT,
  reference_id   UUID,
  description    TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_wallet_tx_wallet ON public.wallet_transactions(wallet_id);
CREATE INDEX idx_wallet_tx_user   ON public.wallet_transactions(user_id);

CREATE TABLE public.transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payer_id        UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  payee_id        UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  type            transaction_type NOT NULL,
  status          payment_status NOT NULL DEFAULT 'pending',
  amount          BIGINT NOT NULL CHECK (amount > 0),
  fee             BIGINT NOT NULL DEFAULT 0,
  net_amount      BIGINT NOT NULL,
  currency        currency_code NOT NULL DEFAULT 'XAF',
  provider        payment_provider,
  provider_ref    TEXT,
  provider_status TEXT,
  provider_meta   JSONB NOT NULL DEFAULT '{}',
  reference_type  TEXT,
  reference_id    UUID,
  escrow_id       UUID,
  description     TEXT,
  initiated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  failed_at       TIMESTAMPTZ,
  failure_reason  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SELECT attach_updated_at('transactions');
CREATE INDEX idx_tx_payer     ON public.transactions(payer_id);
CREATE INDEX idx_tx_payee     ON public.transactions(payee_id);
CREATE INDEX idx_tx_type      ON public.transactions(type);
CREATE INDEX idx_tx_status    ON public.transactions(status);
CREATE INDEX idx_tx_reference ON public.transactions(reference_type, reference_id);

CREATE TABLE public.escrow_accounts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_type   TEXT NOT NULL,
  reference_id     UUID NOT NULL,
  payer_id         UUID NOT NULL REFERENCES public.profiles(id),
  payee_id         UUID NOT NULL REFERENCES public.profiles(id),
  amount           BIGINT NOT NULL CHECK (amount > 0),
  currency         currency_code NOT NULL DEFAULT 'XAF',
  platform_fee     BIGINT NOT NULL DEFAULT 0,
  platform_fee_pct DECIMAL(5,2) NOT NULL DEFAULT 2.50,
  status           escrow_status NOT NULL DEFAULT 'pending',
  funded_at        TIMESTAMPTZ,
  release_date     TIMESTAMPTZ,
  released_at      TIMESTAMPTZ,
  disputed_at      TIMESTAMPTZ,
  resolved_at      TIMESTAMPTZ,
  dispute_reason   TEXT,
  resolution_notes TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SELECT attach_updated_at('escrow_accounts');
CREATE INDEX idx_escrow_payer  ON public.escrow_accounts(payer_id);
CREATE INDEX idx_escrow_payee  ON public.escrow_accounts(payee_id);
CREATE INDEX idx_escrow_status ON public.escrow_accounts(status);

-- Forward FK: transactions -> escrow_accounts
ALTER TABLE public.transactions
  ADD CONSTRAINT fk_transactions_escrow
  FOREIGN KEY (escrow_id) REFERENCES public.escrow_accounts(id) ON DELETE SET NULL;

CREATE TABLE public.escrow_milestones (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escrow_id     UUID NOT NULL REFERENCES public.escrow_accounts(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT,
  amount        BIGINT NOT NULL CHECK (amount > 0),
  percentage    DECIMAL(5,2),
  status        milestone_status NOT NULL DEFAULT 'pending',
  due_date      DATE,
  completed_at  TIMESTAMPTZ,
  approved_at   TIMESTAMPTZ,
  disputed_at   TIMESTAMPTZ,
  evidence_urls TEXT[] NOT NULL DEFAULT '{}',
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SELECT attach_updated_at('escrow_milestones');
CREATE INDEX idx_escrow_milestones_escrow ON public.escrow_milestones(escrow_id);

CREATE TABLE public.escrow_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escrow_id   UUID NOT NULL REFERENCES public.escrow_accounts(id) ON DELETE CASCADE,
  actor_id    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type  TEXT NOT NULL,
  description TEXT,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_escrow_events_escrow ON public.escrow_events(escrow_id);

CREATE TABLE public.payouts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount          BIGINT NOT NULL CHECK (amount > 0),
  fee             BIGINT NOT NULL DEFAULT 0,
  net_amount      BIGINT NOT NULL,
  currency        currency_code NOT NULL DEFAULT 'XAF',
  provider        payment_provider NOT NULL,
  account_details JSONB NOT NULL DEFAULT '{}',
  status          payment_status NOT NULL DEFAULT 'pending',
  provider_ref    TEXT,
  initiated_at    TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  failed_at       TIMESTAMPTZ,
  failure_reason  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SELECT attach_updated_at('payouts');
CREATE INDEX idx_payouts_recipient ON public.payouts(recipient_id);
CREATE INDEX idx_payouts_status    ON public.payouts(status);

CREATE TABLE public.commission_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id  UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  earner_id       UUID NOT NULL REFERENCES public.profiles(id),
  commission_type TEXT NOT NULL,
  reference_type  TEXT NOT NULL,
  reference_id    UUID NOT NULL,
  amount          BIGINT NOT NULL,
  rate_pct        DECIMAL(5,2) NOT NULL,
  currency        currency_code NOT NULL DEFAULT 'XAF',
  status          TEXT NOT NULL DEFAULT 'pending',
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_commission_earner ON public.commission_records(earner_id);

-- ============================================================
-- SECTION 12: JOBS & TENDERS
-- ============================================================
CREATE TABLE public.jobs (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poster_id            UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title                TEXT NOT NULL,
  description          TEXT NOT NULL,
  requirements         TEXT,
  responsibilities     TEXT,
  category             TEXT,
  job_type             job_type NOT NULL DEFAULT 'contract',
  city                 cameroon_city,
  address              TEXT,
  is_remote            BOOLEAN NOT NULL DEFAULT FALSE,
  salary_min           BIGINT,
  salary_max           BIGINT,
  currency             currency_code NOT NULL DEFAULT 'XAF',
  salary_period        TEXT NOT NULL DEFAULT 'month',
  experience_years_min INT NOT NULL DEFAULT 0,
  skills_required      TEXT[] NOT NULL DEFAULT '{}',
  status               job_status NOT NULL DEFAULT 'draft',
  application_count    INT NOT NULL DEFAULT 0,
  view_count           INT NOT NULL DEFAULT 0,
  deadline             DATE,
  published_at         TIMESTAMPTZ,
  expires_at           TIMESTAMPTZ,
  closed_at            TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SELECT attach_updated_at('jobs');
CREATE INDEX idx_jobs_poster ON public.jobs(poster_id);
CREATE INDEX idx_jobs_status ON public.jobs(status);
CREATE INDEX idx_jobs_city   ON public.jobs(city);
CREATE INDEX idx_jobs_type   ON public.jobs(job_type);

CREATE TABLE public.job_applications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id          UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  applicant_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cover_letter    TEXT,
  cv_url          TEXT,
  portfolio_url   TEXT,
  expected_salary BIGINT,
  status          application_status NOT NULL DEFAULT 'submitted',
  notes           TEXT,
  applied_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at     TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(job_id, applicant_id)
);
SELECT attach_updated_at('job_applications');
CREATE INDEX idx_job_apps_job       ON public.job_applications(job_id);
CREATE INDEX idx_job_apps_applicant ON public.job_applications(applicant_id);
CREATE INDEX idx_job_apps_status    ON public.job_applications(status);

CREATE TABLE public.tenders (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poster_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title               TEXT NOT NULL,
  description         TEXT NOT NULL,
  scope_of_work       TEXT,
  requirements        TEXT,
  category            TEXT,
  city                cameroon_city,
  address             TEXT,
  budget_min          BIGINT,
  budget_max          BIGINT,
  currency            currency_code NOT NULL DEFAULT 'XAF',
  status              tender_status NOT NULL DEFAULT 'draft',
  documents           TEXT[] NOT NULL DEFAULT '{}',
  submission_deadline DATE NOT NULL,
  start_date          DATE,
  completion_date     DATE,
  bid_count           INT NOT NULL DEFAULT 0,
  published_at        TIMESTAMPTZ,
  awarded_at          TIMESTAMPTZ,
  awarded_to          UUID REFERENCES public.profiles(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SELECT attach_updated_at('tenders');
CREATE INDEX idx_tenders_poster ON public.tenders(poster_id);
CREATE INDEX idx_tenders_status ON public.tenders(status);
CREATE INDEX idx_tenders_city   ON public.tenders(city);

CREATE TABLE public.tender_bids (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id     UUID NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
  bidder_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount        BIGINT NOT NULL,
  currency      currency_code NOT NULL DEFAULT 'XAF',
  timeline_days INT,
  proposal      TEXT NOT NULL,
  documents     TEXT[] NOT NULL DEFAULT '{}',
  status        TEXT NOT NULL DEFAULT 'submitted',
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tender_id, bidder_id)
);
SELECT attach_updated_at('tender_bids');
CREATE INDEX idx_tender_bids_tender ON public.tender_bids(tender_id);
CREATE INDEX idx_tender_bids_bidder ON public.tender_bids(bidder_id);

-- ============================================================
-- SECTION 13: ADMIN & MODERATION
-- ============================================================
CREATE TABLE public.moderation_reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_type   TEXT NOT NULL,
  target_id     UUID NOT NULL,
  report_type   report_type NOT NULL,
  reason        TEXT NOT NULL,
  evidence_urls TEXT[] NOT NULL DEFAULT '{}',
  status        report_status NOT NULL DEFAULT 'pending',
  reviewed_by   UUID REFERENCES public.profiles(id),
  resolution    TEXT,
  action_taken  TEXT,
  reported_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at   TIMESTAMPTZ
);
CREATE INDEX idx_mod_reports_reporter ON public.moderation_reports(reporter_id);
CREATE INDEX idx_mod_reports_target   ON public.moderation_reports(target_type, target_id);
CREATE INDEX idx_mod_reports_status   ON public.moderation_reports(status);

CREATE TABLE public.admin_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action      TEXT NOT NULL,
  target_type TEXT,
  target_id   UUID,
  old_data    JSONB,
  new_data    JSONB,
  ip_address  TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_admin_logs_actor   ON public.admin_logs(actor_id);
CREATE INDEX idx_admin_logs_created ON public.admin_logs(created_at DESC);

CREATE TABLE public.activity_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  entity_type TEXT,
  entity_id   UUID,
  metadata    JSONB NOT NULL DEFAULT '{}',
  ip_address  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_activity_user    ON public.activity_logs(user_id);
CREATE INDEX idx_activity_created ON public.activity_logs(created_at DESC);

CREATE TABLE public.announcements (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id  UUID NOT NULL REFERENCES public.profiles(id),
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  type       TEXT NOT NULL DEFAULT 'info',
  audience   TEXT NOT NULL DEFAULT 'all',
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  starts_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.platform_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'string',
  description TEXT,
  updated_by  UUID REFERENCES public.profiles(id),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- RATING REFRESH TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION refresh_rating() RETURNS TRIGGER AS $$
DECLARE
  v_type  TEXT;
  v_id    UUID;
  v_avg   DECIMAL(3,2);
  v_count INT;
BEGIN
  IF TG_OP = 'DELETE' THEN v_type := OLD.target_type; v_id := OLD.target_id;
  ELSE v_type := NEW.target_type; v_id := NEW.target_id; END IF;

  SELECT ROUND(AVG(rating)::NUMERIC,2), COUNT(*) INTO v_avg, v_count
  FROM public.reviews WHERE target_type = v_type AND target_id = v_id AND NOT is_hidden;

  v_avg := COALESCE(v_avg,0); v_count := COALESCE(v_count,0);

  IF    v_type = 'vendor'   THEN UPDATE public.vendor_profiles      SET rating_avg=v_avg, rating_count=v_count WHERE id=v_id;
  ELSIF v_type = 'agent'    THEN UPDATE public.agent_profiles       SET rating_avg=v_avg, rating_count=v_count WHERE id=v_id;
  ELSIF v_type IN ('contractor','engineer','architect','lawyer')
                            THEN UPDATE public.professional_profiles SET rating_avg=v_avg, rating_count=v_count WHERE id=v_id;
  ELSIF v_type = 'product'  THEN UPDATE public.products             SET rating_avg=v_avg, rating_count=v_count WHERE id=v_id;
  ELSIF v_type = 'rental'   THEN UPDATE public.rental_listings      SET rating_avg=v_avg, rating_count=v_count WHERE id=v_id;
  ELSIF v_type = 'service'  THEN UPDATE public.service_listings     SET rating_avg=v_avg, rating_count=v_count WHERE id=v_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_refresh_rating
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION refresh_rating();

-- ============================================================
-- SEED DATA
-- ============================================================
INSERT INTO public.property_categories (name,name_fr,slug,icon) VALUES
  ('Residential','Résidentiel','residential','house'),
  ('Commercial','Commercial','commercial','building'),
  ('Industrial','Industriel','industrial','warehouse'),
  ('Land','Terrain','land','map'),
  ('Agricultural','Agricole','agricultural','tree');

INSERT INTO public.service_categories (name,name_fr,slug,icon) VALUES
  ('Construction','Construction','construction','hard-hat'),
  ('Plumbing','Plomberie','plumbing','wrench'),
  ('Electrical','Électricité','electrical','zap'),
  ('Interior Design','Design Intérieur','interior-design','palette'),
  ('Architecture','Architecture','architecture','drafting-compass'),
  ('Legal Services','Services Juridiques','legal-services','scale'),
  ('Surveying','Géomètre','surveying','ruler'),
  ('Landscaping','Paysagisme','landscaping','tree'),
  ('Security','Sécurité','security','shield'),
  ('Cleaning','Nettoyage','cleaning','sparkles');

INSERT INTO public.product_categories (name,name_fr,slug) VALUES
  ('Cement & Concrete','Ciment & Béton','cement-concrete'),
  ('Steel & Metal','Acier & Métal','steel-metal'),
  ('Timber & Wood','Bois & Timber','timber-wood'),
  ('Bricks & Blocks','Briques & Blocs','bricks-blocks'),
  ('Roofing','Toiture','roofing'),
  ('Tiles & Flooring','Carrelage & Sols','tiles-flooring'),
  ('Paint & Coatings','Peinture & Revêtements','paint-coatings'),
  ('Plumbing Supplies','Fournitures Plomberie','plumbing-supplies'),
  ('Electrical Supplies','Fournitures Électriques','electrical-supplies'),
  ('Tools & Equipment','Outils & Équipements','tools-equipment'),
  ('Doors & Windows','Portes & Fenêtres','doors-windows'),
  ('Sanitary Ware','Sanitaires','sanitary-ware');

INSERT INTO public.rental_categories (name,name_fr,slug,type) VALUES
  ('Heavy Machinery','Machines Lourdes','heavy-machinery','equipment'),
  ('Power Tools','Outillage Électrique','power-tools','equipment'),
  ('Scaffolding','Échafaudage','scaffolding','equipment'),
  ('Generators','Groupes Électrogènes','generators','equipment'),
  ('Trucks','Camions','trucks','vehicle'),
  ('Excavators','Excavatrices','excavators','vehicle'),
  ('Cranes','Grues','cranes','vehicle'),
  ('Pickup & Vans','Pickups & Vans','pickup-vans','vehicle');

INSERT INTO public.forum_categories (name,name_fr,slug,description) VALUES
  ('Real Estate Market','Marché Immobilier','real-estate-market','Cameroon property market discussions'),
  ('Construction Tips','Conseils Construction','construction-tips','Share construction knowledge'),
  ('Legal & Documents','Juridique & Documents','legal-documents','Property law and documentation'),
  ('Materials & Pricing','Matériaux & Prix','materials-pricing','Building material prices and quality'),
  ('General Discussion','Discussion Générale','general-discussion','Off-topic discussions');

INSERT INTO public.platform_settings (key,value,type,description) VALUES
  ('platform_commission_pct',  '2.50', 'number',  'Platform commission on property transactions (%)'),
  ('agent_commission_pct',     '3.00', 'number',  'Default agent commission rate (%)'),
  ('vendor_commission_pct',    '5.00', 'number',  'Platform commission on product sales (%)'),
  ('escrow_auto_release_days', '30',   'number',  'Days before auto-release of escrow funds'),
  ('max_property_images',      '20',   'number',  'Maximum images per property listing'),
  ('max_product_images',       '10',   'number',  'Maximum images per product'),
  ('featured_listing_fee_xaf', '15000','number',  'Fee for featured property listing (XAF)'),
  ('min_withdrawal_xaf',       '5000', 'number',  'Minimum wallet withdrawal (XAF)'),
  ('kyc_required_for_seller',  'true', 'boolean', 'Require KYC to list properties'),
  ('currency',                 'XAF',  'string',  'Default platform currency');

-- ============================================================
-- REALTIME SUBSCRIPTIONS
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.escrow_accounts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.escrow_milestones;
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rental_bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.property_inquiries;

-- ============================================================
-- ROW LEVEL SECURITY — enable on all tables
-- ============================================================
ALTER TABLE public.profiles                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_verifications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phone_verifications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_records               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agencies                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_categories       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_images           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_videos           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_amenities        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_verifications    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_views            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_favorites        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_searches            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_inquiries        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_logs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_items           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_images          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_categories        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_listings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_requests          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_quotations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_contracts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_bookings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_categories         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_listings           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_bookings           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_categories          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_posts               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_comments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_reactions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_attachments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_responses          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_accounts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_milestones         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_events             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_records        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenders                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tender_bids               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_reports        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings         ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- profiles
CREATE POLICY "profiles_public_read"  ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_own_update"   ON public.profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "profiles_admin_all"    ON public.profiles FOR ALL    USING (is_admin());

-- verifications
CREATE POLICY "email_verif_own"  ON public.email_verifications FOR ALL USING (user_id = auth.uid());
CREATE POLICY "email_verif_adm"  ON public.email_verifications FOR ALL USING (is_admin());
CREATE POLICY "phone_verif_own"  ON public.phone_verifications FOR ALL USING (user_id = auth.uid());
CREATE POLICY "phone_verif_adm"  ON public.phone_verifications FOR ALL USING (is_admin());

-- kyc
CREATE POLICY "kyc_own_select" ON public.kyc_records FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "kyc_own_insert" ON public.kyc_records FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "kyc_mod_all"    ON public.kyc_records FOR ALL    USING (is_moderator());

-- user_permissions
CREATE POLICY "uperm_own"   ON public.user_permissions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "uperm_admin" ON public.user_permissions FOR ALL    USING (is_admin());

-- user_sessions
CREATE POLICY "usess_own" ON public.user_sessions FOR ALL USING (user_id = auth.uid());

-- agencies
CREATE POLICY "agencies_read"   ON public.agencies FOR SELECT USING (is_active OR owner_id = auth.uid() OR is_admin());
CREATE POLICY "agencies_insert" ON public.agencies FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "agencies_update" ON public.agencies FOR UPDATE USING (owner_id = auth.uid() OR is_admin());
CREATE POLICY "agencies_delete" ON public.agencies FOR DELETE USING (owner_id = auth.uid() OR is_admin());

-- agent_profiles
CREATE POLICY "agent_prof_read" ON public.agent_profiles FOR SELECT USING (true);
CREATE POLICY "agent_prof_own"  ON public.agent_profiles FOR ALL    USING (id = auth.uid() OR is_admin());

-- property_categories
CREATE POLICY "propcat_read"  ON public.property_categories FOR SELECT USING (is_active OR is_admin());
CREATE POLICY "propcat_admin" ON public.property_categories FOR ALL    USING (is_admin());

-- properties
CREATE POLICY "prop_read"   ON public.properties FOR SELECT USING (
  status = 'active' OR owner_id = auth.uid() OR agent_id = auth.uid() OR is_admin()
);
CREATE POLICY "prop_insert" ON public.properties FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "prop_update" ON public.properties FOR UPDATE USING (owner_id = auth.uid() OR agent_id = auth.uid() OR is_admin());
CREATE POLICY "prop_delete" ON public.properties FOR DELETE USING (owner_id = auth.uid() OR is_admin());

-- property sub-tables
CREATE POLICY "propimg_read"  ON public.property_images FOR SELECT USING (true);
CREATE POLICY "propimg_own"   ON public.property_images FOR ALL USING (
  EXISTS(SELECT 1 FROM public.properties WHERE id = property_id AND (owner_id = auth.uid() OR agent_id = auth.uid()))
  OR is_admin()
);
CREATE POLICY "propvid_read"  ON public.property_videos FOR SELECT USING (true);
CREATE POLICY "propvid_own"   ON public.property_videos FOR ALL USING (
  EXISTS(SELECT 1 FROM public.properties WHERE id = property_id AND (owner_id = auth.uid() OR agent_id = auth.uid()))
  OR is_admin()
);
CREATE POLICY "propamen_read" ON public.property_amenities FOR SELECT USING (true);
CREATE POLICY "propamen_own"  ON public.property_amenities FOR ALL USING (
  EXISTS(SELECT 1 FROM public.properties WHERE id = property_id AND (owner_id = auth.uid() OR agent_id = auth.uid()))
  OR is_admin()
);
CREATE POLICY "propverif_read" ON public.property_verifications FOR SELECT USING (
  EXISTS(SELECT 1 FROM public.properties WHERE id = property_id AND owner_id = auth.uid()) OR is_moderator()
);
CREATE POLICY "propverif_mod"  ON public.property_verifications FOR ALL USING (is_moderator());
CREATE POLICY "propview_insert" ON public.property_views FOR INSERT WITH CHECK (true);
CREATE POLICY "propview_read"   ON public.property_views FOR SELECT USING (
  EXISTS(SELECT 1 FROM public.properties WHERE id = property_id AND owner_id = auth.uid()) OR is_admin()
);
CREATE POLICY "propfav_own"     ON public.property_favorites FOR ALL USING (user_id = auth.uid());
CREATE POLICY "savedsearch_own" ON public.saved_searches FOR ALL USING (user_id = auth.uid());
CREATE POLICY "propinq_insert"  ON public.property_inquiries FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "propinq_read"    ON public.property_inquiries FOR SELECT USING (
  sender_id = auth.uid()
  OR EXISTS(SELECT 1 FROM public.properties WHERE id = property_id AND owner_id = auth.uid())
  OR is_admin()
);

-- vendor_profiles
CREATE POLICY "vendor_read" ON public.vendor_profiles FOR SELECT USING (true);
CREATE POLICY "vendor_own"  ON public.vendor_profiles FOR ALL    USING (id = auth.uid() OR is_admin());

-- product_categories
CREATE POLICY "prodcat_read"  ON public.product_categories FOR SELECT USING (is_active OR is_admin());
CREATE POLICY "prodcat_admin" ON public.product_categories FOR ALL    USING (is_admin());

-- products
CREATE POLICY "prod_read"   ON public.products FOR SELECT USING (is_active OR vendor_id = auth.uid() OR is_admin());
CREATE POLICY "prod_insert" ON public.products FOR INSERT WITH CHECK (vendor_id = auth.uid());
CREATE POLICY "prod_update" ON public.products FOR UPDATE USING (vendor_id = auth.uid() OR is_admin());
CREATE POLICY "prod_delete" ON public.products FOR DELETE USING (vendor_id = auth.uid() OR is_admin());

CREATE POLICY "prodimg_read" ON public.product_images FOR SELECT USING (true);
CREATE POLICY "prodimg_own"  ON public.product_images FOR ALL USING (
  EXISTS(SELECT 1 FROM public.products WHERE id = product_id AND vendor_id = auth.uid()) OR is_admin()
);
CREATE POLICY "prodvar_read" ON public.product_variants FOR SELECT USING (true);
CREATE POLICY "prodvar_own"  ON public.product_variants FOR ALL USING (
  EXISTS(SELECT 1 FROM public.products WHERE id = product_id AND vendor_id = auth.uid()) OR is_admin()
);
CREATE POLICY "inv_vendor"   ON public.inventory_logs FOR ALL USING (
  EXISTS(SELECT 1 FROM public.products WHERE id = product_id AND vendor_id = auth.uid()) OR is_admin()
);
CREATE POLICY "cart_own"     ON public.cart_items FOR ALL USING (user_id = auth.uid());

-- orders
CREATE POLICY "orders_read"   ON public.orders FOR SELECT USING (buyer_id = auth.uid() OR vendor_id = auth.uid() OR is_admin());
CREATE POLICY "orders_insert" ON public.orders FOR INSERT WITH CHECK (buyer_id = auth.uid());
CREATE POLICY "orders_update" ON public.orders FOR UPDATE USING (vendor_id = auth.uid() OR is_admin());
CREATE POLICY "orderitems_read" ON public.order_items FOR SELECT USING (
  EXISTS(SELECT 1 FROM public.orders WHERE id = order_id AND (buyer_id = auth.uid() OR vendor_id = auth.uid()))
  OR is_admin()
);

-- professional_profiles
CREATE POLICY "prof_read" ON public.professional_profiles FOR SELECT USING (true);
CREATE POLICY "prof_own"  ON public.professional_profiles FOR ALL    USING (id = auth.uid() OR is_admin());
CREATE POLICY "port_items_read" ON public.portfolio_items  FOR SELECT USING (true);
CREATE POLICY "port_items_own"  ON public.portfolio_items  FOR ALL    USING (professional_id = auth.uid());
CREATE POLICY "port_imgs_read"  ON public.portfolio_images FOR SELECT USING (true);
CREATE POLICY "port_imgs_own"   ON public.portfolio_images FOR ALL    USING (
  EXISTS(SELECT 1 FROM public.portfolio_items WHERE id = portfolio_id AND professional_id = auth.uid())
);

-- service_categories
CREATE POLICY "svccat_read"  ON public.service_categories FOR SELECT USING (true);
CREATE POLICY "svccat_admin" ON public.service_categories FOR ALL    USING (is_admin());

-- service_listings
CREATE POLICY "svclist_read"   ON public.service_listings FOR SELECT USING (is_active OR provider_id = auth.uid() OR is_admin());
CREATE POLICY "svclist_insert" ON public.service_listings FOR INSERT WITH CHECK (provider_id = auth.uid());
CREATE POLICY "svclist_update" ON public.service_listings FOR UPDATE USING (provider_id = auth.uid() OR is_admin());
CREATE POLICY "svcreq_read"    ON public.service_requests FOR SELECT USING (
  status = 'open' OR client_id = auth.uid() OR is_moderator()
);
CREATE POLICY "svcreq_insert"  ON public.service_requests FOR INSERT WITH CHECK (client_id = auth.uid());
CREATE POLICY "svcreq_update"  ON public.service_requests FOR UPDATE USING (client_id = auth.uid() OR is_admin());
CREATE POLICY "svcquot_read"   ON public.service_quotations FOR SELECT USING (
  provider_id = auth.uid()
  OR EXISTS(SELECT 1 FROM public.service_requests WHERE id = request_id AND client_id = auth.uid())
  OR is_admin()
);
CREATE POLICY "svcquot_insert" ON public.service_quotations FOR INSERT WITH CHECK (provider_id = auth.uid());
CREATE POLICY "svcquot_update" ON public.service_quotations FOR UPDATE USING (
  provider_id = auth.uid()
  OR EXISTS(SELECT 1 FROM public.service_requests WHERE id = request_id AND client_id = auth.uid())
  OR is_admin()
);
CREATE POLICY "svccont_parties" ON public.service_contracts FOR ALL USING (
  client_id = auth.uid() OR provider_id = auth.uid() OR is_admin()
);
CREATE POLICY "svcbook_parties" ON public.service_bookings FOR ALL USING (
  client_id = auth.uid() OR provider_id = auth.uid() OR is_admin()
);

-- rentals
CREATE POLICY "rentcat_read"     ON public.rental_categories FOR SELECT USING (true);
CREATE POLICY "rentcat_admin"    ON public.rental_categories FOR ALL    USING (is_admin());
CREATE POLICY "rentlist_read"    ON public.rental_listings   FOR SELECT USING (is_available OR owner_id = auth.uid() OR is_admin());
CREATE POLICY "rentlist_insert"  ON public.rental_listings   FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "rentlist_update"  ON public.rental_listings   FOR UPDATE USING (owner_id = auth.uid() OR is_admin());
CREATE POLICY "rentbook_parties" ON public.rental_bookings   FOR ALL USING (
  renter_id = auth.uid() OR owner_id = auth.uid() OR is_admin()
);

-- forum
CREATE POLICY "forumcat_read"    ON public.forum_categories FOR SELECT USING (is_active OR is_admin());
CREATE POLICY "forumcat_admin"   ON public.forum_categories FOR ALL    USING (is_admin());
CREATE POLICY "forumpost_read"   ON public.forum_posts FOR SELECT USING (
  status NOT IN ('hidden','deleted') OR author_id = auth.uid() OR is_moderator()
);
CREATE POLICY "forumpost_insert" ON public.forum_posts FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND author_id = auth.uid());
CREATE POLICY "forumpost_update" ON public.forum_posts FOR UPDATE USING (author_id = auth.uid() OR is_moderator());
CREATE POLICY "forumpost_delete" ON public.forum_posts FOR DELETE USING (author_id = auth.uid() OR is_moderator());
CREATE POLICY "forumcmt_read"    ON public.forum_comments FOR SELECT USING (NOT is_hidden OR author_id = auth.uid() OR is_moderator());
CREATE POLICY "forumcmt_insert"  ON public.forum_comments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND author_id = auth.uid());
CREATE POLICY "forumcmt_update"  ON public.forum_comments FOR UPDATE USING (author_id = auth.uid() OR is_moderator());
CREATE POLICY "forumcmt_delete"  ON public.forum_comments FOR DELETE USING (author_id = auth.uid() OR is_moderator());
CREATE POLICY "forumreact_read"  ON public.forum_reactions FOR SELECT USING (true);
CREATE POLICY "forumreact_own"   ON public.forum_reactions FOR ALL    USING (user_id = auth.uid());

-- conversations & messages
CREATE POLICY "conv_read"   ON public.conversations FOR SELECT USING (
  EXISTS(SELECT 1 FROM public.conversation_participants WHERE conversation_id = id AND user_id = auth.uid())
  OR is_admin()
);
CREATE POLICY "conv_insert" ON public.conversations FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "convpart_read"   ON public.conversation_participants FOR SELECT USING (
  user_id = auth.uid()
  OR EXISTS(SELECT 1 FROM public.conversation_participants p2
            WHERE p2.conversation_id = conversation_id AND p2.user_id = auth.uid())
  OR is_admin()
);
CREATE POLICY "convpart_insert" ON public.conversation_participants FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "convpart_update" ON public.conversation_participants FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "msg_read"   ON public.messages FOR SELECT USING (
  EXISTS(SELECT 1 FROM public.conversation_participants
         WHERE conversation_id = messages.conversation_id AND user_id = auth.uid())
  OR is_admin()
);
CREATE POLICY "msg_insert" ON public.messages FOR INSERT WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS(SELECT 1 FROM public.conversation_participants
             WHERE conversation_id = messages.conversation_id AND user_id = auth.uid())
);
CREATE POLICY "msg_update" ON public.messages FOR UPDATE USING (sender_id = auth.uid());
CREATE POLICY "msg_delete" ON public.messages FOR DELETE USING (sender_id = auth.uid() OR is_moderator());
CREATE POLICY "msgatt_read"   ON public.message_attachments FOR SELECT USING (
  EXISTS(SELECT 1 FROM public.messages m
         JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id
         WHERE m.id = message_id AND cp.user_id = auth.uid())
);
CREATE POLICY "msgatt_insert" ON public.message_attachments FOR INSERT WITH CHECK (
  EXISTS(SELECT 1 FROM public.messages WHERE id = message_id AND sender_id = auth.uid())
);

-- notifications
CREATE POLICY "notifpref_own" ON public.notification_preferences FOR ALL USING (user_id = auth.uid());
CREATE POLICY "notif_read"    ON public.notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notif_update"  ON public.notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "notif_insert"  ON public.notifications FOR INSERT WITH CHECK (is_admin());

-- reviews
CREATE POLICY "review_read"   ON public.reviews FOR SELECT USING (NOT is_hidden OR reviewer_id = auth.uid() OR is_moderator());
CREATE POLICY "review_insert" ON public.reviews FOR INSERT WITH CHECK (reviewer_id = auth.uid());
CREATE POLICY "review_update" ON public.reviews FOR UPDATE USING (reviewer_id = auth.uid() OR is_moderator());
CREATE POLICY "revresp_read"  ON public.review_responses FOR SELECT USING (true);
CREATE POLICY "revresp_insert" ON public.review_responses FOR INSERT WITH CHECK (responder_id = auth.uid());
CREATE POLICY "revresp_update" ON public.review_responses FOR UPDATE USING (responder_id = auth.uid());

-- wallets & payments
CREATE POLICY "wallet_own"    ON public.wallets FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "wallet_admin"  ON public.wallets FOR ALL    USING (is_admin());
CREATE POLICY "wallettx_own"  ON public.wallet_transactions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "wallettx_admin" ON public.wallet_transactions FOR ALL   USING (is_admin());
CREATE POLICY "tx_read"       ON public.transactions FOR SELECT USING (payer_id = auth.uid() OR payee_id = auth.uid() OR is_admin());
CREATE POLICY "tx_insert"     ON public.transactions FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "tx_admin"      ON public.transactions FOR UPDATE USING (is_admin());
CREATE POLICY "escrow_read"   ON public.escrow_accounts FOR SELECT USING (payer_id = auth.uid() OR payee_id = auth.uid() OR is_admin());
CREATE POLICY "escrow_insert" ON public.escrow_accounts FOR INSERT WITH CHECK (payer_id = auth.uid());
CREATE POLICY "escrow_admin"  ON public.escrow_accounts FOR UPDATE USING (is_admin());
CREATE POLICY "escmile_parties" ON public.escrow_milestones FOR ALL USING (
  EXISTS(SELECT 1 FROM public.escrow_accounts WHERE id = escrow_id AND (payer_id = auth.uid() OR payee_id = auth.uid()))
  OR is_admin()
);
CREATE POLICY "escevt_read" ON public.escrow_events FOR SELECT USING (
  EXISTS(SELECT 1 FROM public.escrow_accounts WHERE id = escrow_id AND (payer_id = auth.uid() OR payee_id = auth.uid()))
  OR is_admin()
);
CREATE POLICY "payout_own"   ON public.payouts FOR SELECT USING (recipient_id = auth.uid() OR is_admin());
CREATE POLICY "payout_admin" ON public.payouts FOR ALL    USING (is_admin());
CREATE POLICY "comm_read"    ON public.commission_records FOR SELECT USING (earner_id = auth.uid() OR is_admin());

-- jobs & tenders
CREATE POLICY "jobs_read"   ON public.jobs FOR SELECT USING (status = 'active' OR poster_id = auth.uid() OR is_admin());
CREATE POLICY "jobs_insert" ON public.jobs FOR INSERT WITH CHECK (poster_id = auth.uid());
CREATE POLICY "jobs_update" ON public.jobs FOR UPDATE USING (poster_id = auth.uid() OR is_admin());
CREATE POLICY "jobapp_read" ON public.job_applications FOR SELECT USING (
  applicant_id = auth.uid()
  OR EXISTS(SELECT 1 FROM public.jobs WHERE id = job_id AND poster_id = auth.uid())
  OR is_admin()
);
CREATE POLICY "jobapp_insert" ON public.job_applications FOR INSERT WITH CHECK (applicant_id = auth.uid());
CREATE POLICY "jobapp_update" ON public.job_applications FOR UPDATE USING (
  applicant_id = auth.uid()
  OR EXISTS(SELECT 1 FROM public.jobs WHERE id = job_id AND poster_id = auth.uid())
  OR is_admin()
);
CREATE POLICY "tender_read"   ON public.tenders FOR SELECT USING (status = 'published' OR poster_id = auth.uid() OR is_admin());
CREATE POLICY "tender_insert" ON public.tenders FOR INSERT WITH CHECK (poster_id = auth.uid());
CREATE POLICY "tender_update" ON public.tenders FOR UPDATE USING (poster_id = auth.uid() OR is_admin());
CREATE POLICY "tenderbid_read" ON public.tender_bids FOR SELECT USING (
  bidder_id = auth.uid()
  OR EXISTS(SELECT 1 FROM public.tenders WHERE id = tender_id AND poster_id = auth.uid())
  OR is_admin()
);
CREATE POLICY "tenderbid_insert" ON public.tender_bids FOR INSERT WITH CHECK (bidder_id = auth.uid());
CREATE POLICY "tenderbid_update" ON public.tender_bids FOR UPDATE USING (bidder_id = auth.uid() OR is_admin());

-- admin & moderation
CREATE POLICY "modreport_read"   ON public.moderation_reports FOR SELECT USING (reporter_id = auth.uid() OR is_moderator());
CREATE POLICY "modreport_insert" ON public.moderation_reports FOR INSERT WITH CHECK (reporter_id = auth.uid());
CREATE POLICY "modreport_update" ON public.moderation_reports FOR UPDATE USING (is_moderator());
CREATE POLICY "adminlog_admin"   ON public.admin_logs    FOR ALL    USING (is_admin());
CREATE POLICY "actlog_own"       ON public.activity_logs FOR SELECT USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "actlog_insert"    ON public.activity_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "announce_read"    ON public.announcements FOR SELECT USING (
  (is_active AND starts_at <= NOW() AND (ends_at IS NULL OR ends_at >= NOW())) OR is_admin()
);
CREATE POLICY "announce_admin"   ON public.announcements   FOR ALL USING (is_admin());
CREATE POLICY "settings_read"    ON public.platform_settings FOR SELECT USING (true);
CREATE POLICY "settings_admin"   ON public.platform_settings FOR ALL    USING (is_admin());

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
/*
  Create these buckets in Supabase Dashboard > Storage:

  BUCKET                  | PUBLIC | MAX SIZE | NOTES
  ------------------------|--------|----------|-----------------------------
  property-images         | yes    | 10 MB    | Listing photos
  product-images          | yes    | 10 MB    | Marketplace product photos
  portfolio-images        | yes    | 10 MB    | Professional portfolios
  rental-images           | yes    | 10 MB    | Equipment/vehicle photos
  avatars                 | yes    | 5 MB     | User profile pictures
  forum-attachments       | yes    | 20 MB    | Forum post images
  message-attachments     | no     | 50 MB    | Signed URLs (1h TTL)
  verification-docs       | no     | 20 MB    | KYC docs, signed URLs only
  tender-documents        | no     | 50 MB    | Tender submission docs
  service-contracts       | no     | 20 MB    | Signed contract PDFs

  Recommended Storage RLS (Storage > Policies):
  - Public buckets: anon SELECT allowed; INSERT requires auth, path = auth.uid()/...
  - Private buckets: no anon access; serve via signed URLs from Edge Functions
*/

-- ============================================================
-- DATABASE RELATIONSHIP DIAGRAM
-- ============================================================
/*
  auth.users
    └── profiles (1:1)
          ├── email_verifications (1:N)
          ├── phone_verifications (1:N)
          ├── kyc_records (1:N)
          ├── user_permissions (1:N)
          ├── user_sessions (1:N)
          │
          ├── agent_profiles (1:1) ──── agencies (N:1)
          │
          ├── vendor_profiles (1:1)
          │     └── products (1:N) ──── product_categories (N:1)
          │           ├── product_images (1:N)
          │           └── product_variants (1:N)
          │     └── orders (1:N via vendor_id)
          │           └── order_items (1:N)
          │
          ├── professional_profiles (1:1)  [contractor|engineer|architect|lawyer]
          │     └── portfolio_items (1:N)
          │           └── portfolio_images (1:N)
          │
          ├── properties (1:N via owner_id)
          │     ├── property_images (1:N)
          │     ├── property_videos (1:N)
          │     ├── property_amenities (1:N)
          │     ├── property_verifications (1:N)
          │     ├── property_views (1:N)
          │     ├── property_favorites (1:N)
          │     └── property_inquiries (1:N)
          │
          ├── service_listings (1:N via provider_id)
          │     └── service_bookings (1:N)
          ├── service_requests (1:N via client_id)
          │     └── service_quotations (1:N)
          │           └── service_contracts (1:1)
          │
          ├── rental_listings (1:N via owner_id)
          │     └── rental_bookings (1:N)
          │
          ├── forum_posts (1:N via author_id)
          │     ├── forum_comments (1:N, self-ref)
          │     └── forum_reactions (polymorphic)
          │
          ├── conversations (N:M via conversation_participants)
          │     └── messages (1:N)
          │           └── message_attachments (1:N)
          │
          ├── notifications (1:N)
          ├── notification_preferences (1:1)
          │
          ├── reviews (1:N via reviewer_id) [polymorphic target]
          │     └── review_responses (1:1)
          │
          ├── wallets (1:1)
          │     └── wallet_transactions (1:N)
          ├── transactions (1:N via payer_id / payee_id)
          ├── escrow_accounts (1:N)
          │     ├── escrow_milestones (1:N)
          │     └── escrow_events (1:N)
          ├── payouts (1:N)
          ├── commission_records (1:N via earner_id)
          │
          ├── jobs (1:N via poster_id)
          │     └── job_applications (1:N)
          ├── tenders (1:N via poster_id)
          │     └── tender_bids (1:N)
          │
          ├── saved_searches (1:N)
          ├── moderation_reports (1:N via reporter_id)
          └── activity_logs (1:N)

  LOOKUP / SEED TABLES:
    property_categories, product_categories, service_categories,
    rental_categories, forum_categories, platform_settings, announcements

  ADMIN:
    admin_logs (actor_id → profiles)

  TABLE COUNT: 63 tables
  ENUM COUNT:  21 enums
  INDEX COUNT: 80+ indexes
  RLS POLICIES: 100+ policies
*/
