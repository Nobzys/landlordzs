-- Migration: add 'archived' to property_status so the property lifecycle
-- can support an end-of-life state distinct from 'expired'/'off_market'.
-- Values-only — must stay its own migration since Postgres forbids using a
-- newly added enum value in the same transaction it was added in.

ALTER TYPE public.property_status ADD VALUE IF NOT EXISTS 'archived';
