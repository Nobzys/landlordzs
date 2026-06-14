-- Drop the storage_bucket_summary view from the public schema.
--
-- This view was created in migration 0019 for development convenience only
-- (informational, not enforced). It joins storage.buckets and storage.objects
-- from the public schema, which PostgREST introspects on every schema cache
-- reload. If PostgREST cannot verify column-level permissions on the underlying
-- storage schema tables for the authenticated role, the cache rebuild fails
-- and ALL storage operations return DatabaseInvalidObjectDefinition.
--
-- The view is never queried by application code; dropping it is safe.

DROP VIEW IF EXISTS public.storage_bucket_summary;
