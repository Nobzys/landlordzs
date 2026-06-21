-- Migration: add 'needs_more_info' to verification_status so the admin
-- verification workflow can ask a user for additional documents without
-- rejecting them outright. Values-only — must stay its own migration since
-- Postgres forbids using a newly added enum value in the same transaction
-- it was added in.

ALTER TYPE public.verification_status ADD VALUE IF NOT EXISTS 'needs_more_info';
