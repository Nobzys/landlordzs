-- Migration: 0004 — Auth & Profiles
-- Extends auth.users with public profile data, KYC, sessions, permissions

CREATE TABLE public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT NOT NULL UNIQUE,
  full_name       TEXT NOT NULL DEFAULT '',
  display_name    TEXT,
  avatar_url      TEXT,
  cover_url       TEXT,
  phone           TEXT,
  phone_verified  BOOLEAN NOT NULL DEFAULT FALSE,
  role            public.user_role NOT NULL DEFAULT 'buyer',
  status          public.account_status NOT NULL DEFAULT 'active',
  kyc_level       public.kyc_level NOT NULL DEFAULT 'none',
  bio             TEXT,
  city            public.cameroon_city,
  address         TEXT,
  latitude        DECIMAL(10,8),
  longitude       DECIMAL(11,8),
  language        TEXT NOT NULL DEFAULT 'fr',
  currency        public.currency_code NOT NULL DEFAULT 'XAF',
  timezone        TEXT NOT NULL DEFAULT 'Africa/Douala',
  is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
  is_premium      BOOLEAN NOT NULL DEFAULT FALSE,
  last_seen_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
--SELECT public.attach_updated_at('profiles');
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
  level              public.kyc_level NOT NULL DEFAULT 'basic',
  status             public.verification_status NOT NULL DEFAULT 'pending',
  national_id_number TEXT,
  national_id_front  TEXT,  -- Storage path
  national_id_back   TEXT,  -- Storage path
  selfie_url         TEXT,  -- Storage path
  proof_of_address   TEXT,  -- Storage path
  business_reg       TEXT,  -- Storage path
  reviewed_by        UUID REFERENCES public.profiles(id),
  review_notes       TEXT,
  submitted_at       TIMESTAMPTZ,
  reviewed_at        TIMESTAMPTZ,
  expires_at         TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
--SELECT public.attach_updated_at('kyc_records');
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

-- Trigger: auto-create profile row when auth.users row is inserted
--CREATE TRIGGER on_auth_user_created
-- AFTER INSERT ON auth.users
--FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
