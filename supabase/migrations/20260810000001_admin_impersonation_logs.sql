-- Migration: admin_impersonation_logs — session-scoped audit trail for
-- "View as User" preview mode. No auth tokens are ever swapped (preview is
-- a read-only data reconstruction rendered while the admin keeps their own
-- session); this table only records who previewed whom and for how long.
-- Admin-only — the target user cannot read their own impersonation log rows.

CREATE TABLE public.admin_impersonation_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_user_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at        TIMESTAMPTZ,
  ip_address      TEXT
);

CREATE INDEX idx_impersonation_admin  ON public.admin_impersonation_logs(admin_id, started_at DESC);
CREATE INDEX idx_impersonation_target ON public.admin_impersonation_logs(target_user_id);

ALTER TABLE public.admin_impersonation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "impersonation_admin_all" ON public.admin_impersonation_logs
  FOR ALL USING (public.is_admin());
