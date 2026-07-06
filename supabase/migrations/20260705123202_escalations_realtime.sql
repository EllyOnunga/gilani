-- Ensure full row data is available on UPDATE/DELETE events (needed for
-- clients to receive old/new values consistently over realtime).
ALTER TABLE public.escalations REPLICA IDENTITY FULL;
