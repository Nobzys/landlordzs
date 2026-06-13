-- Migration: 0007 — Vendors, Products & Orders

CREATE TABLE public.vendor_profiles (
  id                UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  store_name        TEXT NOT NULL,
  store_slug        TEXT NOT NULL UNIQUE,
  store_logo        TEXT,
  store_banner      TEXT,
  store_description TEXT,
  business_reg      TEXT,
  tax_id            TEXT,
  phone             TEXT,
  email             TEXT,
  website           TEXT,
  city              public.cameroon_city,
  address           TEXT,
  is_verified       BOOLEAN NOT NULL DEFAULT FALSE,
  is_featured       BOOLEAN NOT NULL DEFAULT FALSE,
  rating_avg        DECIMAL(3,2) NOT NULL DEFAULT 0,
  rating_count      INT NOT NULL DEFAULT 0,
  product_count     INT NOT NULL DEFAULT 0,
  order_count       INT NOT NULL DEFAULT 0,
  commission_rate   DECIMAL(5,2) NOT NULL DEFAULT 5.00,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SELECT public.attach_updated_at('vendor_profiles');
CREATE INDEX idx_vendor_slug ON public.vendor_profiles(store_slug);
CREATE INDEX idx_vendor_city ON public.vendor_profiles(city);

CREATE TABLE public.product_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id   UUID REFERENCES public.product_categories(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  name_fr     TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  icon        TEXT,
  image_url   TEXT,
  description TEXT,
  sort_order  INT NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_product_cat_parent ON public.product_categories(parent_id);

CREATE TABLE public.products (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id      UUID NOT NULL REFERENCES public.vendor_profiles(id) ON DELETE CASCADE,
  category_id    UUID REFERENCES public.product_categories(id),
  name           TEXT NOT NULL,
  name_fr        TEXT,
  slug           TEXT NOT NULL UNIQUE,
  description    TEXT,
  description_fr TEXT,
  sku            TEXT UNIQUE,
  brand          TEXT,
  model          TEXT,
  price          BIGINT NOT NULL,
  original_price BIGINT,
  currency       public.currency_code NOT NULL DEFAULT 'XAF',
  stock_qty      INT NOT NULL DEFAULT 0,
  min_order_qty  INT NOT NULL DEFAULT 1,
  max_order_qty  INT,
  unit           TEXT NOT NULL DEFAULT 'unit',
  weight_kg      DECIMAL(8,3),
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured    BOOLEAN NOT NULL DEFAULT FALSE,
  is_available   BOOLEAN NOT NULL DEFAULT TRUE,
  rating_avg     DECIMAL(3,2) NOT NULL DEFAULT 0,
  rating_count   INT NOT NULL DEFAULT 0,
  view_count     INT NOT NULL DEFAULT 0,
  order_count    INT NOT NULL DEFAULT 0,
  specifications JSONB NOT NULL DEFAULT '{}',
  tags           TEXT[] NOT NULL DEFAULT '{}',
  search_vector  TSVECTOR,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SELECT public.attach_updated_at('products');
CREATE INDEX idx_products_vendor   ON public.products(vendor_id);
CREATE INDEX idx_products_category ON public.products(category_id);
CREATE INDEX idx_products_price    ON public.products(price);
CREATE INDEX idx_products_stock    ON public.products(stock_qty);
CREATE INDEX idx_products_search   ON public.products USING GIN(search_vector);
CREATE INDEX idx_products_tags     ON public.products USING GIN(tags);
CREATE INDEX idx_products_active   ON public.products(is_active) WHERE is_active;

CREATE TABLE public.product_images (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  alt_text   TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_product_images_prod ON public.product_images(product_id);

CREATE TABLE public.product_variants (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  sku        TEXT UNIQUE,
  price      BIGINT,
  stock_qty  INT NOT NULL DEFAULT 0,
  attributes JSONB NOT NULL DEFAULT '{}',
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SELECT public.attach_updated_at('product_variants');
CREATE INDEX idx_product_variants_prod ON public.product_variants(product_id);

CREATE TABLE public.inventory_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id     UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id     UUID REFERENCES public.product_variants(id) ON DELETE CASCADE,
  change_type    TEXT NOT NULL,
  quantity_delta INT NOT NULL,
  stock_before   INT NOT NULL,
  stock_after    INT NOT NULL,
  reference_id   UUID,
  notes          TEXT,
  created_by     UUID REFERENCES public.profiles(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_inventory_prod    ON public.inventory_logs(product_id);
CREATE INDEX idx_inventory_created ON public.inventory_logs(created_at DESC);

CREATE TABLE public.cart_items (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE,
  quantity   INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, product_id, variant_id)
);
SELECT public.attach_updated_at('cart_items');
CREATE INDEX idx_cart_user ON public.cart_items(user_id);

CREATE TABLE public.orders (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id            UUID NOT NULL REFERENCES public.profiles(id),
  vendor_id           UUID NOT NULL REFERENCES public.vendor_profiles(id),
  status              public.order_status NOT NULL DEFAULT 'pending',
  subtotal            BIGINT NOT NULL,
  shipping_fee        BIGINT NOT NULL DEFAULT 0,
  discount_amount     BIGINT NOT NULL DEFAULT 0,
  commission          BIGINT NOT NULL DEFAULT 0,
  total               BIGINT NOT NULL,
  currency            public.currency_code NOT NULL DEFAULT 'XAF',
  shipping_name       TEXT,
  shipping_phone      TEXT,
  shipping_address    TEXT,
  shipping_city       public.cameroon_city,
  payment_status      public.payment_status NOT NULL DEFAULT 'pending',
  payment_provider    public.payment_provider,
  payment_ref         TEXT,
  paid_at             TIMESTAMPTZ,
  notes               TEXT,
  confirmed_at        TIMESTAMPTZ,
  shipped_at          TIMESTAMPTZ,
  delivered_at        TIMESTAMPTZ,
  cancelled_at        TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SELECT public.attach_updated_at('orders');
CREATE INDEX idx_orders_buyer   ON public.orders(buyer_id);
CREATE INDEX idx_orders_vendor  ON public.orders(vendor_id);
CREATE INDEX idx_orders_status  ON public.orders(status);
CREATE INDEX idx_orders_created ON public.orders(created_at DESC);

CREATE TABLE public.order_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id   UUID NOT NULL REFERENCES public.products(id),
  variant_id   UUID REFERENCES public.product_variants(id),
  product_name TEXT NOT NULL,
  quantity     INT NOT NULL CHECK (quantity > 0),
  unit_price   BIGINT NOT NULL,
  total_price  BIGINT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_order_items_order   ON public.order_items(order_id);
CREATE INDEX idx_order_items_product ON public.order_items(product_id);
