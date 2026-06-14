-- Professional verification: RLS policies for kyc_records
-- Table has RLS enabled but no policies were defined, so users could not
-- read or write their own records.

CREATE POLICY "kyc_own_insert" ON public.kyc_records
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "kyc_own_select" ON public.kyc_records
  FOR SELECT USING (user_id = auth.uid() OR public.is_moderator());

CREATE POLICY "kyc_moderator_update" ON public.kyc_records
  FOR UPDATE USING (public.is_moderator());

-- Fast admin queries: find professionals by account status
CREATE INDEX IF NOT EXISTS idx_profiles_role_status
  ON public.profiles(role, account_status);
