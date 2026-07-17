-- Fix: property_status_history FK must cascade on property deletion.
--
-- This table was created outside the tracked migration system and its
-- property_id FK was added without ON DELETE CASCADE. Every other child
-- table of properties uses ON DELETE CASCADE (migration 0006 lines
-- 96/110/123/135/153/167/192). service_requests.property_id (also
-- untracked) was confirmed CASCADE by live deletion test 2026-07-15.
-- This restores consistency and unblocks seller property deletion.

ALTER TABLE public.property_status_history
  DROP CONSTRAINT property_status_history_property_id_fkey;

ALTER TABLE public.property_status_history
  ADD CONSTRAINT property_status_history_property_id_fkey
  FOREIGN KEY (property_id)
  REFERENCES public.properties(id)
  ON DELETE CASCADE;
