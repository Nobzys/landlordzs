-- Migration: 0017 — Realtime Subscriptions & Storage Buckets

-- ─── Realtime ────────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.escrow_accounts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.escrow_milestones;
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rental_bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.property_inquiries;

-- ─── Storage Buckets ─────────────────────────────────────────────────────────
-- Create buckets via Supabase Storage API or dashboard.
-- This file documents the bucket configuration.

-- Public buckets (no auth required to read)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('property-images',   'property-images',   TRUE,  10485760,
   ARRAY['image/jpeg','image/png','image/webp','image/gif']),
  ('product-images',    'product-images',    TRUE,  10485760,
   ARRAY['image/jpeg','image/png','image/webp']),
  ('portfolio-images',  'portfolio-images',  TRUE,  10485760,
   ARRAY['image/jpeg','image/png','image/webp']),
  ('rental-images',     'rental-images',     TRUE,  10485760,
   ARRAY['image/jpeg','image/png','image/webp']),
  ('avatars',           'avatars',           TRUE,  5242880,
   ARRAY['image/jpeg','image/png','image/webp','image/gif']),
  ('forum-attachments', 'forum-attachments', TRUE,  20971520,
   ARRAY['image/jpeg','image/png','image/webp','image/gif','application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- Private buckets (signed URLs only)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('message-attachments', 'message-attachments', FALSE, 52428800,
   ARRAY['image/jpeg','image/png','image/webp','application/pdf','audio/mpeg','audio/ogg']),
  ('verification-docs',   'verification-docs',   FALSE, 20971520,
   ARRAY['image/jpeg','image/png','application/pdf']),
  ('tender-documents',    'tender-documents',    FALSE, 52428800,
   ARRAY['application/pdf','application/msword',
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('service-contracts',   'service-contracts',   FALSE, 20971520,
   ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- ─── Storage RLS Policies ────────────────────────────────────────────────────

-- property-images: public read, authenticated write under own folder
CREATE POLICY "propimg_storage_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'property-images');

CREATE POLICY "propimg_storage_insert" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'property-images'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "propimg_storage_delete" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'property-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- avatars: public read, own folder write
CREATE POLICY "avatars_storage_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_storage_insert" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_storage_delete" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- product-images: public read, vendor own folder
CREATE POLICY "prodimg_storage_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

CREATE POLICY "prodimg_storage_insert" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'product-images'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- portfolio-images: public read, professional own folder
CREATE POLICY "portimg_storage_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'portfolio-images');

CREATE POLICY "portimg_storage_insert" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'portfolio-images'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- rental-images: public read
CREATE POLICY "rentimg_storage_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'rental-images');

CREATE POLICY "rentimg_storage_insert" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'rental-images'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- forum-attachments: public read, authenticated write
CREATE POLICY "forum_storage_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'forum-attachments');

CREATE POLICY "forum_storage_insert" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'forum-attachments'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- message-attachments: only conversation participants
CREATE POLICY "msgatt_storage_select" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'message-attachments'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "msgatt_storage_insert" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'message-attachments'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- verification-docs: own folder only
CREATE POLICY "verif_storage_select" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'verification-docs'
    AND auth.uid() IS NOT NULL
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_moderator()
    )
  );

CREATE POLICY "verif_storage_insert" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'verification-docs'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- tender-documents: own folder or admin
CREATE POLICY "tender_storage_select" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'tender-documents'
    AND auth.uid() IS NOT NULL
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
    )
  );

CREATE POLICY "tender_storage_insert" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'tender-documents'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- service-contracts: parties only
CREATE POLICY "contracts_storage_select" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'service-contracts'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "contracts_storage_insert" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'service-contracts'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
