-- Migration: property_status_history — permanent audit trail of every
-- property.status change. Rows are inserted only by the trigger added in
-- 20260620000005 (never directly by application code), so there is no
-- INSERT policy for regular users below — by design.
--
-- property_id intentionally has no ON DELETE CASCADE: history must survive
-- even if a property row is ever removed directly in the database, so a
-- hard delete of a property with history is blocked unless the history
-- rows are removed first (Postgres default NO ACTION).

CREATE TABLE IF NOT EXISTS public.property_status_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id),
  old_status  public.property_status,
  new_status  public.property_status NOT NULL,
  changed_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prop_status_history_property   ON public.property_status_history(property_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prop_status_history_changed_by ON public.property_status_history(changed_by);

ALTER TABLE public.property_status_history ENABLE ROW LEVEL SECURITY;

-- Owners can read the history of their own properties.
DROP POLICY IF EXISTS prop_status_history_owner_select ON public.property_status_history;
CREATE POLICY prop_status_history_owner_select ON public.property_status_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE properties.id = property_status_history.property_id
        AND properties.owner_id = auth.uid()
    )
  );

-- Admins/moderators have full access (matches verif_audit_mod_all pattern).
DROP POLICY IF EXISTS prop_status_history_mod_all ON public.property_status_history;
CREATE POLICY prop_status_history_mod_all ON public.property_status_history
  FOR ALL
  USING (public.is_moderator());
