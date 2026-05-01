-- 1. Pipeline stage enum + column
CREATE TYPE public.pipeline_stage AS ENUM ('lead', 'proposal_sent', 'negotiation', 'active', 'completed');

ALTER TABLE public.clients
  ADD COLUMN pipeline_stage public.pipeline_stage NOT NULL DEFAULT 'lead',
  ADD COLUMN tags text[] NOT NULL DEFAULT '{}';

-- Backfill pipeline_stage from existing client_status
UPDATE public.clients SET pipeline_stage = 'active'    WHERE status = 'active';
UPDATE public.clients SET pipeline_stage = 'completed' WHERE status = 'completed';
UPDATE public.clients SET pipeline_stage = 'lead'      WHERE status = 'lead';

CREATE INDEX idx_clients_pipeline_stage ON public.clients(pipeline_stage);
CREATE INDEX idx_clients_tags ON public.clients USING GIN(tags);

-- 2. Email templates
CREATE TABLE public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage email_templates" ON public.email_templates
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Email log
CREATE TABLE public.email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.email_templates(id) ON DELETE SET NULL,
  to_email text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'sent',
  error text,
  sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage email_log" ON public.email_log
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_email_log_client_id ON public.email_log(client_id);
CREATE INDEX idx_email_log_sent_at ON public.email_log(sent_at DESC);

-- 4. Seed two starter templates
INSERT INTO public.email_templates (name, subject, body) VALUES
  ('Project Kickoff', 'Welcome aboard, {{name}}!',
   E'Hi {{name}},\n\nThrilled to be working with {{company}}. I''ll send over the kickoff brief shortly and book our first call this week.\n\nCheers,'),
  ('Follow-up', 'Quick check-in, {{name}}',
   E'Hi {{name}},\n\nJust circling back on our last conversation. Let me know if there''s anything I can clarify or move forward on.\n\nBest,');