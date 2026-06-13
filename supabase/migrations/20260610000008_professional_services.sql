-- Migration: 0008 — Professional Services (Contractors, Engineers, Architects, Lawyers)

CREATE TABLE public.professional_profiles (
  id               UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  profession_type  public.profession_type NOT NULL,
  company_name     TEXT,
  license_number   TEXT,
  license_verified BOOLEAN NOT NULL DEFAULT FALSE,
  specializations  TEXT[] NOT NULL DEFAULT '{}',
  service_areas    public.cameroon_city[] NOT NULL DEFAULT '{}',
  languages        TEXT[] NOT NULL DEFAULT '{fr}',
  experience_years INT NOT NULL DEFAULT 0,
  hourly_rate      BIGINT,
  day_rate         BIGINT,
  currency         public.currency_code NOT NULL DEFAULT 'XAF',
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
SELECT public.attach_updated_at('professional_profiles');
CREATE INDEX idx_prof_type      ON public.professional_profiles(profession_type);
CREATE INDEX idx_prof_areas     ON public.professional_profiles USING GIN(service_areas);
CREATE INDEX idx_prof_available ON public.professional_profiles(is_available) WHERE is_available;

CREATE TABLE public.portfolio_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  project_type    TEXT,
  city            public.cameroon_city,
  client_name     TEXT,
  budget_xaf      BIGINT,
  duration_months INT,
  completed_at    DATE,
  is_featured     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SELECT public.attach_updated_at('portfolio_items');
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
CREATE INDEX idx_portfolio_imgs ON public.portfolio_images(portfolio_id);

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
  currency      public.currency_code NOT NULL DEFAULT 'XAF',
  delivery_days INT,
  service_areas public.cameroon_city[] NOT NULL DEFAULT '{}',
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured   BOOLEAN NOT NULL DEFAULT FALSE,
  rating_avg    DECIMAL(3,2) NOT NULL DEFAULT 0,
  rating_count  INT NOT NULL DEFAULT 0,
  booking_count INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SELECT public.attach_updated_at('service_listings');
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
  currency    public.currency_code NOT NULL DEFAULT 'XAF',
  city        public.cameroon_city,
  address     TEXT,
  deadline    DATE,
  status      public.service_request_status NOT NULL DEFAULT 'open',
  attachments TEXT[] NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SELECT public.attach_updated_at('service_requests');
CREATE INDEX idx_svc_req_client ON public.service_requests(client_id);
CREATE INDEX idx_svc_req_status ON public.service_requests(status);
CREATE INDEX idx_svc_req_city   ON public.service_requests(city);

CREATE TABLE public.service_quotations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id    UUID NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  provider_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount        BIGINT NOT NULL,
  currency      public.currency_code NOT NULL DEFAULT 'XAF',
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
SELECT public.attach_updated_at('service_quotations');
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
  currency           public.currency_code NOT NULL DEFAULT 'XAF',
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
SELECT public.attach_updated_at('service_contracts');
CREATE INDEX idx_svc_contracts_client   ON public.service_contracts(client_id);
CREATE INDEX idx_svc_contracts_provider ON public.service_contracts(provider_id);

CREATE TABLE public.service_bookings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id       UUID NOT NULL REFERENCES public.service_listings(id) ON DELETE CASCADE,
  client_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider_id      UUID NOT NULL REFERENCES public.profiles(id),
  status           public.booking_status NOT NULL DEFAULT 'pending',
  scheduled_at     TIMESTAMPTZ,
  started_at       TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  amount           BIGINT NOT NULL,
  currency         public.currency_code NOT NULL DEFAULT 'XAF',
  notes            TEXT,
  payment_status   public.payment_status NOT NULL DEFAULT 'pending',
  payment_provider public.payment_provider,
  payment_ref      TEXT,
  paid_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SELECT public.attach_updated_at('service_bookings');
CREATE INDEX idx_svc_book_client   ON public.service_bookings(client_id);
CREATE INDEX idx_svc_book_provider ON public.service_bookings(provider_id);
CREATE INDEX idx_svc_book_listing  ON public.service_bookings(listing_id);
CREATE INDEX idx_svc_book_status   ON public.service_bookings(status);
