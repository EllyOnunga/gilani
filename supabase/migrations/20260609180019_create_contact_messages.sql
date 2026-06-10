create table if not exists public.contact_messages (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  subject     text,
  category    text not null default 'general',
  message     text not null,
  status      text not null default 'unread' check (status in ('unread', 'read', 'resolved')),
  created_at  timestamptz not null default now()
);

create index if not exists contact_messages_status_idx on public.contact_messages(status);
create index if not exists contact_messages_created_at_idx on public.contact_messages(created_at desc);

alter table public.contact_messages enable row level security;

create policy "service_role_only"
  on public.contact_messages
  for all
  to service_role
  using (true)
  with check (true);

create policy "public_insert"
  on public.contact_messages
  for insert
  to anon, authenticated
  with check (true);
