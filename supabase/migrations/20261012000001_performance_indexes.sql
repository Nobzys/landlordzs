-- Migration: 20261012000001 — Performance indexes for high-traffic query patterns
--
-- Existing indexes already cover:
--   notifications: idx_notif_user (user_id, created_at DESC) + idx_notif_unread (partial WHERE NOT is_read)
--   messages: idx_messages_conv (conversation_id, created_at DESC)
--   orders (single-column): buyer_id, vendor_id, status, created_at DESC
--
-- New composite indexes below address the two patterns not already covered:
--   1. service_requests: professional discovery filters by status AND city simultaneously
--   2. orders: vendor order list filters by vendor_id + status, ordered by created_at DESC

-- Composite index for professional service-request discovery
-- Supports: WHERE status = 'open' AND city = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_svc_req_status_city
  ON public.service_requests(status, city, created_at DESC);

-- Composite index for vendor order management dashboard
-- Supports: WHERE vendor_id = ? AND status = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_orders_vendor_status_created
  ON public.orders(vendor_id, status, created_at DESC);
