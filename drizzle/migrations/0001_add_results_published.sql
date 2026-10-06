-- Add results_published column to events table
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS results_published boolean NOT NULL DEFAULT false;
