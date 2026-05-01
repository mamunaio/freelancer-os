-- Trigger to keep finance_entries and project status in sync with invoice payments.
-- When an invoice is marked PAID, create a matching income entry.
-- When it moves OUT of paid, remove that entry.
-- When it stays paid but the amount changes, update the entry.

CREATE OR REPLACE FUNCTION public.sync_invoice_to_finance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tag text;
  _project_name text;
  _project_progress integer;
BEGIN
  -- DELETE: clean up any auto-generated finance entry for this invoice
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.finance_entries
    WHERE description LIKE '[invoice:' || OLD.id || ']%';
    RETURN OLD;
  END IF;

  _tag := '[invoice:' || NEW.id || ']';

  -- Status changed away from paid (or from paid to anything else): remove the income entry
  IF TG_OP = 'UPDATE' AND OLD.status = 'paid' AND NEW.status <> 'paid' THEN
    DELETE FROM public.finance_entries
    WHERE description LIKE _tag || '%';
    -- Clear paid_on
    NEW.paid_on := NULL;
  END IF;

  -- Status is paid: ensure a matching income entry exists / is up to date
  IF NEW.status = 'paid' THEN
    -- Set paid_on if not already set
    IF NEW.paid_on IS NULL THEN
      NEW.paid_on := CURRENT_DATE;
    END IF;

    SELECT name, progress INTO _project_name, _project_progress
    FROM public.projects WHERE id = NEW.project_id;

    -- Upsert the auto income entry (matched by tag in description)
    IF EXISTS (SELECT 1 FROM public.finance_entries WHERE description LIKE _tag || '%') THEN
      UPDATE public.finance_entries
      SET amount = NEW.amount,
          client_id = NEW.client_id,
          project_id = NEW.project_id,
          occurred_on = COALESCE(NEW.paid_on, CURRENT_DATE),
          description = _tag || ' ' || NEW.invoice_number ||
                        COALESCE(' — ' || _project_name, '')
      WHERE description LIKE _tag || '%';
    ELSE
      INSERT INTO public.finance_entries
        (kind, category, amount, client_id, project_id, occurred_on, description)
      VALUES
        ('income', 'invoice', NEW.amount, NEW.client_id, NEW.project_id,
         COALESCE(NEW.paid_on, CURRENT_DATE),
         _tag || ' ' || NEW.invoice_number ||
           COALESCE(' — ' || _project_name, ''));
    END IF;

    -- Auto-complete the project if progress is 100%
    IF NEW.project_id IS NOT NULL AND _project_progress >= 100 THEN
      UPDATE public.projects
      SET status = 'completed'
      WHERE id = NEW.project_id AND status <> 'completed';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_invoice_to_finance_trg ON public.invoices;

CREATE TRIGGER sync_invoice_to_finance_trg
BEFORE INSERT OR UPDATE OR DELETE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.sync_invoice_to_finance();
