-- Atomic rate-limit upsert
-- Returns TRUE if the request is allowed, FALSE if over limit
create or replace function public.upsert_rate_limit(
  p_key      text,
  p_max      int,
  p_reset_at timestamptz
) returns boolean
language plpgsql
security definer
as $$
declare
  v_count int;
begin
  insert into public.rate_limits (key, count, reset_at)
  values (p_key, 1, p_reset_at)
  on conflict (key) do update
    set count    = case when rate_limits.reset_at < now() then 1
                        else rate_limits.count + 1 end,
        reset_at = case when rate_limits.reset_at < now() then p_reset_at
                        else rate_limits.reset_at end
  returning count into v_count;

  return v_count <= p_max;
end;
$$;

-- Backing table
create table if not exists public.rate_limits (
  key       text primary key,
  count     int  not null default 1,
  reset_at  timestamptz not null default now()
);

-- Only service role touches this table
alter table public.rate_limits enable row level security;

create policy "service_role_only" on public.rate_limits
  for all to service_role using (true) with check (true);

-- Clean up expired rows periodically (call from a cron job)
create or replace function public.cleanup_rate_limits() returns void
language sql security definer as $$
  delete from public.rate_limits where reset_at < now();
$$;
