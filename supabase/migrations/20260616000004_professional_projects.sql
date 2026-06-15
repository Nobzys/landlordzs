-- Migration: Professional Projects (Portfolio)
-- Additive-only. Does not modify existing tables, policies, or buckets.
--
-- Separate from the existing portfolio_items / portfolio_images tables which
-- are attached to professional_profiles. These new tables attach to profiles(id)
-- directly and serve the public professional profile pages.

-- ─── 1. professional_projects ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.professional_projects (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title              TEXT        NOT NULL,
  description        TEXT,
  category           TEXT,
  completion_year    INTEGER,
  location           TEXT,
  client_name        TEXT,
  client_testimonial TEXT,
  is_public          BOOLEAN     NOT NULL DEFAULT true,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

SELECT public.attach_updated_at('professional_projects');

CREATE INDEX IF NOT EXISTS idx_prof_proj_professional
  ON public.professional_projects(professional_id);

CREATE INDEX IF NOT EXISTS idx_prof_proj_public
  ON public.professional_projects(professional_id, is_public)
  WHERE is_public = true;

-- ─── 2. professional_project_images ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.professional_project_images (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID        NOT NULL REFERENCES public.professional_projects(id) ON DELETE CASCADE,
  storage_path  TEXT        NOT NULL,
  display_order INTEGER     NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proj_img_project
  ON public.professional_project_images(project_id, display_order);

-- ─── 3. Storage bucket: professional-projects (PRIVATE) ───────────────────────
-- Private bucket. All images served via server-generated signed URLs.
-- Storage path convention: {user_id}/{project_id}/{uuid}.{ext}

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'professional-projects',
  'professional-projects',
  FALSE,
  26214400,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ─── 4. RLS — professional_projects ──────────────────────────────────────────

ALTER TABLE public.professional_projects       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_project_images ENABLE ROW LEVEL SECURITY;

-- Public users can see public projects; owners see all their own; admins see all.
CREATE POLICY "proj_select"
  ON public.professional_projects
  FOR SELECT
  USING (is_public = true OR professional_id = auth.uid() OR public.is_admin());

CREATE POLICY "proj_insert"
  ON public.professional_projects
  FOR INSERT
  WITH CHECK (professional_id = auth.uid());

CREATE POLICY "proj_update"
  ON public.professional_projects
  FOR UPDATE
  USING (professional_id = auth.uid() OR public.is_admin());

CREATE POLICY "proj_delete"
  ON public.professional_projects
  FOR DELETE
  USING (professional_id = auth.uid() OR public.is_admin());

-- ─── 5. RLS — professional_project_images ────────────────────────────────────

-- Image is readable when the parent project is readable.
CREATE POLICY "proj_img_select"
  ON public.professional_project_images
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.professional_projects p
      WHERE p.id = project_id
        AND (p.is_public = true OR p.professional_id = auth.uid())
    )
    OR public.is_admin()
  );

CREATE POLICY "proj_img_insert"
  ON public.professional_project_images
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.professional_projects p
      WHERE p.id = project_id
        AND p.professional_id = auth.uid()
    )
  );

CREATE POLICY "proj_img_update"
  ON public.professional_project_images
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.professional_projects p
      WHERE p.id = project_id
        AND (p.professional_id = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "proj_img_delete"
  ON public.professional_project_images
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.professional_projects p
      WHERE p.id = project_id
        AND (p.professional_id = auth.uid() OR public.is_admin())
    )
  );

-- ─── 6. Storage policies — professional-projects ──────────────────────────────
-- Uploads go through the /api/upload route which uses the service role (bypasses
-- RLS). These policies guard direct SDK access. Signed-URL reads bypass storage
-- RLS entirely and do not need a SELECT policy.

CREATE POLICY "proj_store_insert"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'professional-projects'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "proj_store_own_select"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'professional-projects'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "proj_store_delete"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'professional-projects'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
    )
  );
