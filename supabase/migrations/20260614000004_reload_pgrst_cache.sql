-- Force PostgREST to rebuild its schema introspection cache.
--
-- The public.storage_bucket_summary view (dropped in 20260614000003) joined
-- storage.buckets and storage.objects across the schema boundary, causing
-- PostgREST to abort cache construction with PGRST301. All subsequent
-- PostgREST calls (REST API, RLS helpers that touch public views) returned
-- DatabaseInvalidObjectDefinition until the cache was rebuilt.
--
-- Supabase normally sends this NOTIFY automatically via the
-- supabase_functions_event_trigger DDL event trigger, but we include it here
-- explicitly to guarantee the reload happens synchronously with this migration.

SELECT pg_notify('pgrst', 'reload schema');
