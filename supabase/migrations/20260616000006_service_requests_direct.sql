-- Migration: 20260616000006 — Direct professional service requests
-- Additive only. Extends the existing service_requests table for P2P flow.
-- No tables dropped, no data deleted, no existing columns changed.

-- ─── 1. Extend status enum ────────────────────────────────────────────────────
--  Existing values: open, quoted, accepted, in_progress, completed, disputed, cancelled
--  Adding: pending (direct request initial status), rejected (provider declines)
ALTER TYPE public.service_request_status ADD VALUE IF NOT EXISTS 'pending';
ALTER TYPE public.service_request_status ADD VALUE IF NOT EXISTS 'rejected';

-- ─── 2. Add new columns ───────────────────────────────────────────────────────
ALTER TABLE public.service_requests
  ADD COLUMN IF NOT EXISTS provider_id    uuid  REFERENCES public.profiles(id)          ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS provider_role  text,
  ADD COLUMN IF NOT EXISTS request_type   text,
  ADD COLUMN IF NOT EXISTS property_id    uuid  REFERENCES public.properties(id)         ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS preferred_date date,
  ADD COLUMN IF NOT EXISTS contact_phone  text,
  ADD COLUMN IF NOT EXISTS escrow_id      uuid  REFERENCES public.escrow_accounts(id)    ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS notes          text;

-- ─── 3. Indexes ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_svc_req_provider      ON public.service_requests(provider_id);
CREATE INDEX IF NOT EXISTS idx_svc_req_provider_role ON public.service_requests(provider_role);

-- ─── 4. Enable RLS ────────────────────────────────────────────────────────────
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

-- ─── 5. RLS policies (idempotent via DO blocks) ───────────────────────────────

-- Requester (client_id) can read their own requests
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'service_requests' AND policyname = 'svc_req_requester_select'
  ) THEN
    CREATE POLICY svc_req_requester_select
      ON public.service_requests FOR SELECT
      USING (client_id = auth.uid());
  END IF;
END $$;

-- Provider can read requests assigned to them
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'service_requests' AND policyname = 'svc_req_provider_select'
  ) THEN
    CREATE POLICY svc_req_provider_select
      ON public.service_requests FOR SELECT
      USING (provider_id = auth.uid());
  END IF;
END $$;

-- Admin can read all
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'service_requests' AND policyname = 'svc_req_admin_select'
  ) THEN
    CREATE POLICY svc_req_admin_select
      ON public.service_requests FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;
END $$;

-- Requester can create their own request
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'service_requests' AND policyname = 'svc_req_insert'
  ) THEN
    CREATE POLICY svc_req_insert
      ON public.service_requests FOR INSERT
      WITH CHECK (client_id = auth.uid());
  END IF;
END $$;

-- Requester can update their own requests (e.g. cancel)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'service_requests' AND policyname = 'svc_req_requester_update'
  ) THEN
    CREATE POLICY svc_req_requester_update
      ON public.service_requests FOR UPDATE
      USING (client_id = auth.uid())
      WITH CHECK (client_id = auth.uid());
  END IF;
END $$;

-- Provider can update requests assigned to them (accept/reject/progress/complete)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'service_requests' AND policyname = 'svc_req_provider_update'
  ) THEN
    CREATE POLICY svc_req_provider_update
      ON public.service_requests FOR UPDATE
      USING (provider_id = auth.uid())
      WITH CHECK (provider_id = auth.uid());
  END IF;
END $$;

-- Admin can update any request (dispute resolution)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'service_requests' AND policyname = 'svc_req_admin_update'
  ) THEN
    CREATE POLICY svc_req_admin_update
      ON public.service_requests FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;
END $$;
