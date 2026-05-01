-- =========================
-- WORKSPACE SETTINGS
-- =========================
CREATE TABLE public.workspace_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL DEFAULT 'Acme Studio',
  tagline text,
  accent_hsl text NOT NULL DEFAULT '226 100% 65%',
  logo_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Only one active row at a time
CREATE UNIQUE INDEX workspace_settings_single_active
  ON public.workspace_settings (is_active)
  WHERE is_active = true;

ALTER TABLE public.workspace_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage workspace_settings"
  ON public.workspace_settings
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER workspace_settings_updated_at
  BEFORE UPDATE ON public.workspace_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default row
INSERT INTO public.workspace_settings (name, tagline, accent_hsl)
VALUES ('Acme Studio', 'Cinematic productivity for solo founders', '226 100% 65%');

-- =========================
-- STORAGE: workspace-assets
-- =========================
INSERT INTO storage.buckets (id, name, public)
VALUES ('workspace-assets', 'workspace-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Workspace assets public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'workspace-assets');

CREATE POLICY "Admins upload workspace assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'workspace-assets' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update workspace assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'workspace-assets' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete workspace assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'workspace-assets' AND public.has_role(auth.uid(), 'admin'::app_role));

-- =========================
-- NOTIFICATIONS
-- =========================
CREATE TYPE public.notification_type AS ENUM (
  'task_due_soon',
  'project_status_changed',
  'finance_entry_added',
  'system'
);

CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type public.notification_type NOT NULL,
  title text NOT NULL,
  message text,
  link text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX notifications_created_at_idx ON public.notifications (created_at DESC);
CREATE INDEX notifications_unread_idx ON public.notifications (is_read) WHERE is_read = false;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete notifications"
  ON public.notifications FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- System can also insert (triggers run as SECURITY DEFINER so this is mostly for clarity)
CREATE POLICY "Admins insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- =========================
-- TRIGGERS: auto-generate notifications
-- =========================

-- Task due within 24h
CREATE OR REPLACE FUNCTION public.notify_task_due_soon()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  hours_until numeric;
BEGIN
  IF NEW.due_date IS NULL OR NEW.done THEN
    RETURN NEW;
  END IF;

  -- Only fire when due_date is freshly set or shifted into the 24h window
  IF TG_OP = 'UPDATE' AND OLD.due_date IS NOT DISTINCT FROM NEW.due_date AND OLD.done IS NOT DISTINCT FROM NEW.done THEN
    RETURN NEW;
  END IF;

  hours_until := EXTRACT(EPOCH FROM (NEW.due_date::timestamptz - now())) / 3600.0;

  IF hours_until <= 24 AND hours_until >= -1 THEN
    INSERT INTO public.notifications (type, title, message, link, metadata)
    VALUES (
      'task_due_soon',
      'Task due soon',
      NEW.title || ' is due ' ||
        CASE
          WHEN hours_until < 0 THEN 'today'
          WHEN hours_until < 1 THEN 'within the hour'
          ELSE 'in ' || ROUND(hours_until)::text || 'h'
        END,
      '/tasks',
      jsonb_build_object('task_id', NEW.id, 'priority', NEW.priority)
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER tasks_due_soon_notify
  AFTER INSERT OR UPDATE OF due_date, done ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.notify_task_due_soon();

-- Project status change
CREATE OR REPLACE FUNCTION public.notify_project_status_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.notifications (type, title, message, link, metadata)
    VALUES (
      'project_status_changed',
      'Project status updated',
      NEW.name || ' moved to ' || REPLACE(NEW.status::text, '_', ' '),
      '/projects',
      jsonb_build_object('project_id', NEW.id, 'from', OLD.status, 'to', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER projects_status_changed_notify
  AFTER UPDATE OF status ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.notify_project_status_changed();

-- Finance entry added
CREATE OR REPLACE FUNCTION public.notify_finance_entry_added()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (type, title, message, link, metadata)
  VALUES (
    'finance_entry_added',
    CASE WHEN NEW.kind = 'income' THEN 'Income recorded' ELSE 'Expense recorded' END,
    INITCAP(NEW.kind::text) || ' of $' || to_char(NEW.amount, 'FM999,999,990.00') ||
      CASE WHEN NEW.description IS NOT NULL THEN ' — ' || NEW.description ELSE '' END,
    '/finance',
    jsonb_build_object('entry_id', NEW.id, 'kind', NEW.kind, 'amount', NEW.amount)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER finance_entries_added_notify
  AFTER INSERT ON public.finance_entries
  FOR EACH ROW EXECUTE FUNCTION public.notify_finance_entry_added();