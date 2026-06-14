-- account_notices: admin-authored messages shown to the user (rejection/suspension reasons)
-- Separate from profiles so reasons are not publicly visible; user can only read their own.
CREATE TABLE IF NOT EXISTS public.account_notices (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type       TEXT        NOT NULL CHECK (type IN ('rejection', 'suspension', 'ban')),
  reason     TEXT        NOT NULL,
  created_by UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.account_notices ENABLE ROW LEVEL SECURITY;

-- User can read their own notices; admin can read/write all
CREATE POLICY "notice_own_select"   ON public.account_notices
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "notice_admin_insert" ON public.account_notices
  FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "notice_admin_update" ON public.account_notices
  FOR UPDATE USING (public.is_admin());
CREATE POLICY "notice_admin_delete" ON public.account_notices
  FOR DELETE USING (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_notices_user_type ON public.account_notices(user_id, type, created_at DESC);

-- account_appeals: correction requests / appeals submitted by users
CREATE TABLE IF NOT EXISTS public.account_appeals (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notice_id  UUID        REFERENCES public.account_notices(id) ON DELETE SET NULL,
  message    TEXT        NOT NULL,
  status     TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.account_appeals ENABLE ROW LEVEL SECURITY;

-- User can read and insert their own appeals; admin can read and update all
CREATE POLICY "appeal_own_select"   ON public.account_appeals
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "appeal_own_insert"   ON public.account_appeals
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "appeal_admin_select" ON public.account_appeals
  FOR SELECT USING (public.is_admin());
CREATE POLICY "appeal_admin_update" ON public.account_appeals
  FOR UPDATE USING (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_appeals_user    ON public.account_appeals(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_appeals_notice  ON public.account_appeals(notice_id);
CREATE INDEX IF NOT EXISTS idx_appeals_status  ON public.account_appeals(status);
