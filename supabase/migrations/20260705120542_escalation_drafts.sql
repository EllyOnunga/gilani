-- Add cross-device draft persistence for teacher escalation responses
ALTER TABLE public.escalations
  ADD COLUMN IF NOT EXISTS draft_answer text,
  ADD COLUMN IF NOT EXISTS draft_updated_at timestamptz;
