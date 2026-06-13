-- Migration: 0012 — Notifications & Reviews

-- ─── Notifications ─────────────────────────────────────────────────────────
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
SELECT public.attach_updated_at('notification_preferences');

CREATE TABLE public.notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type       public.notification_type NOT NULL,
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
CREATE INDEX idx_notif_user    ON public.notifications(user_id, created_at DESC);
CREATE INDEX idx_notif_unread  ON public.notifications(user_id) WHERE NOT is_read;
CREATE INDEX idx_notif_type    ON public.notifications(type);

-- ─── Reviews (polymorphic) ──────────────────────────────────────────────────
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
SELECT public.attach_updated_at('reviews');
CREATE INDEX idx_reviews_reviewer ON public.reviews(reviewer_id);
CREATE INDEX idx_reviews_target   ON public.reviews(target_type, target_id);
CREATE INDEX idx_reviews_rating   ON public.reviews(rating);

CREATE TABLE public.review_responses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id    UUID NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE UNIQUE,
  responder_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body         TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SELECT public.attach_updated_at('review_responses');

-- Trigger: refresh rating aggregates after review insert/update/delete
CREATE TRIGGER trg_refresh_rating
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.refresh_rating();
