-- Migration: verification_audit_logs — per-verification status-history
-- trail for /admin/verifications/[id] and /admin/users/[id]. Distinct in
-- shape from the generic admin_logs (actor/target/jsonb) table: this one is
-- scoped to a single kyc_records row and tracks the status transition
-- itself (previous_status -> new_status), which admin_logs does not model.
-- Admin/moderator-only — not user-facing.

CREATE TABLE public.verification_audit_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_id   UUID NOT NULL REFERENCES public.kyc_records(id) ON DELETE CASCADE,
  admin_id          UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  previous_status   TEXT,
  new_status        TEXT NOT NULL,
  action            TEXT NOT NULL,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_verif_audit_verification ON public.verification_audit_logs(verification_id, created_at DESC);
CREATE INDEX idx_verif_audit_admin        ON public.verification_audit_logs(admin_id);

ALTER TABLE public.verification_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "verif_audit_mod_all" ON public.verification_audit_logs
  FOR ALL USING (public.is_moderator());
