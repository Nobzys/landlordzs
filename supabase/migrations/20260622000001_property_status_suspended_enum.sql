-- Migration: add the 'suspended' value to property_status (admin
-- enforcement action, distinct from 'off_market' which is a seller action —
-- see src/lib/property-status.ts) and the column to hold the required
-- suspension reason.
--
-- Split into its own migration because a newly added enum value cannot be
-- referenced (e.g. in a function body) within the same transaction it was
-- added in. The transition-guard / trigger updates that reference
-- 'suspended' live in the next migration.

ALTER TYPE public.property_status ADD VALUE IF NOT EXISTS 'suspended';

ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS suspension_reason TEXT;
