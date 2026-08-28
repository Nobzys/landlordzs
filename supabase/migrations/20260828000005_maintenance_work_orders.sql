-- Migration: Phase 13.2a — maintenance_work_orders table, RLS, and storage bucket.
--
-- PREREQUISITE FIX (Phase 13.1 gap):
-- Phase 13.1 added 'maintenance' to profession_type (professional_profiles sub-type)
-- but omitted adding it to user_role (profiles.role column type). Without this,
-- any attempt to register or assign a maintenance worker fails with:
--   invalid input value for enum user_role: "maintenance"
-- IF NOT EXISTS makes the statement idempotent on re-application.
--
-- DATABASE TABLE: maintenance_work_orders
-- Model: direct-dispatch (PM → specific maintenance worker), not public marketplace.
-- This table is NOT an extension of service_requests; it is an independent table
-- with its own RLS, lifecycle, and storage integration.
--
-- Status lifecycle:
--   dispatched  → accepted     (worker accepts)
--   dispatched  → declined     (worker declines)
--   dispatched  → cancelled    (PM withdraws before worker responds)
--   accepted    → in_progress  (worker marks job started)
--   accepted    → cancelled    (PM cancels after acceptance)
--   in_progress → completed    (worker marks done + uploads completion photos)
--   completed   → closed       (PM verifies and closes)
--   completed   → disputed     (PM disputes quality)
-- Terminal states: closed, cancelled, declined, disputed
--
-- Actor permissions:
--   manager_id  (property_manager) — INSERT, cancel, close, dispute
--   worker_id   (maintenance)      — accept, decline, mark started, mark completed
--   owner_id    (seller/agent)     — SELECT only (their property's audit trail)
--
-- Parts tracking: single nullable parts_cost_xaf BIGINT (minimal scope per D3).
-- No itemised parts table, no inventory management.
--
-- Storage bucket: maintenance-photos (private)
-- Path convention: {work_order_id}/{worker_user_id}/{uuid}.{ext}
-- Access: RLS-enforced per-work-order party check; never public.

-- ─── Step 1: Add 'maintenance' to user_role enum (Phase 13.1 gap) ─────────────
-- Must be first; subsequent statements in this migration do not reference the
-- new enum value in any CHECK expression, so SQLSTATE 55P04 is not triggered.
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'maintenance';

-- ─── Step 2: Create maintenance_work_orders table ─────────────────────────────

CREATE TABLE public.maintenance_work_orders (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Property anchor: which property requires maintenance
  property_id       uuid        NOT NULL REFERENCES public.properties(id)             ON DELETE CASCADE,

  -- Optional link to the PM's active property_assignment (audit trail)
  assignment_id     uuid                 REFERENCES public.property_assignments(id)   ON DELETE SET NULL,

  -- Parties: set server-side, never from client input
  owner_id          uuid        NOT NULL REFERENCES public.profiles(id)              ON DELETE CASCADE,
  manager_id        uuid        NOT NULL REFERENCES public.profiles(id)              ON DELETE CASCADE,
  worker_id         uuid        NOT NULL REFERENCES public.profiles(id)              ON DELETE CASCADE,

  -- Work order details
  title             text        NOT NULL,
  description       text        NOT NULL,
  priority          text        NOT NULL DEFAULT 'normal'
                                CHECK (priority IN ('low','normal','high','urgent')),
  category          text,
  due_date          date,

  -- Lifecycle status (TEXT + CHECK; avoids ALTER TYPE ADD VALUE per-value migrations)
  status            text        NOT NULL DEFAULT 'dispatched'
                                CHECK (status IN (
                                  'dispatched','accepted','declined',
                                  'in_progress','completed','closed',
                                  'cancelled','disputed'
                                )),

  -- Transition timestamps — each set exactly once as the status advances
  dispatched_at     timestamptz NOT NULL DEFAULT now(),
  accepted_at       timestamptz,
  declined_at       timestamptz,
  started_at        timestamptz,
  completed_at      timestamptz,
  closed_at         timestamptz,
  cancelled_at      timestamptz,

  -- Completion evidence (worker-supplied when marking completed)
  completion_notes  text,
  completion_photos text[]      NOT NULL DEFAULT '{}',

  -- Parts cost tracking (D3 minimal scope: total only, no line items)
  parts_cost_xaf    bigint,
  currency          public.currency_code NOT NULL DEFAULT 'XAF',

  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

SELECT public.attach_updated_at('maintenance_work_orders');

-- Indexes to support the primary query patterns in actions
CREATE INDEX idx_mwo_property  ON public.maintenance_work_orders(property_id);
CREATE INDEX idx_mwo_manager   ON public.maintenance_work_orders(manager_id);
CREATE INDEX idx_mwo_worker    ON public.maintenance_work_orders(worker_id);
CREATE INDEX idx_mwo_owner     ON public.maintenance_work_orders(owner_id);
CREATE INDEX idx_mwo_status    ON public.maintenance_work_orders(status);

-- ─── Step 3: RLS ──────────────────────────────────────────────────────────────

ALTER TABLE public.maintenance_work_orders ENABLE ROW LEVEL SECURITY;

-- Manager, assigned worker, and property owner can read their own records; admin reads all.
-- Unauthorised users (any other role, unauthenticated) see zero rows.
CREATE POLICY "wo_select" ON public.maintenance_work_orders
  FOR SELECT USING (
    manager_id = auth.uid()
    OR worker_id  = auth.uid()
    OR owner_id   = auth.uid()
    OR public.is_admin()
  );

-- INSERT goes through createAdminClient() in workOrders.ts after full server-side
-- verification (role check, active assignment, active worker). This policy is the
-- defense-in-depth gate for any future direct-client INSERT attempt.
CREATE POLICY "wo_insert" ON public.maintenance_work_orders
  FOR INSERT WITH CHECK (
    manager_id = auth.uid()
    AND (public.is_admin() OR public.has_active_account())
  );

-- Status transitions:
--   manager: cancel (dispatched/accepted → cancelled), close (completed → closed),
--            dispute (completed → disputed)
--   worker:  accept/decline (dispatched → accepted/declined),
--            start (accepted → in_progress), complete (in_progress → completed)
-- Fine-grained business logic (which party may make which transition) is enforced
-- in workOrders.ts server actions, not here. RLS provides the broad party gate.
CREATE POLICY "wo_update" ON public.maintenance_work_orders
  FOR UPDATE
  USING  (manager_id = auth.uid() OR worker_id = auth.uid() OR public.is_admin())
  WITH CHECK (public.is_admin() OR public.has_active_account());

-- Physical deletion is admin-only. Parties must use status transitions (cancelled/closed).
CREATE POLICY "wo_delete" ON public.maintenance_work_orders
  FOR DELETE USING (public.is_admin());

-- ─── Step 4: Storage bucket — maintenance-photos (private) ───────────────────
-- Private: completion photos may contain property details and interior images.
-- Public access is never appropriate; party-scoped access is enforced by RLS.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'maintenance-photos',
  'maintenance-photos',
  FALSE,
  10485760,
  ARRAY['image/jpeg','image/png','image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Read: any party to the work order (manager, worker, owner) + admin.
-- The JOIN resolves the work_order_id from path segment [1].
CREATE POLICY lzs_mntphoto_select
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'maintenance-photos'
    AND auth.uid() IS NOT NULL
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1 FROM public.maintenance_work_orders
        WHERE id = (storage.foldername(name))[1]::uuid
          AND (
            manager_id = auth.uid()
            OR worker_id  = auth.uid()
            OR owner_id   = auth.uid()
          )
      )
    )
  );

-- Write: only the assigned worker, only into their own sub-folder
-- (path[1] = work_order_id, path[2] = worker_user_id),
-- and only while the work order is in 'in_progress' status.
CREATE POLICY lzs_mntphoto_insert
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'maintenance-photos'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.maintenance_work_orders
      WHERE id        = (storage.foldername(name))[1]::uuid
        AND worker_id = auth.uid()
        AND status    = 'in_progress'
    )
  );

-- Update: worker may replace their own upload (re-upload a clearer photo).
CREATE POLICY lzs_mntphoto_update
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'maintenance-photos'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- Delete: worker (their own folder) or admin.
CREATE POLICY lzs_mntphoto_delete
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'maintenance-photos'
    AND (
      (storage.foldername(name))[2] = auth.uid()::text
      OR public.is_admin()
    )
  );
