ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS work_type text,
  ADD COLUMN IF NOT EXISTS estimated_minutes integer,
  ADD COLUMN IF NOT EXISTS energy_level text;

ALTER TABLE public.tasks
  DROP CONSTRAINT IF EXISTS tasks_energy_level_check;

ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_energy_level_check
  CHECK (energy_level IS NULL OR energy_level IN ('high', 'medium', 'low'));