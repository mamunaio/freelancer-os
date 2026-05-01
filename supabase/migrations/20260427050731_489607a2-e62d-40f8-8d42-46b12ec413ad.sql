-- 1. start_date on projects
ALTER TABLE public.projects ADD COLUMN start_date date;
UPDATE public.projects SET start_date = created_at::date WHERE start_date IS NULL;

-- 2. project_files
CREATE TABLE public.project_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  storage_path text NOT NULL,
  size_bytes bigint NOT NULL DEFAULT 0,
  mime_type text,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage project_files" ON public.project_files
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_project_files_project ON public.project_files(project_id);

-- 3. project_milestones
CREATE TABLE public.project_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  due_date date,
  completed boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage project_milestones" ON public.project_milestones
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_project_milestones_updated_at BEFORE UPDATE ON public.project_milestones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_project_milestones_project ON public.project_milestones(project_id);

-- 4. project_activity (auto change feed)
CREATE TABLE public.project_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  action text NOT NULL,
  description text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.project_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage project_activity" ON public.project_activity
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_project_activity_project ON public.project_activity(project_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.log_project_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.project_activity(project_id, action, description, payload)
    VALUES (NEW.id, 'created', 'Project created', jsonb_build_object('name', NEW.name));
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.project_activity(project_id, action, description, payload)
      VALUES (NEW.id, 'status_changed',
        'Status: ' || REPLACE(OLD.status::text,'_',' ') || ' → ' || REPLACE(NEW.status::text,'_',' '),
        jsonb_build_object('from', OLD.status, 'to', NEW.status));
    END IF;
    IF OLD.progress IS DISTINCT FROM NEW.progress THEN
      INSERT INTO public.project_activity(project_id, action, description, payload)
      VALUES (NEW.id, 'progress_changed',
        'Progress: ' || OLD.progress || '% → ' || NEW.progress || '%',
        jsonb_build_object('from', OLD.progress, 'to', NEW.progress));
    END IF;
    IF OLD.deadline IS DISTINCT FROM NEW.deadline THEN
      INSERT INTO public.project_activity(project_id, action, description, payload)
      VALUES (NEW.id, 'deadline_changed', 'Deadline updated',
        jsonb_build_object('from', OLD.deadline, 'to', NEW.deadline));
    END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_log_project_change
  AFTER INSERT OR UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.log_project_change();

-- 5. invoices
CREATE TYPE public.invoice_status AS ENUM ('draft','sent','paid','overdue','cancelled');

CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq START 1001;

CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL UNIQUE DEFAULT ('INV-' || nextval('public.invoice_number_seq')::text),
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  tax_rate numeric(5,2) NOT NULL DEFAULT 0,
  status public.invoice_status NOT NULL DEFAULT 'draft',
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  paid_on date,
  notes text,
  payment_instructions text,
  line_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage invoices" ON public.invoices
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_invoices_project ON public.invoices(project_id);
CREATE INDEX idx_invoices_client ON public.invoices(client_id);

CREATE OR REPLACE FUNCTION public.log_invoice_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.project_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.project_activity(project_id, action, description, payload)
    VALUES (NEW.project_id, 'invoice_created',
      'Invoice ' || NEW.invoice_number || ' created ($' || to_char(NEW.amount,'FM999,999,990.00') || ')',
      jsonb_build_object('invoice_id', NEW.id, 'amount', NEW.amount));
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.project_activity(project_id, action, description, payload)
    VALUES (NEW.project_id, 'invoice_status_changed',
      'Invoice ' || NEW.invoice_number || ': ' || OLD.status || ' → ' || NEW.status,
      jsonb_build_object('invoice_id', NEW.id, 'from', OLD.status, 'to', NEW.status));
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_log_invoice_change
  AFTER INSERT OR UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.log_invoice_change();

-- 6. proposals
CREATE TYPE public.proposal_status AS ENUM ('draft','sent','viewed','accepted','rejected','expired');

CREATE TABLE public.proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  title text NOT NULL,
  scope text NOT NULL DEFAULT '',
  price numeric(14,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  status public.proposal_status NOT NULL DEFAULT 'draft',
  share_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(18), 'base64'),
  valid_until date,
  sent_at timestamptz,
  viewed_at timestamptz,
  accepted_at timestamptz,
  accepted_by_name text,
  accepted_by_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

-- Admins manage all proposals
CREATE POLICY "Admins manage proposals" ON public.proposals
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Public read by share_token: handled via security-definer RPC instead of broad policy.
CREATE OR REPLACE FUNCTION public.get_proposal_by_token(_token text)
RETURNS TABLE (
  id uuid, title text, scope text, price numeric, currency text,
  status public.proposal_status, valid_until date, accepted_at timestamptz,
  workspace_name text, workspace_logo_url text,
  client_name text, client_company text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.title, p.scope, p.price, p.currency, p.status, p.valid_until, p.accepted_at,
         w.name, w.logo_url, c.name, c.company
  FROM public.proposals p
  LEFT JOIN public.clients c ON c.id = p.client_id
  LEFT JOIN public.workspace_settings w ON w.is_active = true
  WHERE p.share_token = _token
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_proposal_by_token(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.accept_proposal(_token text, _name text, _email text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _id uuid;
  _project_id uuid;
  _status public.proposal_status;
BEGIN
  SELECT id, project_id, status INTO _id, _project_id, _status
  FROM public.proposals WHERE share_token = _token;

  IF _id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Proposal not found');
  END IF;

  IF _status = 'accepted' THEN
    RETURN jsonb_build_object('ok', true, 'already', true);
  END IF;

  UPDATE public.proposals
    SET status = 'accepted',
        accepted_at = now(),
        accepted_by_name = _name,
        accepted_by_email = _email
    WHERE id = _id;

  IF _project_id IS NOT NULL THEN
    INSERT INTO public.project_activity(project_id, action, description, payload)
    VALUES (_project_id, 'proposal_accepted',
      'Proposal accepted by ' || COALESCE(_name, 'client'),
      jsonb_build_object('proposal_id', _id, 'name', _name, 'email', _email));
  END IF;

  RETURN jsonb_build_object('ok', true);
END; $$;
GRANT EXECUTE ON FUNCTION public.accept_proposal(text, text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.mark_proposal_viewed(_token text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.proposals
    SET viewed_at = COALESCE(viewed_at, now()),
        status = CASE WHEN status = 'sent' THEN 'viewed'::proposal_status ELSE status END
    WHERE share_token = _token AND status IN ('sent','viewed');
END; $$;
GRANT EXECUTE ON FUNCTION public.mark_proposal_viewed(text) TO anon, authenticated;

CREATE TRIGGER update_proposals_updated_at BEFORE UPDATE ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_proposals_client ON public.proposals(client_id);
CREATE INDEX idx_proposals_project ON public.proposals(project_id);
CREATE INDEX idx_proposals_token ON public.proposals(share_token);

CREATE OR REPLACE FUNCTION public.log_proposal_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.project_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.project_activity(project_id, action, description, payload)
    VALUES (NEW.project_id, 'proposal_created', 'Proposal "' || NEW.title || '" drafted',
      jsonb_build_object('proposal_id', NEW.id));
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.project_activity(project_id, action, description, payload)
    VALUES (NEW.project_id, 'proposal_status_changed',
      'Proposal "' || NEW.title || '": ' || OLD.status || ' → ' || NEW.status,
      jsonb_build_object('proposal_id', NEW.id, 'from', OLD.status, 'to', NEW.status));
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_log_proposal_change
  AFTER INSERT OR UPDATE ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION public.log_proposal_change();

-- 7. Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('project-files', 'project-files', false)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins read project-files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'project-files' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins upload project-files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'project-files' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update project-files" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'project-files' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete project-files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'project-files' AND public.has_role(auth.uid(), 'admin'));