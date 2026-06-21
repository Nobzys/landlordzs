-- Fix: storage.objects INSERT policy for the 'verification-documents'
-- bucket (lzs_verifydoc_insert) is defined correctly in
-- 20260610000019_storage_buckets_policies.sql and is present in this
-- migration's history on both local and remote, yet live-tested uploads
-- fail with "new row violates row-level security policy" on the hosted
-- project specifically while the identical request succeeds locally —
-- the hosted policy has drifted from what the migration defines (most
-- likely altered directly outside the migration system at some point).
--
-- Re-assert all four policies idempotently so hosted matches the intended
-- state exactly, regardless of its current drift. Bucket stays private
-- (no bucket-visibility change). Behavior is unchanged from the original
-- migration's intent:
--   - INSERT: only into your own folder ({auth.uid()}/...)
--   - SELECT: your own files, or admin/moderator
--   - UPDATE: your own files, or admin/moderator (admin "retains full
--     access" per requirement — original policy was owner-only)
--   - DELETE: your own files, or admin

DROP POLICY IF EXISTS lzs_verifydoc_insert ON storage.objects;
CREATE POLICY lzs_verifydoc_insert
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'verification-documents'
    AND auth.uid() IS NOT NULL
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS lzs_verifydoc_select ON storage.objects;
CREATE POLICY lzs_verifydoc_select
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'verification-documents'
    AND auth.uid() IS NOT NULL
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.is_moderator()
    )
  );

DROP POLICY IF EXISTS lzs_verifydoc_update ON storage.objects;
CREATE POLICY lzs_verifydoc_update
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'verification-documents'
    AND auth.uid() IS NOT NULL
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.is_moderator()
    )
  );

DROP POLICY IF EXISTS lzs_verifydoc_delete ON storage.objects;
CREATE POLICY lzs_verifydoc_delete
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'verification-documents'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.is_admin()
    )
  );
