-- Migration: 0013 — Wallets, Transactions, Escrow & Payouts

-- ─── Wallets ────────────────────────────────────────────────────────────────
CREATE TABLE public.wallets (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  balance    BIGINT NOT NULL DEFAULT 0 CHECK (balance >= 0),
  locked     BIGINT NOT NULL DEFAULT 0 CHECK (locked >= 0),
  currency   public.currency_code NOT NULL DEFAULT 'XAF',
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SELECT public.attach_updated_at('wallets');
CREATE INDEX idx_wallets_user ON public.wallets(user_id);

CREATE TABLE public.wallet_transactions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id      UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES public.profiles(id),
  type           TEXT NOT NULL CHECK (type IN ('credit','debit','lock','unlock')),
  amount         BIGINT NOT NULL CHECK (amount > 0),
  balance_before BIGINT NOT NULL,
  balance_after  BIGINT NOT NULL,
  currency       public.currency_code NOT NULL DEFAULT 'XAF',
  reference_type TEXT,
  reference_id   UUID,
  description    TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_wallet_tx_wallet  ON public.wallet_transactions(wallet_id);
CREATE INDEX idx_wallet_tx_user    ON public.wallet_transactions(user_id);
CREATE INDEX idx_wallet_tx_created ON public.wallet_transactions(created_at DESC);

-- ─── Master transaction log ─────────────────────────────────────────────────
CREATE TABLE public.transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payer_id        UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  payee_id        UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  type            public.transaction_type NOT NULL,
  status          public.payment_status NOT NULL DEFAULT 'pending',
  amount          BIGINT NOT NULL CHECK (amount > 0),
  fee             BIGINT NOT NULL DEFAULT 0,
  net_amount      BIGINT NOT NULL,
  currency        public.currency_code NOT NULL DEFAULT 'XAF',
  provider        public.payment_provider,
  provider_ref    TEXT,
  provider_status TEXT,
  provider_meta   JSONB NOT NULL DEFAULT '{}',
  reference_type  TEXT,
  reference_id    UUID,
  escrow_id       UUID,                        -- FK added after escrow_accounts
  description     TEXT,
  initiated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  failed_at       TIMESTAMPTZ,
  failure_reason  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SELECT public.attach_updated_at('transactions');
CREATE INDEX idx_tx_payer     ON public.transactions(payer_id);
CREATE INDEX idx_tx_payee     ON public.transactions(payee_id);
CREATE INDEX idx_tx_type      ON public.transactions(type);
CREATE INDEX idx_tx_status    ON public.transactions(status);
CREATE INDEX idx_tx_reference ON public.transactions(reference_type, reference_id);
CREATE INDEX idx_tx_provider  ON public.transactions(provider_ref) WHERE provider_ref IS NOT NULL;
CREATE INDEX idx_tx_created   ON public.transactions(created_at DESC);

-- ─── Escrow ─────────────────────────────────────────────────────────────────
CREATE TABLE public.escrow_accounts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_type   TEXT NOT NULL,
  reference_id     UUID NOT NULL,
  payer_id         UUID NOT NULL REFERENCES public.profiles(id),
  payee_id         UUID NOT NULL REFERENCES public.profiles(id),
  amount           BIGINT NOT NULL CHECK (amount > 0),
  currency         public.currency_code NOT NULL DEFAULT 'XAF',
  platform_fee     BIGINT NOT NULL DEFAULT 0,
  platform_fee_pct DECIMAL(5,2) NOT NULL DEFAULT 2.50,
  status           public.escrow_status NOT NULL DEFAULT 'pending',
  funded_at        TIMESTAMPTZ,
  release_date     TIMESTAMPTZ,               -- auto-release after 30 days
  released_at      TIMESTAMPTZ,
  disputed_at      TIMESTAMPTZ,
  resolved_at      TIMESTAMPTZ,
  dispute_reason   TEXT,
  resolution_notes TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SELECT public.attach_updated_at('escrow_accounts');
CREATE INDEX idx_escrow_payer     ON public.escrow_accounts(payer_id);
CREATE INDEX idx_escrow_payee     ON public.escrow_accounts(payee_id);
CREATE INDEX idx_escrow_status    ON public.escrow_accounts(status);
CREATE INDEX idx_escrow_release   ON public.escrow_accounts(release_date) WHERE status = 'funded';
CREATE INDEX idx_escrow_reference ON public.escrow_accounts(reference_type, reference_id);

-- Forward FK now that escrow_accounts exists
ALTER TABLE public.transactions
  ADD CONSTRAINT fk_transactions_escrow
  FOREIGN KEY (escrow_id) REFERENCES public.escrow_accounts(id) ON DELETE SET NULL;
CREATE INDEX idx_tx_escrow ON public.transactions(escrow_id) WHERE escrow_id IS NOT NULL;

CREATE TABLE public.escrow_milestones (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escrow_id     UUID NOT NULL REFERENCES public.escrow_accounts(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT,
  amount        BIGINT NOT NULL CHECK (amount > 0),
  percentage    DECIMAL(5,2),
  status        public.milestone_status NOT NULL DEFAULT 'pending',
  due_date      DATE,
  completed_at  TIMESTAMPTZ,
  approved_at   TIMESTAMPTZ,
  disputed_at   TIMESTAMPTZ,
  evidence_urls TEXT[] NOT NULL DEFAULT '{}',
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SELECT public.attach_updated_at('escrow_milestones');
CREATE INDEX idx_escrow_milestones_escrow  ON public.escrow_milestones(escrow_id);
CREATE INDEX idx_escrow_milestones_status  ON public.escrow_milestones(status);

CREATE TABLE public.escrow_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escrow_id   UUID NOT NULL REFERENCES public.escrow_accounts(id) ON DELETE CASCADE,
  actor_id    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type  TEXT NOT NULL,
  description TEXT,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_escrow_events_escrow  ON public.escrow_events(escrow_id);
CREATE INDEX idx_escrow_events_created ON public.escrow_events(created_at DESC);

-- ─── Payouts ─────────────────────────────────────────────────────────────────
CREATE TABLE public.payouts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount          BIGINT NOT NULL CHECK (amount > 0),
  fee             BIGINT NOT NULL DEFAULT 0,
  net_amount      BIGINT NOT NULL,
  currency        public.currency_code NOT NULL DEFAULT 'XAF',
  provider        public.payment_provider NOT NULL,
  account_details JSONB NOT NULL DEFAULT '{}',  -- Encrypted phone/account
  status          public.payment_status NOT NULL DEFAULT 'pending',
  provider_ref    TEXT,
  initiated_at    TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  failed_at       TIMESTAMPTZ,
  failure_reason  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SELECT public.attach_updated_at('payouts');
CREATE INDEX idx_payouts_recipient ON public.payouts(recipient_id);
CREATE INDEX idx_payouts_status    ON public.payouts(status);

-- ─── Commission tracking ─────────────────────────────────────────────────────
CREATE TABLE public.commission_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id  UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  earner_id       UUID NOT NULL REFERENCES public.profiles(id),
  commission_type TEXT NOT NULL CHECK (commission_type IN ('agent','platform','referral')),
  reference_type  TEXT NOT NULL,
  reference_id    UUID NOT NULL,
  amount          BIGINT NOT NULL,
  rate_pct        DECIMAL(5,2) NOT NULL,
  currency        public.currency_code NOT NULL DEFAULT 'XAF',
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','cancelled')),
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_commission_earner      ON public.commission_records(earner_id);
CREATE INDEX idx_commission_transaction ON public.commission_records(transaction_id);
CREATE INDEX idx_commission_status      ON public.commission_records(status);
