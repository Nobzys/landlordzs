-- Migration: 20260620000001 — Payment Gateway Extensions
-- Additive only. Extends payments table and adds webhook_events audit table.

-- ─── Extend payments table ────────────────────────────────────────────────────
-- Track provider-specific identifiers for Stripe, PayPal, and Mobile Money.
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS external_customer_id      TEXT,
  ADD COLUMN IF NOT EXISTS external_subscription_id  TEXT,
  ADD COLUMN IF NOT EXISTS external_payment_id       TEXT,
  ADD COLUMN IF NOT EXISTS webhook_payload           JSONB,
  ADD COLUMN IF NOT EXISTS payment_status            TEXT,
  ADD COLUMN IF NOT EXISTS checkout_session_id       TEXT,
  ADD COLUMN IF NOT EXISTS refunded_at               TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refund_reference          TEXT;

CREATE INDEX IF NOT EXISTS idx_payments_provider_ref
  ON public.payments(provider, provider_reference)
  WHERE provider_reference IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payments_session
  ON public.payments(checkout_session_id)
  WHERE checkout_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payments_ext_sub
  ON public.payments(external_subscription_id)
  WHERE external_subscription_id IS NOT NULL;

-- ─── webhook_events ───────────────────────────────────────────────────────────
-- Idempotent log of all inbound webhook events from payment providers.
-- event_id is the provider's own event identifier (e.g. Stripe evt_xxx, PayPal WH-xxx).
-- The unique index on (provider, event_id) prevents duplicate processing.

CREATE TABLE IF NOT EXISTS public.webhook_events (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider      TEXT        NOT NULL,
  event_type    TEXT        NOT NULL,
  event_id      TEXT,
  payload       JSONB       NOT NULL DEFAULT '{}',
  status        TEXT        NOT NULL DEFAULT 'received'
    CHECK (status IN ('received', 'processed', 'failed', 'ignored')),
  error         TEXT,
  processed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Deduplication: one row per (provider, event_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_events_dedup
  ON public.webhook_events(provider, event_id)
  WHERE event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_webhook_events_provider
  ON public.webhook_events(provider, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_webhook_events_status
  ON public.webhook_events(status, created_at DESC);

-- Only admins can read webhook events; service role writes.
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'webhook_events' AND policyname = 'webhook_events_admin_read'
  ) THEN
    CREATE POLICY webhook_events_admin_read ON public.webhook_events
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;
END $$;
