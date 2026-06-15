-- Add five new role values to the user_role enum.
-- ALTER TYPE ... ADD VALUE is not transactional in PostgreSQL, but is safe
-- when applied as a migration because Supabase runs each file atomically.

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'tenant';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'developer';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'property_manager';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'surveyor';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'maintenance';
