-- Migration: property_assignments
-- Owner-initiated, PM-accepted management assignments.
-- Status lifecycle:
--   requested  → active (PM accepts)
--   requested  → declined (PM rejects)
--   requested  → cancelled (owner withdraws before PM responds)
--   active     → ended (either party terminates)
-- Partial unique index enforces at most one active PM per property while
-- preserving unlimited historical records.

CREATE TABLE public.property_assignments (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id     uuid        NOT NULL REFERENCES public.properties(id)  ON DELETE CASCADE,
  owner_id        uuid        NOT NULL REFERENCES public.profiles(id)    ON DELETE CASCADE,
  manager_id      uuid        NOT NULL REFERENCES public.profiles(id)    ON DELETE CASCADE,
  status          text        NOT NULL DEFAULT 'requested'
                              CHECK (status IN ('requested','active','declined','ended','cancelled')),
  management_type text        NOT NULL DEFAULT 'full'
                              CHECK (management_type IN ('full','rental_only','maintenance_only')),
  start_date      date,
  end_date        date,
  notes           text,
  requested_at    timestamptz NOT NULL DEFAULT now(),
  accepted_at     timestamptz,
  declined_at     timestamptz,
  cancelled_at    timestamptz,
  ended_at        timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

SELECT public.attach_updated_at('property_assignments');

-- At most one active PM per property at any time.
-- ended / declined / cancelled / requested rows are unrestricted.
CREATE UNIQUE INDEX idx_propassgn_one_active
  ON public.property_assignments(property_id)
  WHERE status = 'active';

CREATE INDEX idx_propassgn_property ON public.property_assignments(property_id);
CREATE INDEX idx_propassgn_manager  ON public.property_assignments(manager_id);
CREATE INDEX idx_propassgn_owner    ON public.property_assignments(owner_id);
CREATE INDEX idx_propassgn_status   ON public.property_assignments(status);

ALTER TABLE public.property_assignments ENABLE ROW LEVEL SECURITY;

-- Owner and assigned PM can read; admin reads all.
CREATE POLICY "propassgn_select" ON public.property_assignments
  FOR SELECT USING (
    owner_id = auth.uid() OR manager_id = auth.uid() OR public.is_admin()
  );

-- Status transitions by owner or PM.
-- INSERT is handled server-side via admin client after ownership verification.
CREATE POLICY "propassgn_update" ON public.property_assignments
  FOR UPDATE
  USING  (owner_id = auth.uid() OR manager_id = auth.uid() OR public.is_admin())
  WITH CHECK (public.is_admin() OR public.has_active_account());

-- Physical deletion by admin only; users move status to ended/cancelled.
CREATE POLICY "propassgn_delete" ON public.property_assignments
  FOR DELETE USING (public.is_admin());

-- Extend prop_select so PMs can read properties they actively manage,
-- including non-active listings (draft, off_market, etc.).
-- All prior access rules are preserved; only an OR clause is added.
DROP POLICY IF EXISTS "prop_select" ON public.properties;
CREATE POLICY "prop_select" ON public.properties FOR SELECT USING (
  status = 'active'
  OR owner_id   = auth.uid()
  OR agent_id   = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.property_assignments pa
    WHERE pa.property_id = properties.id
      AND pa.manager_id  = auth.uid()
      AND pa.status      = 'active'
  )
  OR public.is_admin()
);
