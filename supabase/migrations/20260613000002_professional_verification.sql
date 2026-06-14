-- Professional verification: RLS policies for kyc_records
-- Table has RLS enabled but no policies were defined, so users could not
-- read or write their own records.
--
-- Renamed from 20260613000001 to 20260613000002 to resolve timestamp collision
-- with 20260613000001_p1_fixes.sql. DROP POLICY IF EXISTS guards added so this
-- migration is safe to apply whether or not 0016_rls_policies.sql already
-- created these policy names.

DROP POLICY IF EXISTS "kyc_own_insert"       ON public.kyc_records;
DROP POLICY IF EXISTS "kyc_own_select"       ON public.kyc_records;
DROP POLICY IF EXISTS "kyc_moderator_update" ON public.kyc_records;

CREATE POLICY "kyc_own_insert" ON public.kyc_records
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "kyc_own_select" ON public.kyc_records
  FOR SELECT USING (user_id = auth.uid() OR public.is_moderator());

CREATE POLICY "kyc_moderator_update" ON public.kyc_records
  FOR UPDATE USING (public.is_moderator());

-- Fast admin queries: find professionals by account status
CREATE INDEX IF NOT EXISTS idx_profiles_role_status
  ON public.profiles(role, account_status);
