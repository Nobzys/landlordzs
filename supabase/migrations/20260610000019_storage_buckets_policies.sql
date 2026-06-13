-- =================================================================
-- LANDLORDZS — Storage Buckets & RLS Policies
-- Migration: 0019
-- =================================================================
--
-- Path conventions
-- ─────────────────────────────────────────────────────────────────
-- property-images      : {user_id}/{property_id}/{uuid}.{ext}
-- property-videos      : {user_id}/{property_id}/{uuid}.{ext}
-- user-avatars         : {user_id}/{uuid}.{ext}
-- verification-documents: {user_id}/{uuid}.{ext}
-- marketplace-products : {user_id}/{product_id}/{uuid}.{ext}
-- service-portfolios   : {user_id}/{portfolio_id}/{uuid}.{ext}
-- forum-images         : {user_id}/{post_id}/{uuid}.{ext}
-- chat-attachments     : {conversation_id}/{sender_id}/{uuid}.{ext}
--
-- Helper references
--   (storage.foldername(name))[1]  →  first path segment  (user_id in most cases)
--   (storage.foldername(name))[2]  →  second path segment (resource_id)
--   auth.uid()::text               →  current authenticated user UUID as text
--   public.is_admin()              →  SECURITY DEFINER boolean (from migration 0003)
--   public.is_moderator()          →  SECURITY DEFINER boolean (from migration 0003)
-- =================================================================

--ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- =================================================================
-- SECTION 1 — BUCKET DEFINITIONS
-- =================================================================

-- ─── 1. property-images ──────────────────────────────────────────
-- Public read, owner-scoped write, raster images only, 10 MB cap
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'property-images',
  'property-images',
  TRUE,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ─── 2. property-videos ──────────────────────────────────────────
-- Public read, owner-scoped write, video formats only, 100 MB cap
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'property-videos',
  'property-videos',
  TRUE,
  104857600,
  ARRAY[
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-msvideo'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ─── 3. user-avatars ─────────────────────────────────────────────
-- Public read, user writes only to own folder, 5 MB cap
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-avatars',
  'user-avatars',
  TRUE,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ─── 4. verification-documents ───────────────────────────────────
-- PRIVATE — owner + admin/moderator read, KYC documents, 20 MB cap
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'verification-documents',
  'verification-documents',
  FALSE,
  20971520,
  ARRAY['image/jpeg', 'image/png', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ─── 5. marketplace-products ─────────────────────────────────────
-- Public read, vendor-only write (verified via vendor_profiles), 10 MB cap
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'marketplace-products',
  'marketplace-products',
  TRUE,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ─── 6. service-portfolios ───────────────────────────────────────
-- Public read, professionals-only write (verified via professional_profiles)
-- 25 MB cap — allows high-res project photos and PDF case studies
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'service-portfolios',
  'service-portfolios',
  TRUE,
  26214400,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ─── 7. forum-images ─────────────────────────────────────────────
-- Public read, any authenticated user may write to own folder, 10 MB cap
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'forum-images',
  'forum-images',
  TRUE,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ─── 8. chat-attachments ─────────────────────────────────────────
-- PRIVATE — conversation participants only (read + write)
-- 50 MB cap — supports images, PDFs, audio clips, and short video
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-attachments',
  'chat-attachments',
  FALSE,
  52428800,
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf',
    'video/mp4', 'video/webm',
    'audio/mpeg', 'audio/ogg', 'audio/wav'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;


-- =================================================================
-- SECTION 2 — RLS POLICIES
-- Drop first for idempotency, then recreate
-- =================================================================

-- ─── Drop all storage policies (clean slate) ─────────────────────

DO $$
DECLARE
  pol TEXT;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname LIKE 'lzs_%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol);
  END LOOP;
END $$;


-- =================================================================
-- 1. PROPERTY-IMAGES
-- =================================================================

-- Anyone can read property photos (marketing-facing content)
CREATE POLICY lzs_propimg_select
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'property-images' );

-- Authenticated users may upload only under their own user_id folder
CREATE POLICY lzs_propimg_insert
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'property-images'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Only the uploader (folder owner) or an admin may replace an object
CREATE POLICY lzs_propimg_update
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'property-images'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
    )
  );

-- Only the uploader or an admin may delete
CREATE POLICY lzs_propimg_delete
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'property-images'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
    )
  );


-- =================================================================
-- 2. PROPERTY-VIDEOS
-- =================================================================

-- Public read — videos are embedded in public listing pages
CREATE POLICY lzs_propvid_select
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'property-videos' );

-- Authenticated owner-scoped upload
CREATE POLICY lzs_propvid_insert
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'property-videos'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY lzs_propvid_update
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'property-videos'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
    )
  );

CREATE POLICY lzs_propvid_delete
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'property-videos'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
    )
  );


-- =================================================================
-- 3. USER-AVATARS
-- =================================================================

-- Public read — avatars appear everywhere in the UI
CREATE POLICY lzs_avatar_select
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'user-avatars' );

