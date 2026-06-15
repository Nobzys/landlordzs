-- Migration: Trust System
-- Additive-only. Does not modify existing tables, enums, policies, or workflows.
--
-- Reused as-is:
--   public.verification_status enum  (pending, submitted, under_review, approved, rejected, expired)
--   email_verifications / phone_verifications   (OTP flows — untouched)
--   kyc_records                                 (level-based admin KYC — untouched)
--   property_verifications                      (property doc queue — cannot be generalized;
--                                                property_id is NOT NULL FK)
--
-- New entities:
--   public.verification_type enum
--   public.verification_requests table
--   public.verification_documents table
--   RLS policies for both new tables

-- ─── 1. profiles: add missing trust columns ───────────────────────────────────
-- avatar_url and bio already exist in migration 0003; skipped here.
-- All ADD COLUMN calls use IF NOT EXISTS so this migration is idempotent.

ALTER TABLE public.profiles
  -- Professional identity
  ADD COLUMN IF NOT EXISTS company_name          TEXT,
  ADD COLUMN IF NOT EXISTS years_experience      INTEGER,
  ADD COLUMN IF NOT EXISTS specialties           TEXT[]     NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS service_areas         TEXT[]     NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS website_url           TEXT,
  -- Verification timestamps: set by admin when each channel is confirmed.
  -- The corresponding boolean flags (phone_verified, is_verified) remain
  -- for backwards-compatible queries; these timestamps add precision.
  ADD COLUMN IF NOT EXISTS email_verified_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS phone_verified_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS identity_verified_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS business_verified_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS license_verified_at   TIMESTAMPTZ;

-- ─── 2. New enum: verification_type ──────────────────────────────────────────
-- verification_status already exists in migration 0002 and is reused below.
-- This guard makes the statement idempotent if applied more than once.

DO $$ BEGIN
  CREATE TYPE public.verification_type AS ENUM (
    'email',
    'phone',
    'identity',
    'business',
    'license',
    'address'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 3. verification_requests ─────────────────────────────────────────────────
-- One row per user per verification attempt (type-based).
-- Complements kyc_records (level-based internal flow) without duplicating it:
--   kyc_records   → internal admin KYC levels (none → basic → standard → enhanced)
--   verification_requests → user-facing trust badges per channel

CREATE TABLE IF NOT EXISTS public.verification_requests (
  id                UUID                       PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID                       NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  verification_type public.verification_type   NOT NULL,
  status            public.verification_status NOT NULL DEFAULT 'pending',
  reviewer_id       UUID                       REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes             TEXT,
  submitted_at      TIMESTAMPTZ,
  reviewed_at       TIMESTAMPTZ,
  expires_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ                NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ                NOT NULL DEFAULT NOW()
);

-- Use CREATE OR REPLACE TRIGGER (PG 14+) so the statement is idempotent.
CREATE OR REPLACE TRIGGER set_updated_at
  BEFORE UPDATE ON public.verification_requests
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

CREATE INDEX IF NOT EXISTS idx_verif_req_user   ON public.verification_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_verif_req_type   ON public.verification_requests(verification_type);
CREATE INDEX IF NOT EXISTS idx_verif_req_status ON public.verification_requests(status);
CREATE INDEX IF NOT EXISTS idx_verif_req_pending
  ON public.verification_requests(status, created_at)
  WHERE status = 'pending';

-- ─── 4. verification_documents ────────────────────────────────────────────────
-- Private documents that support a verification_request.
-- user_id is denormalized for RLS evaluation without a join on every row read.
-- document_type is free-text (id_front, id_back, selfie, business_reg,
-- license_scan, utility_bill, …) so new document kinds need no schema change.
-- storage_path references a private Supabase Storage object; no public URL.

CREATE TABLE IF NOT EXISTS public.verification_documents (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id      UUID        NOT NULL REFERENCES public.verification_requests(id) ON DELETE CASCADE,
  user_id         UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  document_type   TEXT        NOT NULL,
  storage_path    TEXT        NOT NULL,
  file_name       TEXT,
  file_size_bytes INTEGER,
  mime_type       TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verif_doc_request ON public.verification_documents(request_id);
CREATE INDEX IF NOT EXISTS idx_verif_doc_user    ON public.verification_documents(user_id);

-- ─── 5. RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE public.verification_requests  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_documents ENABLE ROW LEVEL SECURITY;

-- ── verification_requests ─────────────────────────────────────────────────────
-- Users can read and create their own requests.
-- Only admins can change status (UPDATE) or remove records (DELETE).

CREATE POLICY "vreq_own_select"
  ON public.verification_requests
  FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "vreq_own_insert"
  ON public.verification_requests
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "vreq_admin_update"
  ON public.verification_requests
  FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "vreq_admin_delete"
  ON public.verification_requests
  FOR DELETE
  USING (public.is_admin());

-- ── verification_documents ────────────────────────────────────────────────────
-- No public SELECT. Documents are private to the owning user and admins.
-- INSERT is allowed only when the caller owns the parent request.

CREATE POLICY "vdoc_own_select"
  ON public.verification_documents
  FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "vdoc_own_insert"
  ON public.verification_documents
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.verification_requests
      WHERE id = request_id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "vdoc_admin_update"
  ON public.verification_documents
  FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "vdoc_own_delete"
  ON public.verification_documents
  FOR DELETE
  USING (user_id = auth.uid() OR public.is_admin());
