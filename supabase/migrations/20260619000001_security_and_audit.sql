-- Migration: security_and_audit
-- Additive only — adds audit_logs and rate_limit_log tables

-- ─── audit_logs ───────────────────────────────────────────────────────────────
-- Comprehensive security audit trail for all significant platform actions.
-- Separate from admin_logs (which tracks admin-specific console actions)
-- and activity_logs (which tracks general user activity).

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  admin_id         UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  action_type      TEXT        NOT NULL,
  entity_type      TEXT,
  entity_id        UUID,
  previous_values  JSONB,
  new_values       JSONB,
  ip_address       TEXT,
  user_agent       TEXT,
  metadata         JSONB       NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_user     ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_admin    ON public.audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_action   ON public.audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_entity   ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created  ON public.audit_logs(created_at DESC);

-- Audit logs are insert-only from the application (service role).
-- No RLS needed — only admin reads via service role.
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'audit_logs' AND policyname = 'audit_admin_read'
  ) THEN
    CREATE POLICY audit_admin_read ON public.audit_logs
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;
END $$;

-- ─── rate_limit_log ───────────────────────────────────────────────────────────
-- Tracks request attempts per key (ip:endpoint) for server-side rate limiting.
-- Entries are short-lived; a periodic cleanup removes records older than 1 hour.

CREATE TABLE IF NOT EXISTS public.rate_limit_log (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  key        TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ratelimit_key     ON public.rate_limit_log(key, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ratelimit_created ON public.rate_limit_log(created_at DESC);

-- No RLS — only written by service role (admin client)

-- ─── Cleanup function for rate limit log ─────────────────────────────────────
-- Call periodically (e.g. pg_cron or a scheduled action) to prune old entries.
CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_log()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.rate_limit_log
  WHERE created_at < NOW() - INTERVAL '1 hour';
END;
$$;
