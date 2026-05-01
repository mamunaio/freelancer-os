ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_projects_is_pinned ON public.projects(is_pinned) WHERE is_pinned = true;
