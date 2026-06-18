-- Sprint 1, Task 3: password reset rate limiting + account recovery capture.
-- Purely additive: two new tables, no existing tables/columns touched.
-- Both tables are RLS-enabled with zero policies — only the service-role
-- client (createAdminClient(), used exclusively inside 'use server' files)
-- can read or write them. anon/authenticated roles have no access at all.

CREATE TABLE IF NOT EXISTS public.password_reset_attempts (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT        NOT NULL,
  ip         TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.password_reset_attempts ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_reset_attempts_email ON public.password_reset_attempts(email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reset_attempts_ip    ON public.password_reset_attempts(ip, created_at DESC);

-- account_recovery_requests: capture-only "Need help accessing your account?"
-- workflow. No in-app admin queue yet — support reviews/resolves via
-- Supabase Studio directly. status/reviewed_at/reviewed_by exist so a manual
-- update leaves an audit trail. expires_at is recorded (not enforced) per
-- the 7-day Phase 1 decision.
CREATE TABLE IF NOT EXISTS public.account_recovery_requests (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name         TEXT        NOT NULL,
  phone             TEXT        NOT NULL,
  alternative_email TEXT        NOT NULL,
  note              TEXT,
  status            TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'rejected', 'expired')),
  reviewed_at       TIMESTAMPTZ,
  reviewed_by       UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at        TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days')
);
ALTER TABLE public.account_recovery_requests ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_recovery_requests_status ON public.account_recovery_requests(status, created_at DESC);
