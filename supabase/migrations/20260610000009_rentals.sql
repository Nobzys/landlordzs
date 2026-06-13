-- Migration: 0009 — Equipment & Vehicle Rentals

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
  currency        public.currency_code NOT NULL DEFAULT 'XAF',
  city            public.cameroon_city,
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
SELECT public.attach_updated_at('rental_listings');
CREATE INDEX idx_rental_owner     ON public.rental_listings(owner_id);
CREATE INDEX idx_rental_type      ON public.rental_listings(type);
CREATE INDEX idx_rental_city      ON public.rental_listings(city);
CREATE INDEX idx_rental_available ON public.rental_listings(is_available) WHERE is_available;

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
  currency            public.currency_code NOT NULL DEFAULT 'XAF',
  status              public.booking_status NOT NULL DEFAULT 'pending',
  pickup_notes        TEXT,
  return_notes        TEXT,
  payment_status      public.payment_status NOT NULL DEFAULT 'pending',
  payment_provider    public.payment_provider,
  payment_ref         TEXT,
  paid_at             TIMESTAMPTZ,
  deposit_refunded_at TIMESTAMPTZ,
  checked_out_at      TIMESTAMPTZ,
  returned_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_date > start_date)
);
SELECT public.attach_updated_at('rental_bookings');
CREATE INDEX idx_rental_book_listing ON public.rental_bookings(listing_id);
CREATE INDEX idx_rental_book_renter  ON public.rental_bookings(renter_id);
CREATE INDEX idx_rental_book_owner   ON public.rental_bookings(owner_id);
CREATE INDEX idx_rental_book_dates   ON public.rental_bookings(start_date, end_date);
CREATE INDEX idx_rental_book_status  ON public.rental_bookings(status);
