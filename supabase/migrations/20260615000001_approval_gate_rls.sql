-- Migration: approval gate — tighten prop_insert and prop_update to require
-- account_status = 'active'. Adds has_active_account() as a reusable helper
-- so the same check can be added to other tables without repeating the subquery.

CREATE OR REPLACE FUNCTION public.has_active_account()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND account_status = 'active'
  );
$$;

-- prop_insert: owner must have an active account (admins bypass).
DROP POLICY IF EXISTS "prop_insert" ON public.properties;
CREATE POLICY "prop_insert" ON public.properties
  FOR INSERT WITH CHECK (
    owner_id = auth.uid()
    AND (public.is_admin() OR public.has_active_account())
  );

-- prop_update: row visible to owner / agent / admin as before; commit only
-- allowed when the caller's account is active (or they are admin).
DROP POLICY IF EXISTS "prop_update" ON public.properties;
CREATE POLICY "prop_update" ON public.properties
  FOR UPDATE
  USING  (owner_id = auth.uid() OR agent_id = auth.uid() OR public.is_admin())
  WITH CHECK (public.is_admin() OR public.has_active_account());
