-- Migration: search_and_discovery
-- Additive only — adds saved_professionals, recently_viewed, search_analytics tables
-- and extra indexes on profiles

-- ─── saved_professionals ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.saved_professionals (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  professional_id UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, professional_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_prof_user   ON public.saved_professionals(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_prof_target ON public.saved_professionals(professional_id);

ALTER TABLE public.saved_professionals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'saved_professionals' AND policyname = 'saved_prof_select_own'
  ) THEN
    CREATE POLICY saved_prof_select_own ON public.saved_professionals
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'saved_professionals' AND policyname = 'saved_prof_insert_own'
  ) THEN
    CREATE POLICY saved_prof_insert_own ON public.saved_professionals
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'saved_professionals' AND policyname = 'saved_prof_delete_own'
  ) THEN
    CREATE POLICY saved_prof_delete_own ON public.saved_professionals
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- ─── recently_viewed ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.recently_viewed (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entity_type TEXT        NOT NULL CHECK (entity_type IN ('property', 'professional')),
  entity_id   UUID        NOT NULL,
  viewed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_recently_viewed_user ON public.recently_viewed(user_id, viewed_at DESC);

ALTER TABLE public.recently_viewed ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'recently_viewed' AND policyname = 'rv_select_own'
  ) THEN
    CREATE POLICY rv_select_own ON public.recently_viewed
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'recently_viewed' AND policyname = 'rv_upsert_own'
  ) THEN
    CREATE POLICY rv_upsert_own ON public.recently_viewed
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ─── search_analytics ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.search_analytics (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  query        TEXT,
  entity_type  TEXT        NOT NULL DEFAULT 'all',
  result_count INT         NOT NULL DEFAULT 0,
  user_id      UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_analytics_query   ON public.search_analytics(query);
CREATE INDEX IF NOT EXISTS idx_search_analytics_created ON public.search_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_analytics_type    ON public.search_analytics(entity_type);

-- No RLS on search_analytics — written by service role only, read by admin only

-- ─── Extra indexes on profiles ────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_profiles_premium   ON public.profiles(is_premium);
CREATE INDEX IF NOT EXISTS idx_profiles_verified  ON public.profiles(is_verified);
CREATE INDEX IF NOT EXISTS idx_profiles_exp       ON public.profiles(years_experience);

-- GIN full-text index on profiles for name / company search
CREATE INDEX IF NOT EXISTS idx_profiles_fts ON public.profiles
  USING GIN (
    to_tsvector(
      'simple',
      coalesce(full_name, '') || ' ' ||
      coalesce(display_name, '') || ' ' ||
      coalesce(company_name, '')
    )
  );
