-- Migration: 0017-002 — Enhance notifications + admin metrics

-- ─── Add columns to notifications ────────────────────────────────────────────
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS entity_type TEXT,
  ADD COLUMN IF NOT EXISTS entity_id   UUID;

-- ─── Add 'subscription' enum value ───────────────────────────────────────────
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'subscription';

-- ─── RLS on notifications ─────────────────────────────────────────────────────
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY notif_select_own ON public.notifications
    FOR SELECT USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY notif_update_own ON public.notifications
    FOR UPDATE USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY notif_admin_all ON public.notifications
    FOR ALL USING (public.is_admin());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Enhanced get_admin_metrics ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_admin_metrics()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  SELECT jsonb_build_object(
    -- ── User metrics ──────────────────────────────────────────────────────────
    'users_by_role', (
      SELECT COALESCE(jsonb_object_agg(role, cnt), '{}'::jsonb)
      FROM (SELECT role::TEXT, COUNT(*) AS cnt FROM profiles GROUP BY role) t
    ),
    'new_users_today', (
      SELECT COUNT(*) FROM profiles WHERE created_at >= CURRENT_DATE
    ),
    'total_users', (
      SELECT COUNT(*) FROM profiles WHERE role != 'admin'
    ),
    'activated_accounts', (
      SELECT COUNT(DISTINCT user_id) FROM subscriptions WHERE status = 'active'
    ),
    'pending_identity_verif', (
      SELECT COUNT(*) FROM verification_requests WHERE status = 'pending'
    ),

    -- ── Property metrics ──────────────────────────────────────────────────────
    'props_by_status', (
      SELECT COALESCE(jsonb_object_agg(status, cnt), '{}'::jsonb)
      FROM (SELECT status::TEXT, COUNT(*) AS cnt FROM properties GROUP BY status) t
    ),

    -- ── Verification metrics ──────────────────────────────────────────────────
    'verif_pending', (
      SELECT COUNT(*) FROM property_verifications WHERE status = 'pending'
    ),
    'verif_approved_today', (
      SELECT COUNT(*) FROM property_verifications
      WHERE status = 'approved' AND verified_at >= CURRENT_DATE
    ),
    'verif_rejected_today', (
      SELECT COUNT(*) FROM property_verifications
      WHERE status = 'rejected' AND verified_at >= CURRENT_DATE
    ),
    'total_verified_props', (
      SELECT COUNT(*) FROM properties WHERE is_verified = true
    ),

    -- ── Professional / subscription metrics ───────────────────────────────────
    'total_professionals', (
      SELECT COUNT(*) FROM profiles
      WHERE role IN ('contractor','engineer','architect','lawyer','surveyor','maintenance','vendor')
    ),
    'active_subscriptions', (
      SELECT COUNT(*) FROM subscriptions WHERE status = 'active'
    ),
    'expired_subscriptions', (
      SELECT COUNT(*) FROM subscriptions WHERE status IN ('expired','cancelled')
    ),

    -- ── Service request metrics ───────────────────────────────────────────────
    'open_service_requests', (
      SELECT COUNT(*) FROM service_requests WHERE status IN ('pending','accepted','in_progress')
    ),
    'completed_service_requests', (
      SELECT COUNT(*) FROM service_requests WHERE status = 'completed'
    ),

    -- ── Financial metrics ─────────────────────────────────────────────────────
    'total_revenue', (
      SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'completed'
    ),
    'mrr', (
      SELECT COALESCE(SUM(sp.amount), 0)
      FROM subscriptions s
      JOIN subscription_plans sp ON sp.id = s.plan_id
      WHERE s.status = 'active' AND sp.billing_type = 'monthly'
    ),
    'activation_fees_collected', (
      SELECT COALESCE(SUM(p.amount), 0)
      FROM payments p
      JOIN invoices i ON i.id = p.invoice_id
      JOIN subscriptions sub ON sub.id = i.subscription_id
      JOIN subscription_plans sp ON sp.id = sub.plan_id
      WHERE p.status = 'completed' AND sp.billing_type = 'one_time'
    ),
    'outstanding_invoices', (
      SELECT COALESCE(SUM(amount), 0) FROM invoices WHERE status IN ('pending','overdue')
    ),

    -- ── Escrow / operational metrics ──────────────────────────────────────────
    'pending_payouts', (
      SELECT COUNT(*) FROM payouts WHERE status IN ('pending', 'processing')
    ),
    'active_escrows', (
      SELECT COUNT(*) FROM escrow_accounts WHERE status IN ('funded', 'disputed')
    ),
    'disputed_escrows', (
      SELECT COUNT(*) FROM escrow_accounts WHERE status = 'disputed'
    ),
    'pending_reports', (
      SELECT COUNT(*) FROM moderation_reports WHERE status = 'pending'
    ),
    'pending_commissions', (
      SELECT COUNT(*) FROM commission_records WHERE status = 'pending'
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;
