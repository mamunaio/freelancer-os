
-- Auto-rollup client revenue from finance income entries
CREATE OR REPLACE FUNCTION public.recalc_client_revenue(_client_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _client_id IS NULL THEN RETURN; END IF;
  UPDATE public.clients
  SET total_revenue = COALESCE((
    SELECT SUM(amount) FROM public.finance_entries
    WHERE client_id = _client_id AND kind = 'income'
  ), 0)
  WHERE id = _client_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.finance_entries_revenue_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.recalc_client_revenue(NEW.client_id);
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.recalc_client_revenue(NEW.client_id);
    IF OLD.client_id IS DISTINCT FROM NEW.client_id THEN
      PERFORM public.recalc_client_revenue(OLD.client_id);
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.recalc_client_revenue(OLD.client_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS finance_entries_revenue_rollup ON public.finance_entries;
CREATE TRIGGER finance_entries_revenue_rollup
AFTER INSERT OR UPDATE OR DELETE ON public.finance_entries
FOR EACH ROW EXECUTE FUNCTION public.finance_entries_revenue_trigger();

-- Function to compute project actual revenue (callable from queries via RPC)
CREATE OR REPLACE FUNCTION public.project_actual_revenue(_project_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(amount), 0)
  FROM public.finance_entries
  WHERE project_id = _project_id AND kind = 'income';
$$;

-- Backfill existing data
DO $$
DECLARE c_id uuid;
BEGIN
  FOR c_id IN SELECT id FROM public.clients LOOP
    PERFORM public.recalc_client_revenue(c_id);
  END LOOP;
END $$;
