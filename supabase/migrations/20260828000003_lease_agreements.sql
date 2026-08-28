-- Migration: lease_agreements — long-term lease management for property managers and owners
-- Links a property to a tenant user; optionally references the managing PM assignment.
-- Status lifecycle:
--   draft       → active      (PM or owner activates)
--   active      → terminated  (PM or owner ends early)
--   active      → expired     (end_date has passed; checked in UI — no cron required)
-- Partial unique index enforces at most one active lease per property at any time
-- while preserving unlimited draft/historical records.
--
-- Tenant identity: any active platform user (no special role required).
-- manager_id nullable: supports owner-direct lease creation without a PM.
-- assignment_id nullable: links to the PM assignment that created this lease (audit trail).

CREATE TABLE public.lease_agreements (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id     uuid        NOT NULL REFERENCES public.properties(id)              ON DELETE CASCADE,
  owner_id        uuid        NOT NULL REFERENCES public.profiles(id)               ON DELETE CASCADE,
  manager_id      uuid                 REFERENCES public.profiles(id)               ON DELETE SET NULL,
  tenant_id       uuid        NOT NULL REFERENCES public.profiles(id)               ON DELETE CASCADE,
  assignment_id   uuid                 REFERENCES public.property_assignments(id)   ON DELETE SET NULL,
  status          text        NOT NULL DEFAULT 'draft'
                              CHECK (status IN ('draft','active','expired','terminated')),
  monthly_rent    bigint      NOT NULL CHECK (monthly_rent > 0),
  deposit_amount  bigint      NOT NULL DEFAULT 0 CHECK (deposit_amount >= 0),
  start_date      date        NOT NULL,
  end_date        date,
  terms           text,
  notes           text,
  activated_at    timestamptz,
  terminated_at   timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date IS NULL OR end_date > start_date)
);

SELECT public.attach_updated_at('lease_agreements');

-- At most one active lease per property at any time.
CREATE UNIQUE INDEX idx_lease_one_active
  ON public.lease_agreements(property_id)
  WHERE status = 'active';

CREATE INDEX idx_lease_property   ON public.lease_agreements(property_id);
CREATE INDEX idx_lease_owner      ON public.lease_agreements(owner_id);
CREATE INDEX idx_lease_manager    ON public.lease_agreements(manager_id);
CREATE INDEX idx_lease_tenant     ON public.lease_agreements(tenant_id);
CREATE INDEX idx_lease_assignment ON public.lease_agreements(assignment_id);
CREATE INDEX idx_lease_status     ON public.lease_agreements(status);

ALTER TABLE public.lease_agreements ENABLE ROW LEVEL SECURITY;

-- Owner, manager, or tenant can read their own records; admin reads all.
CREATE POLICY "lease_select" ON public.lease_agreements
  FOR SELECT USING (
    owner_id   = auth.uid()
    OR manager_id = auth.uid()
    OR tenant_id  = auth.uid()
    OR public.is_admin()
  );

-- Owner or manager can update status/terms; tenant cannot alter lease terms.
-- INSERT is handled server-side via admin client after ownership/assignment verification.
CREATE POLICY "lease_update" ON public.lease_agreements
  FOR UPDATE
  USING  (owner_id = auth.uid() OR manager_id = auth.uid() OR public.is_admin())
  WITH CHECK (public.is_admin() OR public.has_active_account());

-- Physical deletion by admin only; parties use status transitions (terminated/expired).
CREATE POLICY "lease_delete" ON public.lease_agreements
  FOR DELETE USING (public.is_admin());
