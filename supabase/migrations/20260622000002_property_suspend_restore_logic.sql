-- Migration: wire the 'suspended' status (added in 20260622000001) into the
-- existing transition guard, lifecycle trigger, and history logger. No new
-- tables/triggers/RLS — extends the three functions already governing
-- property status changes so suspend/restore is enforced the same way every
-- other transition is.
--
-- Only active -> suspended -> active is allowed: suspension is only ever
-- applied to an active listing (see business rule in the task), so restore
-- always returns to 'active'.

CREATE OR REPLACE FUNCTION public.is_valid_property_status_transition(
  p_old public.property_status,
  p_new public.property_status
) RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (p_old, p_new) IN (
    ('draft',          'pending_review'), ('draft',          'archived'),
    ('pending_review', 'active'),         ('pending_review', 'rejected'),
    ('active',         'under_offer'),    ('active',         'sold'),
    ('active',         'rented'),         ('active',         'off_market'),
    ('active',         'expired'),        ('active',         'suspended'),
    ('under_offer',    'active'),         ('under_offer',    'sold'),
    ('sold',           'archived'),
    ('rented',         'archived'),
    ('off_market',     'active'),         ('off_market',     'archived'),
    ('expired',        'active'),         ('expired',        'archived'),
    ('rejected',       'draft'),          ('rejected',       'archived'),
    ('suspended',      'active')
  );
$$;

CREATE OR REPLACE FUNCTION public.properties_before_save()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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

  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NOT public.is_valid_property_status_transition(OLD.status, NEW.status) THEN
      RAISE EXCEPTION 'Invalid property status transition: % -> %', OLD.status, NEW.status
        USING ERRCODE = 'check_violation';
    END IF;

    IF NEW.status = 'sold' THEN
      NEW.sold_at := NOW();
    ELSIF OLD.status = 'sold' THEN
      NEW.sold_at := NULL;
    END IF;

    IF NEW.status = 'rented' THEN
      NEW.rented_at := NOW();
    ELSIF OLD.status = 'rented' THEN
      NEW.rented_at := NULL;
    END IF;

    IF NEW.status = 'archived' THEN
      NEW.deleted_at := NOW();
    END IF;

    IF OLD.status = 'suspended' AND NEW.status != 'suspended' THEN
      NEW.suspension_reason := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_property_status_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.property_status_history (property_id, old_status, new_status, changed_by, notes)
    VALUES (
      NEW.id, OLD.status, NEW.status, auth.uid(),
      CASE WHEN NEW.status = 'suspended' THEN NEW.suspension_reason ELSE NULL END
    );
  END IF;
  RETURN NEW;
END;
$$;
