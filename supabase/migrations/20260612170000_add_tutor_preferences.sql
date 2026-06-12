-- Add tutor preference columns to public.profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tutor_tone TEXT DEFAULT 'encouraging' CHECK (tutor_tone IN ('encouraging', 'scholarly', 'friendly')),
  ADD COLUMN IF NOT EXISTS tutor_style TEXT DEFAULT 'socratic' CHECK (tutor_style IN ('socratic', 'direct', 'rigorous')),
  ADD COLUMN IF NOT EXISTS tutor_depth TEXT DEFAULT 'standard' CHECK (tutor_depth IN ('guided', 'standard', 'rigorous'));

-- Notify psql that migration is executed
COMMENT ON COLUMN public.profiles.tutor_tone IS 'Preferred tone of the Socratic AI tutor';
COMMENT ON COLUMN public.profiles.tutor_style IS 'Preferred teaching/explanation style of the Socratic AI tutor';
COMMENT ON COLUMN public.profiles.tutor_depth IS 'Preferred Socratic scaffolding depth level';
