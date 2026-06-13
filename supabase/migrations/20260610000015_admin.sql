-- Migration: 0015 — Admin, Moderation & Platform Settings

CREATE TABLE public.moderation_reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_type   TEXT NOT NULL,
  target_id     UUID NOT NULL,
  report_type   public.report_type NOT NULL,
  reason        TEXT NOT NULL,
  evidence_urls TEXT[] NOT NULL DEFAULT '{}',
  status        public.report_status NOT NULL DEFAULT 'pending',
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
CREATE INDEX idx_admin_logs_action  ON public.admin_logs(action);
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
CREATE INDEX idx_activity_action  ON public.activity_logs(action);
CREATE INDEX idx_activity_created ON public.activity_logs(created_at DESC);

-- Partition hint: this table grows fast; consider pg_partman by month in production
CREATE TABLE public.announcements (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id  UUID NOT NULL REFERENCES public.profiles(id),
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  type       TEXT NOT NULL DEFAULT 'info'
               CHECK (type IN ('info','warning','maintenance','feature')),
  audience   TEXT NOT NULL DEFAULT 'all',
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  starts_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_announcements_active ON public.announcements(is_active, starts_at, ends_at);

CREATE TABLE public.platform_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'string'
                CHECK (type IN ('string','number','boolean','json')),
  description TEXT,
  updated_by  UUID REFERENCES public.profiles(id),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
