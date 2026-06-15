-- Migration: Admin Metrics & Activity RPCs
-- Two SECURITY DEFINER functions consolidate all admin dashboard data into
-- two DB round-trips instead of ~12.

-- ─── get_admin_metrics ────────────────────────────────────────────────────────
-- LANGUAGE plpgsql: returns a scalar JSONB, no RETURNS TABLE, no implicit
-- output parameters — no PL/pgSQL variable-substitution conflict possible.

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

-- ─── get_admin_activity ───────────────────────────────────────────────────────
-- LANGUAGE sql (not plpgsql): avoids PL/pgSQL variable substitution.
--
-- Root cause of the previous failure:
--   RETURNS TABLE declares implicit output parameters whose names match the
--   column aliases in RETURN QUERY SELECT (actor_name, occurred_at, etc.).
--   PL/pgSQL replaces those identifiers with $N parameter markers even in
--   column-alias position, producing "NULL::TEXT AS $6" — a syntax error.
--
-- Fix: LANGUAGE sql has no PL/pgSQL variable-substitution pass.
--   Column aliases are treated as plain SQL identifiers.
--
-- Security: is_admin() is STABLE so PostgreSQL evaluates it once per query,
--   not once per row. Non-admins receive 0 rows rather than an exception;
--   this is acceptable because the admin dashboard has server-side auth.
--
-- Each UNION branch is parenthesized so ORDER BY / LIMIT applies only to
-- that branch, not the whole UNION (PostgreSQL grammar requirement).

CREATE OR REPLACE FUNCTION public.get_admin_activity(p_limit INT DEFAULT 20)
RETURNS TABLE (
  action       TEXT,
  entity_type  TEXT,
  entity_id    UUID,
  label        TEXT,
  actor_name   TEXT,
  occurred_at  TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM (
    -- New user registrations
    (
      SELECT
        'user_registered'::TEXT                               AS action,
        'profile'::TEXT                                       AS entity_type,
        p.id                                                  AS entity_id,
        COALESCE(p.full_name, p.display_name, p.email)::TEXT AS label,
        NULL::TEXT                                            AS actor_name,
        p.created_at                                          AS occurred_at
      FROM profiles p
      ORDER BY p.created_at DESC
      LIMIT 10
    )

    UNION ALL

    -- Property submitted for verification
    (
      SELECT
        'property_submitted'::TEXT,
        'property'::TEXT,
        pr.id,
        pr.title::TEXT,
        NULL::TEXT,
        pv.created_at
      FROM property_verifications pv
      JOIN properties pr ON pr.id = pv.property_id
      ORDER BY pv.created_at DESC
      LIMIT 10
    )

    UNION ALL

    -- Property approved
    (
      SELECT
        'property_approved'::TEXT,
        'property'::TEXT,
        pr.id,
        pr.title::TEXT,
        COALESCE(rev.full_name, rev.display_name, rev.email)::TEXT,
        pv.verified_at
      FROM property_verifications pv
      JOIN properties pr ON pr.id = pv.property_id
      LEFT JOIN profiles rev ON rev.id = pv.verified_by
      WHERE pv.status = 'approved' AND pv.verified_at IS NOT NULL
      ORDER BY pv.verified_at DESC
      LIMIT 10
    )

    UNION ALL

    -- Property rejected
    (
      SELECT
        'property_rejected'::TEXT,
        'property'::TEXT,
        pr.id,
        pr.title::TEXT,
        COALESCE(rev.full_name, rev.display_name, rev.email)::TEXT,
        pv.verified_at
      FROM property_verifications pv
      JOIN properties pr ON pr.id = pv.property_id
      LEFT JOIN profiles rev ON rev.id = pv.verified_by
      WHERE pv.status = 'rejected' AND pv.verified_at IS NOT NULL
      ORDER BY pv.verified_at DESC
      LIMIT 10
    )

    UNION ALL

    -- Account suspensions (from admin_logs; target_id is UUID per migration 0015)
    (
      SELECT
        'account_suspended'::TEXT,
        'profile'::TEXT,
        al.target_id,
        COALESCE(tgt.full_name, tgt.display_name, tgt.email)::TEXT,
        COALESCE(act.full_name, act.display_name, act.email)::TEXT,
        al.created_at
      FROM admin_logs al
      LEFT JOIN profiles tgt ON tgt.id = al.target_id
      LEFT JOIN profiles act ON act.id = al.actor_id
      WHERE al.action = 'suspend_account' AND al.target_id IS NOT NULL
      ORDER BY al.created_at DESC
      LIMIT 10
    )
  ) combined
  WHERE combined.occurred_at IS NOT NULL
    AND public.is_admin()
  ORDER BY combined.occurred_at DESC
  LIMIT p_limit;
$$;
