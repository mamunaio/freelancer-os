-- 1. Add portal_token to clients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS portal_token text NOT NULL DEFAULT encode(extensions.gen_random_bytes(18), 'base64');

CREATE UNIQUE INDEX IF NOT EXISTS clients_portal_token_key ON public.clients(portal_token);

-- 2. Add approval columns to project_milestones
ALTER TABLE public.project_milestones
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by_name text,
  ADD COLUMN IF NOT EXISTS approved_by_email text;

-- 3. Deliverable status enum
DO $$ BEGIN
  CREATE TYPE public.deliverable_status AS ENUM ('pending', 'approved', 'revision_requested');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4. Deliverables table
CREATE TABLE IF NOT EXISTS public.deliverables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  file_path text,
  file_name text,
  mime_type text,
  size_bytes bigint NOT NULL DEFAULT 0,
  status public.deliverable_status NOT NULL DEFAULT 'pending',
  approved_at timestamptz,
  approved_by_name text,
  approved_by_email text,
  revision_notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS deliverables_project_id_idx ON public.deliverables(project_id);

ALTER TABLE public.deliverables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage deliverables" ON public.deliverables;
CREATE POLICY "Admins manage deliverables"
  ON public.deliverables
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER deliverables_updated_at
  BEFORE UPDATE ON public.deliverables
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Portal data function
CREATE OR REPLACE FUNCTION public.get_portal_data(_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _client public.clients%ROWTYPE;
  _result jsonb;
BEGIN
  SELECT * INTO _client FROM public.clients WHERE portal_token = _token LIMIT 1;
  IF _client.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid portal link');
  END IF;

  SELECT jsonb_build_object(
    'ok', true,
    'workspace', (
      SELECT jsonb_build_object(
        'name', w.name,
        'tagline', w.tagline,
        'logo_url', w.logo_url,
        'accent_hsl', w.accent_hsl
      )
      FROM public.workspace_settings w
      WHERE w.is_active = true
      LIMIT 1
    ),
    'client', jsonb_build_object(
      'id', _client.id,
      'name', _client.name,
      'company', _client.company,
      'email', _client.email
    ),
    'projects', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', p.id,
        'name', p.name,
        'description', p.description,
        'status', p.status,
        'progress', p.progress,
        'deadline', p.deadline,
        'start_date', p.start_date
      ) ORDER BY p.created_at DESC)
      FROM public.projects p
      WHERE p.client_id = _client.id
    ), '[]'::jsonb),
    'unpaid_invoices', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', i.id,
        'invoice_number', i.invoice_number,
        'amount', i.amount,
        'issue_date', i.issue_date,
        'due_date', i.due_date,
        'status', i.status
      ) ORDER BY i.issue_date DESC)
      FROM public.invoices i
      WHERE i.client_id = _client.id AND i.status IN ('sent', 'overdue')
    ), '[]'::jsonb),
    'milestones', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', m.id,
        'project_id', m.project_id,
        'project_name', p.name,
        'title', m.title,
        'description', m.description,
        'due_date', m.due_date,
        'completed', m.completed,
        'approved_at', m.approved_at,
        'approved_by_name', m.approved_by_name,
        'sort_order', m.sort_order
      ) ORDER BY m.sort_order, m.created_at)
      FROM public.project_milestones m
      JOIN public.projects p ON p.id = m.project_id
      WHERE p.client_id = _client.id
    ), '[]'::jsonb),
    'deliverables', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', d.id,
        'project_id', d.project_id,
        'project_name', p.name,
        'title', d.title,
        'description', d.description,
        'file_name', d.file_name,
        'mime_type', d.mime_type,
        'size_bytes', d.size_bytes,
        'has_file', (d.file_path IS NOT NULL),
        'status', d.status,
        'approved_at', d.approved_at,
        'approved_by_name', d.approved_by_name,
        'revision_notes', d.revision_notes,
        'created_at', d.created_at
      ) ORDER BY d.sort_order, d.created_at DESC)
      FROM public.deliverables d
      JOIN public.projects p ON p.id = d.project_id
      WHERE p.client_id = _client.id
    ), '[]'::jsonb),
    'recent_activity', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', a.id,
        'project_id', a.project_id,
        'project_name', p.name,
        'action', a.action,
        'description', a.description,
        'created_at', a.created_at
      ) ORDER BY a.created_at DESC)
      FROM (
        SELECT pa.* FROM public.project_activity pa
        JOIN public.projects p ON p.id = pa.project_id
        WHERE p.client_id = _client.id
          AND pa.action NOT IN ('invoice_created', 'invoice_status_changed')
        ORDER BY pa.created_at DESC
        LIMIT 15
      ) a
      JOIN public.projects p ON p.id = a.project_id
    ), '[]'::jsonb)
  ) INTO _result;

  RETURN _result;
