-- Migration: 20260617000001 — Subscription Plans, Subscriptions, Invoices, Payments
-- Additive only. No existing tables or data are modified.

-- ─── Enum: subscription status ──────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.subscription_status AS ENUM (
    'pending','active','past_due','expired','cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── Enum: billing type ──────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.billing_type AS ENUM (
    'one_time','monthly','annual'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── subscription_plans ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role         TEXT NOT NULL,
  name         TEXT NOT NULL,
  billing_type public.billing_type NOT NULL,
  amount       BIGINT NOT NULL CHECK (amount >= 0),
  currency     TEXT NOT NULL DEFAULT 'XAF',
  features     JSONB NOT NULL DEFAULT '[]',
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_plans_role      ON public.subscription_plans(role);
CREATE INDEX IF NOT EXISTS idx_plans_active    ON public.subscription_plans(is_active) WHERE is_active = true;

-- ─── subscriptions ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id               UUID REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
  status                public.subscription_status NOT NULL DEFAULT 'pending',
  starts_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at            TIMESTAMPTZ,
  auto_renew            BOOLEAN NOT NULL DEFAULT false,
  grace_period_ends_at  TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_subs_user       ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subs_status     ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subs_expires    ON public.subscriptions(expires_at) WHERE status = 'active';

-- ─── invoices ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  amount          BIGINT NOT NULL CHECK (amount >= 0),
  currency        TEXT NOT NULL DEFAULT 'XAF',
  status          TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','paid','void','overdue')),
  issued_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_invoices_user   ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_sub    ON public.invoices(subscription_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);

-- ─── payments (billing-specific) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payments (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invoice_id         UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  provider           TEXT NOT NULL,
  provider_reference TEXT,
  amount             BIGINT NOT NULL CHECK (amount >= 0),
  currency           TEXT NOT NULL DEFAULT 'XAF',
  status             TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','completed','failed','refunded')),
  metadata           JSONB NOT NULL DEFAULT '{}',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payments_user    ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON public.payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_status  ON public.payments(status);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments           ENABLE ROW LEVEL SECURITY;

-- subscription_plans: anyone can read active plans
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'subscription_plans' AND policyname = 'plans_select_active'
  ) THEN
    CREATE POLICY "plans_select_active" ON public.subscription_plans
      FOR SELECT USING (is_active = true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'subscription_plans' AND policyname = 'plans_admin_all'
  ) THEN
    CREATE POLICY "plans_admin_all" ON public.subscription_plans
      FOR ALL USING (public.is_admin());
  END IF;
END $$;

-- subscriptions: users read/modify their own; admin reads all
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'subscriptions' AND policyname = 'subs_own_select'
  ) THEN
    CREATE POLICY "subs_own_select" ON public.subscriptions
      FOR SELECT USING (user_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'subscriptions' AND policyname = 'subs_own_update'
  ) THEN
    CREATE POLICY "subs_own_update" ON public.subscriptions
      FOR UPDATE USING (user_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'subscriptions' AND policyname = 'subs_admin_all'
  ) THEN
    CREATE POLICY "subs_admin_all" ON public.subscriptions
      FOR ALL USING (public.is_admin());
  END IF;
END $$;

-- invoices: users read their own; admin reads all
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'invoices' AND policyname = 'invoices_own_select'
  ) THEN
    CREATE POLICY "invoices_own_select" ON public.invoices
      FOR SELECT USING (user_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'invoices' AND policyname = 'invoices_admin_all'
  ) THEN
    CREATE POLICY "invoices_admin_all" ON public.invoices
      FOR ALL USING (public.is_admin());
  END IF;
END $$;

-- payments: users read their own; admin reads all
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'payments_own_select'
  ) THEN
    CREATE POLICY "payments_own_select" ON public.payments
      FOR SELECT USING (user_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'payments_admin_all'
  ) THEN
    CREATE POLICY "payments_admin_all" ON public.payments
      FOR ALL USING (public.is_admin());
  END IF;
END $$;

-- ─── Seed default plans ───────────────────────────────────────────────────────
-- One-time activation fee + monthly subscription per paid role.
-- Amounts in XAF (whole units). Idempotent via ON CONFLICT DO NOTHING on role+billing_type.
-- We use a composite unique index to prevent duplicates on re-run.
CREATE UNIQUE INDEX IF NOT EXISTS idx_plans_role_billing
  ON public.subscription_plans(role, billing_type);

