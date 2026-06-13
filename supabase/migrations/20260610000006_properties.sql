-- Migration: 0006 — Properties & Related Tables

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
  -- Identity
  title            TEXT NOT NULL,
  title_fr         TEXT,
  slug             TEXT NOT NULL UNIQUE,
  description      TEXT,
  description_fr   TEXT,
  -- Classification
  listing_type     public.listing_type NOT NULL DEFAULT 'sale',
  property_type    public.property_type NOT NULL,
  status           public.property_status NOT NULL DEFAULT 'draft',
  -- Location
  city             public.cameroon_city NOT NULL,
  neighborhood     TEXT,
  address          TEXT,
  latitude         DECIMAL(10,8),
  longitude        DECIMAL(11,8),
  -- Pricing
  price            BIGINT NOT NULL,
  price_negotiable BOOLEAN NOT NULL DEFAULT FALSE,
  currency         public.currency_code NOT NULL DEFAULT 'XAF',
  price_per        TEXT,
  -- Physical
  bedrooms         INT,
  bathrooms        INT,
  toilets          INT,
  area_sqm         DECIMAL(10,2),
  plot_area_sqm    DECIMAL(10,2),
  floor_number     INT,
  total_floors     INT,
  year_built       INT,
  parking_spaces   INT NOT NULL DEFAULT 0,
  -- Legal
  land_title       public.land_title_type NOT NULL DEFAULT 'none',
  title_number     TEXT,
  -- Features
  is_furnished     BOOLEAN NOT NULL DEFAULT FALSE,
  has_pool         BOOLEAN NOT NULL DEFAULT FALSE,
  has_garden       BOOLEAN NOT NULL DEFAULT FALSE,
  has_security     BOOLEAN NOT NULL DEFAULT FALSE,
  has_generator    BOOLEAN NOT NULL DEFAULT FALSE,
  has_borehole     BOOLEAN NOT NULL DEFAULT FALSE,
  -- Meta
  is_featured      BOOLEAN NOT NULL DEFAULT FALSE,
  is_verified      BOOLEAN NOT NULL DEFAULT FALSE,
  is_urgent        BOOLEAN NOT NULL DEFAULT FALSE,
  view_count       INT NOT NULL DEFAULT 0,
  enquiry_count    INT NOT NULL DEFAULT 0,
  favorite_count   INT NOT NULL DEFAULT 0,
  -- Search
  search_vector    TSVECTOR,
  -- Timestamps
  published_at     TIMESTAMPTZ,
  expires_at       TIMESTAMPTZ,
  sold_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SELECT public.attach_updated_at('properties');
CREATE INDEX idx_prop_owner    ON public.properties(owner_id);
CREATE INDEX idx_prop_agent    ON public.properties(agent_id);
CREATE INDEX idx_prop_city     ON public.properties(city);
CREATE INDEX idx_prop_status   ON public.properties(status);
CREATE INDEX idx_prop_type     ON public.properties(property_type);
CREATE INDEX idx_prop_listing  ON public.properties(listing_type);
CREATE INDEX idx_prop_price    ON public.properties(price);
CREATE INDEX idx_prop_search   ON public.properties USING GIN(search_vector);
CREATE INDEX idx_prop_location ON public.properties(latitude, longitude);
CREATE INDEX idx_prop_featured ON public.properties(is_featured) WHERE is_featured;
CREATE INDEX idx_prop_active   ON public.properties(status) WHERE status = 'active';

-- Slug + search vector on INSERT/UPDATE
CREATE TRIGGER properties_before_save_trigger
  BEFORE INSERT OR UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.properties_before_save();

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
  status         public.verification_status NOT NULL DEFAULT 'pending',
  title_document TEXT,
  survey_plan    TEXT,
  other_docs     TEXT[] NOT NULL DEFAULT '{}',
  notes          TEXT,
  verified_at    TIMESTAMPTZ,
  expires_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SELECT public.attach_updated_at('property_verifications');
CREATE INDEX idx_prop_verif_prop   ON public.property_verifications(property_id);
CREATE INDEX idx_prop_verif_status ON public.property_verifications(status);

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
CREATE INDEX idx_prop_views_time   ON public.property_views(viewed_at DESC);

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
SELECT public.attach_updated_at('saved_searches');
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
CREATE INDEX idx_prop_inq_unread ON public.property_inquiries(property_id) WHERE NOT is_read;
