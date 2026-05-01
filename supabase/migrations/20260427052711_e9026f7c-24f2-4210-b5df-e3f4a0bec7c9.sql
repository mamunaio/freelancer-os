-- Recurring frequency enum
CREATE TYPE public.recurring_frequency AS ENUM ('none', 'monthly', 'yearly');

-- Tax category enum
CREATE TYPE public.tax_category AS ENUM ('software', 'office', 'travel', 'marketing', 'other');

-- Add fields to finance_entries
ALTER TABLE public.finance_entries
  ADD COLUMN recurring public.recurring_frequency NOT NULL DEFAULT 'none',
  ADD COLUMN tax_deductible boolean NOT NULL DEFAULT false,
  ADD COLUMN tax_category public.tax_category;

-- Add tax_rate to workspace_settings (percentage, e.g. 25 = 25%)
ALTER TABLE public.workspace_settings
  ADD COLUMN tax_rate numeric NOT NULL DEFAULT 25;