-- Migration: 0003 — Utility Functions & Role Helpers
-- Run order: after enums, before table creation

-- ─── updated_at auto-stamp ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Attach updated_at trigger to any table
CREATE OR REPLACE FUNCTION public.attach_updated_at(tbl TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE format(
    'CREATE TRIGGER set_updated_at
     BEFORE UPDATE ON %I
     FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at()',
    tbl
  );
END;
$$;

-- ─── Role helpers (SECURITY DEFINER to avoid RLS recursion) ──────────────────
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.user_role
LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_moderator()
RETURNS BOOLEAN
LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'moderator')
  );
$$;

-- ─── Auto-create profile on Supabase Auth signup ─────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE((NEW.raw_user_meta_data ->> 'role')::public.user_role, 'buyer')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- ─── Property slug + search vector ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.properties_before_save()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug :=
      lower(regexp_replace(unaccent(NEW.title), '[^a-z0-9]+', '-', 'g'))
      || '-' || substr(gen_random_uuid()::text, 1, 8);
  END IF;

  NEW.search_vector :=
    SETWEIGHT(TO_TSVECTOR('french', COALESCE(unaccent(NEW.title),        '')), 'A') ||
    SETWEIGHT(TO_TSVECTOR('french', COALESCE(unaccent(COALESCE(NEW.description, '')), '')), 'B') ||
    SETWEIGHT(TO_TSVECTOR('simple', COALESCE(NEW.city::text,             '')), 'C') ||
    SETWEIGHT(TO_TSVECTOR('simple', COALESCE(NEW.neighborhood,           '')), 'C');
  RETURN NEW;
END;
$$;

-- ─── Rating aggregation ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.refresh_rating()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_type  TEXT;
  v_id    UUID;
  v_avg   DECIMAL(3,2);
  v_count INT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_type := OLD.target_type; v_id := OLD.target_id;
  ELSE
    v_type := NEW.target_type; v_id := NEW.target_id;
  END IF;

  SELECT ROUND(AVG(rating)::NUMERIC, 2), COUNT(*)
  INTO v_avg, v_count
  FROM public.reviews
  WHERE target_type = v_type AND target_id = v_id AND NOT is_hidden;

  v_avg   := COALESCE(v_avg, 0);
  v_count := COALESCE(v_count, 0);

  CASE v_type
    WHEN 'vendor'  THEN UPDATE public.vendor_profiles      SET rating_avg=v_avg, rating_count=v_count WHERE id=v_id;
    WHEN 'agent'   THEN UPDATE public.agent_profiles       SET rating_avg=v_avg, rating_count=v_count WHERE id=v_id;
    WHEN 'product' THEN UPDATE public.products             SET rating_avg=v_avg, rating_count=v_count WHERE id=v_id;
    WHEN 'rental'  THEN UPDATE public.rental_listings      SET rating_avg=v_avg, rating_count=v_count WHERE id=v_id;
    WHEN 'service' THEN UPDATE public.service_listings     SET rating_avg=v_avg, rating_count=v_count WHERE id=v_id;
    WHEN 'contractor','engineer','architect','lawyer' THEN
      UPDATE public.professional_profiles SET rating_avg=v_avg, rating_count=v_count WHERE id=v_id;
    ELSE NULL;
  END CASE;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ─── Wallet debit/credit with balance validation ──────────────────────────────
CREATE OR REPLACE FUNCTION public.wallet_transfer(
  p_from_id UUID,
  p_to_id   UUID,
  p_amount  BIGINT,
  p_ref_type TEXT DEFAULT NULL,
  p_ref_id   UUID DEFAULT NULL,
  p_desc     TEXT DEFAULT NULL
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_from_bal BIGINT;
BEGIN
  SELECT balance INTO v_from_bal FROM public.wallets WHERE user_id = p_from_id FOR UPDATE;
  IF v_from_bal < p_amount THEN
    RAISE EXCEPTION 'Insufficient wallet balance';
  END IF;

  UPDATE public.wallets SET balance = balance - p_amount WHERE user_id = p_from_id;
  UPDATE public.wallets SET balance = balance + p_amount WHERE user_id = p_to_id;

  INSERT INTO public.wallet_transactions
    (wallet_id, user_id, type, amount, balance_before, balance_after, reference_type, reference_id, description)
  SELECT w.id, p_from_id, 'debit', p_amount, v_from_bal, v_from_bal - p_amount,
         p_ref_type, p_ref_id, p_desc
  FROM public.wallets w WHERE w.user_id = p_from_id;

  INSERT INTO public.wallet_transactions
    (wallet_id, user_id, type, amount, balance_before, balance_after, reference_type, reference_id, description)
  SELECT w.id, p_to_id, 'credit', p_amount, w.balance - p_amount, w.balance,
         p_ref_type, p_ref_id, p_desc
  FROM public.wallets w WHERE w.user_id = p_to_id;
END;
$$;

-- ─── Increment view count (debounced by IP within 24h) ───────────────────────
CREATE OR REPLACE FUNCTION public.increment_property_views(
  p_property_id UUID,
  p_viewer_id   UUID DEFAULT NULL,
  p_ip          TEXT DEFAULT NULL
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.property_views
    WHERE property_id = p_property_id
      AND ip_address = p_ip
      AND viewed_at > NOW() - INTERVAL '24 hours'
  ) THEN
    INSERT INTO public.property_views (property_id, viewer_id, ip_address)
    VALUES (p_property_id, p_viewer_id, p_ip);

    UPDATE public.properties
    SET view_count = view_count + 1
    WHERE id = p_property_id;
  END IF;
END;
$$;

-- ─── Release escrow funds ─────────────────────────────────────────────────────
/*
CREATE OR REPLACE FUNCTION public.release_escrow(p_escrow_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_escrow public.escrow_accounts%ROWTYPE;
BEGIN
  SELECT * INTO v_escrow FROM public.escrow_accounts
  WHERE id = p_escrow_id AND status = 'funded' FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Escrow % not found or not in funded state', p_escrow_id;
  END IF;

  -- Credit payee wallet
  UPDATE public.wallets
  SET balance = balance + (v_escrow.amount - v_escrow.platform_fee)
  WHERE user_id = v_escrow.payee_id;

  -- Mark escrow released
  UPDATE public.escrow_accounts
  SET status = 'released', released_at = NOW()
  WHERE id = p_escrow_id;

  -- Log event
  INSERT INTO public.escrow_events (escrow_id, event_type, description)s
  VALUES (p_escrow_id, 'auto_released', 'Auto-released after 30-day hold period');
END;
$$;
*/