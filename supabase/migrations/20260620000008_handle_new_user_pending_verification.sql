-- Fix: handle_new_user() never set account_status, so every new profile
-- got the column default 'active' regardless of role — including sellers,
-- vendors, agents, and the licensed professional roles, all of which are
-- supposed to start 'pending_verification' until an admin approves their
-- KYC submission (per APPROVAL_REQUIRED_ROLES and the requireActiveProfile/
-- createProperty checks that already gate on this status elsewhere). This
-- let brand-new, unverified sellers create and publish listings immediately
-- after email verification, with no KYC step ever enforced.
--
-- Mirrors APPROVAL_REQUIRED_ROLES (src/lib/utils/constants.ts): seller,
-- vendor, agent, contractor, engineer, architect, lawyer start
-- 'pending_verification'; buyer and admin keep the 'active' default.

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_role public.user_role;
BEGIN
  new_role := COALESCE(NEW.raw_user_meta_data->>'role', 'buyer')::public.user_role;

  INSERT INTO public.profiles (id, email, full_name, role, account_status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    new_role,
    CASE
      WHEN new_role IN ('seller','vendor','agent','contractor','engineer','architect','lawyer')
        THEN 'pending_verification'::public.account_status
      ELSE 'active'::public.account_status
    END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$;
