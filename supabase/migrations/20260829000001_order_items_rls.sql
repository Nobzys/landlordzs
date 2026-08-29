-- Phase 15.2: Add missing RLS policies for marketplace checkout

-- Buyers can insert order_items only for their own orders
CREATE POLICY "orderitems_insert"
  ON public.order_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
       WHERE id = order_id
         AND buyer_id = auth.uid()
    )
  );

-- Buyers can cancel their own orders while still pre-shipment.
-- Co-exists with the existing vendor-side "orders_update" policy.
-- USING checks the old row (only pre-shipment orders are selectable for update).
-- WITH CHECK checks the new row (the update must produce a 'cancelled' status for the same buyer).
CREATE POLICY "orders_cancel_buyer"
  ON public.orders
  FOR UPDATE
  USING (
    buyer_id = auth.uid()
    AND status IN ('pending', 'confirmed')
  )
  WITH CHECK (
    buyer_id = auth.uid()
    AND status = 'cancelled'
  );
