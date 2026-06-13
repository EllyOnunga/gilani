-- Calculate next midnight in EAT (UTC+3) helper function and update upsert_rate_limit
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
  v_reset TIMESTAMPTZ;
BEGIN
  IF p_key LIKE '%:day' THEN
    -- Calculate next midnight in EAT (UTC+3)
    v_reset := ((now() at time zone 'UTC' at time zone 'Africa/Nairobi' + interval '1 day')::date + time '00:00:00') at time zone 'Africa/Nairobi';
  ELSE
    v_reset := p_reset_at;
  END IF;

  INSERT INTO public.rate_limits (key, count, reset_at)
  VALUES (p_key, 1, v_reset)
  ON CONFLICT (key) DO UPDATE
    SET count    = CASE WHEN rate_limits.reset_at < now() THEN 1
                        ELSE rate_limits.count + 1 END,
        reset_at = CASE WHEN rate_limits.reset_at < now() THEN v_reset
                        ELSE rate_limits.reset_at END
  RETURNING count INTO v_count;

  RETURN v_count <= p_max;
END;
$$;

-- Update existing daily rate limit records to reset at next midnight EAT
UPDATE public.rate_limits
SET reset_at = ((now() at time zone 'UTC' at time zone 'Africa/Nairobi' + interval '1 day')::date + time '00:00:00') at time zone 'Africa/Nairobi'
WHERE key LIKE '%:day';
