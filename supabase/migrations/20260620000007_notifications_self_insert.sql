-- Fix: submitKycDocuments (src/lib/actions/auth.ts) inserts a "verification
-- submitted" notification for the current user via the regular (RLS-bound)
-- client, but the only existing INSERT policy on notifications,
-- notif_insert, requires is_admin(). For any non-admin user this insert
-- silently fails (the action doesn't check its error), so users never see
-- their own "submitted" notification. Admin-initiated notifications (KYC
-- approved/rejected, etc.) are unaffected — those already go through
-- createAdminClient(), which bypasses RLS entirely.
--
-- Add a permissive self-insert policy, scoped to user_id = auth.uid() only
-- (cannot create notifications for anyone else), alongside the existing
-- admin policy rather than replacing it.

DROP POLICY IF EXISTS "notif_own_insert" ON public.notifications;

CREATE POLICY "notif_own_insert" ON public.notifications
  FOR INSERT
  WITH CHECK (user_id = auth.uid());
