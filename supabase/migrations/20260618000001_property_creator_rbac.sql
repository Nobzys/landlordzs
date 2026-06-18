-- Migration: property creator RBAC — only seller/agent/admin may insert
-- properties. Adds is_property_creator() as a reusable SECURITY DEFINER
-- helper (same pattern as is_admin()/has_active_account()) and tightens
-- prop_insert to require it. Purely additive: no tables/columns dropped,
-- no data modified, only the prop_insert policy object is replaced.

CREATE OR REPLACE FUNCTION public.is_property_creator()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('seller', 'agent', 'admin')
  );
$$;

DROP POLICY IF EXISTS "prop_insert" ON public.properties;
CREATE POLICY "prop_insert" ON public.properties
  FOR INSERT WITH CHECK (
    owner_id = auth.uid()
    AND public.is_property_creator()
    AND (public.is_admin() OR public.has_active_account())
  );
