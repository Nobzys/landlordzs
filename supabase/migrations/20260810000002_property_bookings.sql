-- Migration: property_bookings — short-term property booking requests
-- Separate from service_bookings (professional services) and rental_bookings (equipment/vehicles).
-- Enables buyers to request dates on short_term listings; sellers approve or decline.

CREATE TABLE public.property_bookings (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id    UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  renter_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  owner_id       UUID NOT NULL REFERENCES public.profiles(id),
  check_in_date  DATE NOT NULL,
  check_out_date DATE NOT NULL,
  status         public.booking_status NOT NULL DEFAULT 'pending',
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (check_out_date > check_in_date)
);

SELECT public.attach_updated_at('property_bookings');

CREATE INDEX idx_propbook_property ON public.property_bookings(property_id);
CREATE INDEX idx_propbook_renter   ON public.property_bookings(renter_id);
CREATE INDEX idx_propbook_owner    ON public.property_bookings(owner_id);
CREATE INDEX idx_propbook_dates    ON public.property_bookings(check_in_date, check_out_date);
CREATE INDEX idx_propbook_status   ON public.property_bookings(status);

ALTER TABLE public.property_bookings ENABLE ROW LEVEL SECURITY;

-- Renter and owner can read their own booking records; admin reads all.
CREATE POLICY "propbook_select" ON public.property_bookings FOR SELECT USING (
  renter_id = auth.uid() OR owner_id = auth.uid() OR public.is_admin()
);

-- Only the owner (seller) can change booking status (approve/decline).
-- Inserts are handled server-side via admin client after ownership verification.
CREATE POLICY "propbook_owner_update" ON public.property_bookings FOR UPDATE USING (
  owner_id = auth.uid() OR public.is_admin()
);
