-- Add a decrement function to reverse a count when a request fails
create or replace function public.decrement_rate_limit(
  p_key text
) returns void
language plpgsql
security definer
as $$
begin
  update public.rate_limits
  set count = greatest(0, count - 1)
  where key = p_key
    and reset_at > now();
end;
$$;

-- Add a peek function to check limit without incrementing
create or replace function public.peek_rate_limit(
  p_key  text,
  p_max  int
) returns boolean
language plpgsql
security definer
as $$
declare
  v_count int;
begin
  select count into v_count
  from public.rate_limits
  where key = p_key and reset_at > now();

  -- No record means no usage yet
  if not found then return true; end if;

  return v_count < p_max;
end;
$$;
