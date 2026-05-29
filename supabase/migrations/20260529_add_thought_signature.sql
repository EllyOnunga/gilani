-- Add thought_signature column for Gemini 3 multi-turn conversation stability
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS thought_signature TEXT;

-- Add index for faster retrieval when building message history for Gemini 3
CREATE INDEX IF NOT EXISTS idx_messages_thought_signature ON public.messages(thought_signature);