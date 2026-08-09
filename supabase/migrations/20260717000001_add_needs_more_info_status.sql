-- Migration: add 'needs_more_info' to verification_status enum
-- Additive only — does not affect existing rows. IF NOT EXISTS makes this idempotent.
ALTER TYPE public.verification_status ADD VALUE IF NOT EXISTS 'needs_more_info';
