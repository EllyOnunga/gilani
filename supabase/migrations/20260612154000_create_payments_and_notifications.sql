-- ============ PAYMENTS ============
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  phone_number TEXT NOT NULL,
  amount REAL NOT NULL,
  plan TEXT NOT NULL,
  mpesa_receipt TEXT,
  checkout_request_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'Users view own payments'
  ) THEN
    CREATE POLICY "Users view own payments" ON public.payments
      FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'Users insert own payments'
  ) THEN
    CREATE POLICY "Users insert own payments" ON public.payments
      FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ============ NOTIFICATIONS ============
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('escalation', 'success', 'info', 'warning')),
  read BOOLEAN NOT NULL DEFAULT FALSE,
  link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE, INSERT ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Users view own notifications'
  ) THEN
    CREATE POLICY "Users view own notifications" ON public.notifications
      FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Users update own notifications'
  ) THEN
    CREATE POLICY "Users update own notifications" ON public.notifications
      FOR UPDATE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Service role manages all notifications'
  ) THEN
    CREATE POLICY "Service role manages all notifications" ON public.notifications
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============ RATE LIMIT FUNCTIONS (idempotent — recreate if missing) ============
-- Backing table
CREATE TABLE IF NOT EXISTS public.rate_limits (
  key       TEXT PRIMARY KEY,
  count     INT  NOT NULL DEFAULT 1,
  reset_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'rate_limits' AND policyname = 'service_role_only'
  ) THEN
    CREATE POLICY "service_role_only" ON public.rate_limits
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Atomic rate-limit upsert (CREATE OR REPLACE is always safe)
CREATE OR REPLACE FUNCTION public.upsert_rate_limit(
  p_key      TEXT,
  p_max      INT,
  p_reset_at TIMESTAMPTZ
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INT;
BEGIN
  INSERT INTO public.rate_limits (key, count, reset_at)
  VALUES (p_key, 1, p_reset_at)
  ON CONFLICT (key) DO UPDATE
    SET count    = CASE WHEN rate_limits.reset_at < now() THEN 1
                        ELSE rate_limits.count + 1 END,
        reset_at = CASE WHEN rate_limits.reset_at < now() THEN p_reset_at
                        ELSE rate_limits.reset_at END
  RETURNING count INTO v_count;

  RETURN v_count <= p_max;
END;
$$;

-- Clean up expired rows (CREATE OR REPLACE is always safe)
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits() RETURNS VOID
LANGUAGE SQL SECURITY DEFINER AS $$
  DELETE FROM public.rate_limits WHERE reset_at < now();
$$;

-- ============ HARDEN RATE LIMIT FUNCTIONS ============
REVOKE EXECUTE ON FUNCTION public.upsert_rate_limit(TEXT, INT, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.upsert_rate_limit(TEXT, INT, TIMESTAMPTZ) TO service_role;

REVOKE EXECUTE ON FUNCTION public.cleanup_rate_limits() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.cleanup_rate_limits() TO service_role;

-- ============ PG_CRON SCHEDULE ============
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule('cleanup-expired-rate-limits', '0 * * * *', 'SELECT public.cleanup_rate_limits()');
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'pg_cron not available or schedule registration failed';
END;
$$;
