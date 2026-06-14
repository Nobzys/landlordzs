-- Fix C1: profiles_update_own lacked WITH CHECK, allowing any authenticated
-- user to set role, is_verified, is_premium, or account_status on their own
-- row via direct Supabase REST API calls, bypassing all Next.js server action
-- validation.
--
-- Root cause: supabase/migrations/20260610000016_rls_policies.sql:75
--   CREATE POLICY "profiles_update_own" ON public.profiles
--     FOR UPDATE USING (id = auth.uid());
-- No WITH CHECK means PostgreSQL reuses the USING expression as the post-update
-- row check. After SET role='admin', id = auth.uid() is still true because id
-- was not changed. The update commits.
--
-- The WITH CHECK subselects read the pre-update value of each sensitive column
-- and assert it is unchanged. If the submitted value differs, the equality
-- fails and PostgreSQL rejects the update with an RLS violation.
--
-- account_status exception: OR account_status = 'pending_verification' is
-- retained because completeAgentProfile (src/lib/actions/auth.ts:391) and
-- completeProfessionalProfile (src/lib/actions/auth.ts:465) write this value
-- using the user's own Supabase client (createClient(), subject to RLS).
-- Removing the exception would break professional onboarding without also
-- moving those two calls to createAdminClient().

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id              = auth.uid()
    AND role        = (SELECT role        FROM public.profiles WHERE id = auth.uid())
    AND is_verified = (SELECT is_verified FROM public.profiles WHERE id = auth.uid())
    AND is_premium  = (SELECT is_premium  FROM public.profiles WHERE id = auth.uid())
    AND (
      account_status = (SELECT account_status FROM public.profiles WHERE id = auth.uid())
      OR account_status = 'pending_verification'
    )
  );
