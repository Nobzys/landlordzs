-- Migration: allow a property's owner to mark an inquiry on their own
-- listing as read. property_inquiries previously had INSERT (any
-- authenticated user) and SELECT (sender, property owner, or admin) but no
-- UPDATE policy at all — RLS-enabled tables deny everything not explicitly
-- granted, so "mark inquiry as read" had no path to succeed. Scoped to
-- exactly the property owner updating rows on their own properties;
-- mirrors the existing propinq_select ownership check.

CREATE POLICY "propinq_owner_update" ON public.property_inquiries
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.properties WHERE id = property_id AND owner_id = auth.uid())
    OR public.is_admin()
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.properties WHERE id = property_id AND owner_id = auth.uid())
    OR public.is_admin()
  );
