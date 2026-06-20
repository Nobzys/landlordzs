-- Migration: automatically log every property.status change into
-- property_status_history. AFTER UPDATE so it only runs once the row
-- (including the transition-guard checks in properties_before_save) has
-- been accepted — an invalid transition raises an exception there and
-- this trigger never fires. SECURITY DEFINER so regular sellers/agents,
-- who have no INSERT policy on property_status_history, can still trigger
-- a logged row when they update their own property.

CREATE OR REPLACE FUNCTION public.log_property_status_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.property_status_history (property_id, old_status, new_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS properties_log_status_history ON public.properties;
CREATE TRIGGER properties_log_status_history
  AFTER UPDATE ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.log_property_status_history();
