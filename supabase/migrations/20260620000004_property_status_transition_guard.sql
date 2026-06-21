-- Migration: enforce valid property status transitions and automate
-- lifecycle timestamps in the database, mirroring
-- src/lib/property-status.ts so the rule holds even if a caller bypasses
-- the application layer (e.g. direct SQL, a future script, or a bug in a
-- server action). Extends the existing properties_before_save() trigger
-- function instead of adding a competing BEFORE trigger, so execution
-- order relative to the slug/search_vector logic stays well-defined.

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
    ('active',         'expired'),
    ('under_offer',    'active'),         ('under_offer',    'sold'),
    ('sold',           'archived'),
    ('rented',         'archived'),
    ('off_market',     'active'),         ('off_market',     'archived'),
    ('expired',        'active'),         ('expired',        'archived'),
    ('rejected',       'draft'),          ('rejected',       'archived')
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
  END IF;

  RETURN NEW;
END;
$function$;
