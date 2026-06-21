-- Migration: store view counter for the vendor dashboard (Issue 3 — Material
-- Vendor Dashboard). Additive only: one column with a default, mirroring the
-- existing public.increment_profile_views pattern. products.view_count
-- already exists (20260610000007_vendors_marketplace.sql) and is reused as-is
-- for "Product Views" — no new column needed there.
--
-- Neither counter has a caller yet: there is no public storefront page
-- (/materials/[slug]) in this codebase today, so both will read 0 until that
-- page is built in a future, separate pass. They are wired to real Supabase
-- columns now (not mock data) so the dashboard is correct the moment that
-- page calls them.

ALTER TABLE public.vendor_profiles
  ADD COLUMN IF NOT EXISTS store_view_count INT NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.increment_store_view(p_vendor_id UUID)
RETURNS VOID
LANGUAGE SQL SECURITY DEFINER AS $$
  UPDATE public.vendor_profiles SET store_view_count = store_view_count + 1 WHERE id = p_vendor_id;
$$;

GRANT EXECUTE ON FUNCTION public.increment_store_view(UUID) TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.increment_product_view(p_product_id UUID)
RETURNS VOID
LANGUAGE SQL SECURITY DEFINER AS $$
  UPDATE public.products SET view_count = view_count + 1 WHERE id = p_product_id;
$$;

GRANT EXECUTE ON FUNCTION public.increment_product_view(UUID) TO authenticated, anon;

SELECT pg_notify('pgrst', 'reload schema');
