-- Fix storage policy conflicts introduced by migration 0017 vs 0019.
--
-- Migration 0017 created policies without the lzs_ prefix for property-images
-- (propimg_storage_select/insert/delete). Migration 0019 created the canonical
-- lzs_propimg_* replacements but its cleanup block only drops lzs_-prefixed
-- policies, so both sets survived on storage.objects simultaneously.
-- Having two INSERT policies for the same bucket causes the Supabase Storage
-- engine to return DatabaseInvalidObjectDefinition during upload.
--
-- Additionally, 0017 created a verification-docs bucket but 0019 created the
-- correctly-named verification-documents bucket with full CRUD policies. All
-- application code now targets verification-documents.

-- ─── Drop duplicate property-images policies from migration 0017 ─────────────
-- lzs_propimg_* equivalents already exist from migration 0019.

DROP POLICY IF EXISTS "propimg_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "propimg_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "propimg_storage_delete" ON storage.objects;

-- ─── Drop stale verification-docs policies (bucket superseded by 0019) ────────
-- The verification-documents bucket and its lzs_verifydoc_* policies were
-- created by migration 0019. The old verification-docs bucket entries remain
-- in storage.buckets but are no longer referenced by application code.
-- Removing the old policies prevents RLS evaluation against the orphaned bucket.

DROP POLICY IF EXISTS "verif_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "verif_storage_insert" ON storage.objects;
