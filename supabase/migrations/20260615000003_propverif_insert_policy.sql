-- Migration: 20260615000003 — Add INSERT policy for property owners on property_verifications
-- Root cause: propverif_mod covers ALL operations but only for moderators.
-- Property owners (sellers) have no INSERT policy and cannot submit verification requests.

DROP POLICY IF EXISTS "propverif_owner_insert" ON public.property_verifications;
CREATE POLICY "propverif_owner_insert" ON public.property_verifications
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE id = property_id AND owner_id = auth.uid()
    )
  );
