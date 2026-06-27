-- Store max in the rate_limits row and re-enforce it on every upsert.
-- This ensures plan downgrades take effect immediately without waiting for reset.

ALTER TABLE public.rate_limits ADD COLUMN IF NOT EXISTS max_count INT NOT NULL DEFAULT 999;

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
  INSERT INTO public.rate_limits (key, count, reset_at, max_count)
  VALUES (p_key, 1, p_reset_at, p_max)
  ON CONFLICT (key) DO UPDATE
    SET count     = CASE WHEN rate_limits.reset_at < now() THEN 1
                         ELSE rate_limits.count + 1 END,
        reset_at  = CASE WHEN rate_limits.reset_at < now() THEN p_reset_at
                         ELSE rate_limits.reset_at END,
        max_count = p_max  -- always update max so plan changes take effect immediately
  RETURNING count INTO v_count;

  RETURN v_count <= p_max;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.upsert_rate_limit(TEXT, INT, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.upsert_rate_limit(TEXT, INT, TIMESTAMPTZ) TO service_role;