END;
$$;

-- 6. Signed URL function for deliverable downloads
CREATE OR REPLACE FUNCTION public.get_deliverable_storage_path(_token text, _deliverable_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _client_id uuid;
  _path text;
  _name text;
BEGIN
  SELECT id INTO _client_id FROM public.clients WHERE portal_token = _token LIMIT 1;
  IF _client_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid portal link');
  END IF;

  SELECT d.file_path, d.file_name INTO _path, _name
  FROM public.deliverables d
  JOIN public.projects p ON p.id = d.project_id
  WHERE d.id = _deliverable_id AND p.client_id = _client_id
  LIMIT 1;

  IF _path IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Deliverable not found');
  END IF;

  RETURN jsonb_build_object('ok', true, 'path', _path, 'name', _name);
END;
$$;

-- 7. Approve milestone (client-facing)
CREATE OR REPLACE FUNCTION public.approve_milestone(_token text, _milestone_id uuid, _name text, _email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _client_id uuid;
  _project_id uuid;
  _title text;
BEGIN
  SELECT id INTO _client_id FROM public.clients WHERE portal_token = _token LIMIT 1;
  IF _client_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid portal link');
  END IF;

  SELECT m.project_id, m.title INTO _project_id, _title
  FROM public.project_milestones m
  JOIN public.projects p ON p.id = m.project_id
  WHERE m.id = _milestone_id AND p.client_id = _client_id
  LIMIT 1;

  IF _project_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Milestone not found');
  END IF;

  UPDATE public.project_milestones
    SET approved_at = now(),
        approved_by_name = _name,
        approved_by_email = _email,
        completed = true
    WHERE id = _milestone_id;

  INSERT INTO public.project_activity(project_id, action, description, payload)
  VALUES (_project_id, 'milestone_approved',
    'Milestone "' || _title || '" approved by ' || COALESCE(_name, 'client'),
    jsonb_build_object('milestone_id', _milestone_id, 'name', _name, 'email', _email));

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- 8. Set deliverable status (client-facing)
CREATE OR REPLACE FUNCTION public.set_deliverable_status(
  _token text,
  _deliverable_id uuid,
  _status public.deliverable_status,
  _name text,
  _email text,
  _revision_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _client_id uuid;
  _project_id uuid;
  _title text;
BEGIN
  SELECT id INTO _client_id FROM public.clients WHERE portal_token = _token LIMIT 1;
  IF _client_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid portal link');
  END IF;

  SELECT d.project_id, d.title INTO _project_id, _title
  FROM public.deliverables d
  JOIN public.projects p ON p.id = d.project_id
  WHERE d.id = _deliverable_id AND p.client_id = _client_id
  LIMIT 1;

  IF _project_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Deliverable not found');
  END IF;

  UPDATE public.deliverables
    SET status = _status,
        approved_at = CASE WHEN _status = 'approved' THEN now() ELSE NULL END,
        approved_by_name = _name,
        approved_by_email = _email,
        revision_notes = CASE WHEN _status = 'revision_requested' THEN _revision_notes ELSE NULL END
    WHERE id = _deliverable_id;

  INSERT INTO public.project_activity(project_id, action, description, payload)
  VALUES (_project_id,
    CASE WHEN _status = 'approved' THEN 'deliverable_approved' ELSE 'deliverable_revision_requested' END,
    'Deliverable "' || _title || '" ' ||
      CASE WHEN _status = 'approved' THEN 'approved' ELSE 'revisions requested' END ||
      ' by ' || COALESCE(_name, 'client'),
    jsonb_build_object('deliverable_id', _deliverable_id, 'name', _name, 'email', _email, 'notes', _revision_notes));

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- 9. Allow anon role to call portal functions (they validate the token internally)
GRANT EXECUTE ON FUNCTION public.get_portal_data(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_deliverable_storage_path(text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_milestone(text, uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_deliverable_status(text, uuid, public.deliverable_status, text, text, text) TO anon, authenticated;