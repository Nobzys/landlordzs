-- Migration: 0010 — Community Forum

CREATE TABLE public.forum_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id   UUID REFERENCES public.forum_categories(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  name_fr     TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT,
  icon        TEXT,
  color       TEXT,
  sort_order  INT NOT NULL DEFAULT 0,
  post_count  INT NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_forum_cat_parent ON public.forum_categories(parent_id);

CREATE TABLE public.forum_posts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id   UUID NOT NULL REFERENCES public.forum_categories(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  content       TEXT NOT NULL,
  content_html  TEXT,
  status        public.post_status NOT NULL DEFAULT 'active',
  is_pinned     BOOLEAN NOT NULL DEFAULT FALSE,
  is_closed     BOOLEAN NOT NULL DEFAULT FALSE,
  is_featured   BOOLEAN NOT NULL DEFAULT FALSE,
  view_count    INT NOT NULL DEFAULT 0,
  reply_count   INT NOT NULL DEFAULT 0,
  like_count    INT NOT NULL DEFAULT 0,
  last_reply_at TIMESTAMPTZ,
  last_reply_by UUID REFERENCES public.profiles(id),
  search_vector TSVECTOR,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SELECT public.attach_updated_at('forum_posts');
CREATE INDEX idx_forum_posts_author   ON public.forum_posts(author_id);
CREATE INDEX idx_forum_posts_category ON public.forum_posts(category_id);
CREATE INDEX idx_forum_posts_status   ON public.forum_posts(status);
CREATE INDEX idx_forum_posts_pinned   ON public.forum_posts(is_pinned) WHERE is_pinned;
CREATE INDEX idx_forum_posts_search   ON public.forum_posts USING GIN(search_vector);
CREATE INDEX idx_forum_posts_created  ON public.forum_posts(created_at DESC);

CREATE TABLE public.forum_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  author_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_id   UUID REFERENCES public.forum_comments(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  is_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  like_count  INT NOT NULL DEFAULT 0,
  is_hidden   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SELECT public.attach_updated_at('forum_comments');
CREATE INDEX idx_forum_comments_post   ON public.forum_comments(post_id);
CREATE INDEX idx_forum_comments_author ON public.forum_comments(author_id);
CREATE INDEX idx_forum_comments_parent ON public.forum_comments(parent_id);

CREATE TABLE public.forum_reactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('post','comment')),
  target_id   UUID NOT NULL,
  reaction    public.reaction_type NOT NULL DEFAULT 'like',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, target_type, target_id)
);
CREATE INDEX idx_forum_reactions_target ON public.forum_reactions(target_type, target_id);
CREATE INDEX idx_forum_reactions_user   ON public.forum_reactions(user_id);