-- A user may only upload into their own folder (path: {user_id}/*)
CREATE POLICY lzs_avatar_insert
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'user-avatars'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- A user may overwrite their own avatar
CREATE POLICY lzs_avatar_update
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'user-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- A user or admin may delete
CREATE POLICY lzs_avatar_delete
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'user-avatars'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
    )
  );


-- =================================================================
-- 4. VERIFICATION-DOCUMENTS  (PRIVATE)
-- =================================================================
-- Sensitivity: ID cards, business registrations, titre foncier scans.
-- Only the document owner and platform moderators/admins may read.

-- Owner can read their own documents; moderators and admins can read all
CREATE POLICY lzs_verifydoc_select
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'verification-documents'
    AND auth.uid() IS NOT NULL
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_moderator()
    )
  );

-- Only the authenticated owner may upload to their folder
CREATE POLICY lzs_verifydoc_insert
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'verification-documents'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Owner may replace a document (e.g., re-upload expired ID)
CREATE POLICY lzs_verifydoc_update
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'verification-documents'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Owner or admin may delete
CREATE POLICY lzs_verifydoc_delete
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'verification-documents'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
    )
  );


-- =================================================================
-- 5. MARKETPLACE-PRODUCTS
-- =================================================================
-- Write access restricted to verified vendors only.
-- Checked via vendor_profiles row existence, not just role claim.

-- Anyone can view product images
CREATE POLICY lzs_mktprod_select
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'marketplace-products' );

-- Only active vendors may upload, and only into their own folder
CREATE POLICY lzs_mktprod_insert
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'marketplace-products'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.vendor_profiles
      WHERE id = auth.uid()
    )
  );

-- Vendor may replace own product image; admin override allowed
CREATE POLICY lzs_mktprod_update
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'marketplace-products'
    AND (
      (
        (storage.foldername(name))[1] = auth.uid()::text
        AND EXISTS (
          SELECT 1 FROM public.vendor_profiles
          WHERE id = auth.uid()
        )
      )
      OR public.is_admin()
    )
  );

-- Vendor or admin may delete
CREATE POLICY lzs_mktprod_delete
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'marketplace-products'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
    )
  );


-- =================================================================
-- 6. SERVICE-PORTFOLIOS
-- =================================================================
-- Write access restricted to verified professionals
-- (contractors, engineers, architects, lawyers).

-- Anyone may view portfolio images (public showcase)
CREATE POLICY lzs_portfolio_select
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'service-portfolios' );

-- Only professionals may upload; only to their own folder
CREATE POLICY lzs_portfolio_insert
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'service-portfolios'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.professional_profiles
      WHERE id = auth.uid()
    )
  );

-- Professional may replace their own portfolio files
CREATE POLICY lzs_portfolio_update
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'service-portfolios'
    AND (
      (
        (storage.foldername(name))[1] = auth.uid()::text
        AND EXISTS (
          SELECT 1 FROM public.professional_profiles
          WHERE id = auth.uid()
        )
      )
      OR public.is_admin()
    )
  );

-- Professional or admin may delete portfolio files
CREATE POLICY lzs_portfolio_delete
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'service-portfolios'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
    )
  );


-- =================================================================
-- 7. FORUM-IMAGES
-- =================================================================

-- Anyone can view forum post images
CREATE POLICY lzs_forumimg_select
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'forum-images' );

-- Any authenticated user may upload into their own folder
CREATE POLICY lzs_forumimg_insert
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'forum-images'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Uploader may replace their own image
CREATE POLICY lzs_forumimg_update
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'forum-images'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_moderator()
    )
  );

-- Uploader, moderator, or admin may delete
CREATE POLICY lzs_forumimg_delete
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'forum-images'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_moderator()
    )
  );


-- =================================================================
-- 8. CHAT-ATTACHMENTS  (PRIVATE)
-- =================================================================
-- Path: {conversation_id}/{sender_user_id}/{uuid}.{ext}
-- Access is scoped to verified conversation participants.
-- The conversation_id is the first folder segment; membership is
-- validated against conversation_participants for every operation.

-- Participant or admin may download a chat attachment
CREATE POLICY lzs_chatatt_select
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'chat-attachments'
    AND auth.uid() IS NOT NULL
    AND (
      EXISTS (
        SELECT 1 FROM public.conversation_participants
        WHERE conversation_id = (storage.foldername(name))[1]::uuid
          AND user_id          = auth.uid()
      )
      OR public.is_admin()
    )
  );

-- Only a conversation participant may upload; must place file in
-- their own sender sub-folder (path[1] = conversation, path[2] = self)
CREATE POLICY lzs_chatatt_insert
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'chat-attachments'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id = (storage.foldername(name))[1]::uuid
        AND user_id          = auth.uid()
    )
  );

-- Sender may replace their own attachment (e.g., re-upload failed)
CREATE POLICY lzs_chatatt_update
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'chat-attachments'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- Sender or admin may delete an attachment
CREATE POLICY lzs_chatatt_delete
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'chat-attachments'
    AND (
      (storage.foldername(name))[2] = auth.uid()::text
      OR public.is_admin()
    )
  );


-- =================================================================
-- SECTION 3 — SUMMARY VIEW (informational, not enforced)
-- =================================================================
-- Useful during development to verify bucket config via:
--   SELECT * FROM storage_bucket_summary;
-- =================================================================

CREATE OR REPLACE VIEW public.storage_bucket_summary AS
SELECT
  b.id                                                    AS bucket,
  b.public                                                AS is_public,
  pg_size_pretty(b.file_size_limit)                       AS max_file_size,
  array_length(b.allowed_mime_types, 1)                   AS mime_type_count,
  b.allowed_mime_types                                    AS accepted_types,
  count(o.id)                                             AS object_count,
  pg_size_pretty(
    COALESCE(sum((o.metadata->>'size')::bigint), 0)
  )                                                       AS total_size_used
FROM storage.buckets b
LEFT JOIN storage.objects o ON o.bucket_id = b.id
WHERE b.id IN (
  'property-images',
  'property-videos',
  'user-avatars',
  'verification-documents',
  'marketplace-products',
  'service-portfolios',
  'forum-images',
  'chat-attachments'
)
GROUP BY b.id, b.public, b.file_size_limit, b.allowed_mime_types
ORDER BY b.id;
