-- Migration: add 'active_sellers' to get_admin_metrics() — count of
-- profiles with role='seller' AND account_status='active' only (not all
-- sellers regardless of status, which users_by_role already provides).
-- All other fields unchanged.

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
      FROM (
        SELECT role::TEXT, COUNT(*) AS cnt
        FROM profiles
        GROUP BY role
      ) t
    ),
    'new_users_today', (
      SELECT COUNT(*) FROM profiles WHERE created_at >= CURRENT_DATE
    ),
    'active_sellers', (
      SELECT COUNT(*) FROM profiles WHERE role = 'seller' AND account_status = 'active'
    ),

    -- ── Property metrics ──────────────────────────────────────────────────────
    'props_by_status', (
      SELECT COALESCE(jsonb_object_agg(status, cnt), '{}'::jsonb)
      FROM (
        SELECT status::TEXT, COUNT(*) AS cnt
        FROM properties
        GROUP BY status
      ) t
    ),

    -- ── Verification metrics ──────────────────────────────────────────────────
    'verif_pending', (
      SELECT COUNT(*) FROM property_verifications WHERE status = 'pending'
    ),
    'verif_approved_today', (
      -- reviewVerification() sets verified_at for both approve and reject
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

    -- ── Financial / operational metrics ───────────────────────────────────────
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