INSERT INTO public.subscription_plans (role, name, billing_type, amount, currency, features) VALUES
  -- seller
  ('seller',           'Seller Activation',         'one_time', 30000,  'XAF', '["List properties for sale","Receive buyer inquiries","Escrow access"]'),
  ('seller',           'Seller Monthly',             'monthly',  10000,  'XAF', '["All activation features","Priority listing placement"]'),
  ('seller',           'Seller Annual',              'annual',   100000, 'XAF', '["All monthly features","2 months free","Featured badge"]'),
  -- agent
  ('agent',            'Agent Activation',           'one_time', 50000,  'XAF', '["Create property listings","Earn commissions","Public profile"]'),
  ('agent',            'Agent Monthly',              'monthly',  20000,  'XAF', '["All activation features","Lead generation"]'),
  ('agent',            'Agent Annual',               'annual',   200000, 'XAF', '["All monthly features","2 months free","Premium badge"]'),
  -- developer
  ('developer',        'Developer Activation',       'one_time', 75000,  'XAF', '["List multiple properties","Estate projects","Lead management"]'),
  ('developer',        'Developer Monthly',          'monthly',  30000,  'XAF', '["All activation features","Featured estates"]'),
  ('developer',        'Developer Annual',           'annual',   300000, 'XAF', '["All monthly features","2 months free","Priority placement"]'),
  -- property_manager
  ('property_manager', 'Manager Activation',         'one_time', 40000,  'XAF', '["Manage assigned properties","Client leads","Public profile"]'),
  ('property_manager', 'Manager Monthly',            'monthly',  15000,  'XAF', '["All activation features","Extended lead access"]'),
  ('property_manager', 'Manager Annual',             'annual',   150000, 'XAF', '["All monthly features","2 months free"]'),
  -- vendor
  ('vendor',           'Vendor Activation',          'one_time', 30000,  'XAF', '["Open storefront","List products","Receive orders"]'),
  ('vendor',           'Vendor Monthly',             'monthly',  10000,  'XAF', '["All activation features","Featured products"]'),
  ('vendor',           'Vendor Annual',              'annual',   100000, 'XAF', '["All monthly features","2 months free","Premium placement"]'),
  -- contractor
  ('contractor',       'Contractor Activation',      'one_time', 30000,  'XAF', '["Portfolio","Service requests","Public profile"]'),
  ('contractor',       'Contractor Monthly',         'monthly',  10000,  'XAF', '["All activation features","Priority leads"]'),
  ('contractor',       'Contractor Annual',          'annual',   100000, 'XAF', '["All monthly features","2 months free"]'),
  -- engineer
  ('engineer',         'Engineer Activation',        'one_time', 30000,  'XAF', '["Portfolio","Service requests","Public profile"]'),
  ('engineer',         'Engineer Monthly',           'monthly',  10000,  'XAF', '["All activation features","Priority leads"]'),
  ('engineer',         'Engineer Annual',            'annual',   100000, 'XAF', '["All monthly features","2 months free"]'),
  -- architect
  ('architect',        'Architect Activation',       'one_time', 30000,  'XAF', '["Portfolio","Service requests","Public profile"]'),
  ('architect',        'Architect Monthly',          'monthly',  10000,  'XAF', '["All activation features","Priority leads"]'),
  ('architect',        'Architect Annual',           'annual',   100000, 'XAF', '["All monthly features","2 months free"]'),
  -- lawyer
  ('lawyer',           'Lawyer Activation',          'one_time', 50000,  'XAF', '["Legal consultations","Service requests","Public profile"]'),
  ('lawyer',           'Lawyer Monthly',             'monthly',  20000,  'XAF', '["All activation features","Priority leads"]'),
  ('lawyer',           'Lawyer Annual',              'annual',   200000, 'XAF', '["All monthly features","2 months free"]'),
  -- surveyor
  ('surveyor',         'Surveyor Activation',        'one_time', 30000,  'XAF', '["Valuation services","Portfolio","Public profile"]'),
  ('surveyor',         'Surveyor Monthly',           'monthly',  10000,  'XAF', '["All activation features","Priority leads"]'),
  ('surveyor',         'Surveyor Annual',            'annual',   100000, 'XAF', '["All monthly features","2 months free"]'),
  -- maintenance
  ('maintenance',      'Maintenance Activation',     'one_time', 15000,  'XAF', '["Service requests","Public profile"]'),
  ('maintenance',      'Maintenance Monthly',        'monthly',  5000,   'XAF', '["All activation features","Priority leads"]'),
  ('maintenance',      'Maintenance Annual',         'annual',   50000,  'XAF', '["All monthly features","2 months free"]')
ON CONFLICT (role, billing_type) DO NOTHING;
