-- Migration: 0005 — Agencies & Agent Profiles

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
  city             public.cameroon_city,
  address          TEXT,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  rating_avg       DECIMAL(3,2) NOT NULL DEFAULT 0,
  rating_count     INT NOT NULL DEFAULT 0,
  listing_count    INT NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SELECT public.attach_updated_at('agencies');
CREATE INDEX idx_agencies_owner ON public.agencies(owner_id);
CREATE INDEX idx_agencies_city  ON public.agencies(city);
CREATE INDEX idx_agencies_slug  ON public.agencies(slug);

CREATE TABLE public.agent_profiles (
  id               UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  agency_id        UUID REFERENCES public.agencies(id) ON DELETE SET NULL,
  license_number   TEXT,
  license_verified BOOLEAN NOT NULL DEFAULT FALSE,
  specializations  TEXT[] NOT NULL DEFAULT '{}',
  service_areas    public.cameroon_city[] NOT NULL DEFAULT '{}',
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
SELECT public.attach_updated_at('agent_profiles');
CREATE INDEX idx_agent_agency ON public.agent_profiles(agency_id);
CREATE INDEX idx_agent_areas  ON public.agent_profiles USING GIN(service_areas);
