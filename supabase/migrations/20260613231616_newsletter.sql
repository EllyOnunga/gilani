-- Newsletter subscribers table
create table if not exists newsletter_subscribers (
  id uuid default gen_random_uuid() primary key,
  email text not null unique,
  name text,
  status text not null default 'active',
  user_id uuid references auth.users(id) on delete set null,
  subscribed_at timestamp with time zone default now(),
  unsubscribed_at timestamp with time zone
);

-- RLS
alter table newsletter_subscribers enable row level security;

do $$ begin
  create policy "Anyone can subscribe"
    on newsletter_subscribers for insert
    with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Users can unsubscribe themselves"
    on newsletter_subscribers for update
    using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Admins can view all subscribers"
    on newsletter_subscribers for select
    using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Admins can delete subscribers"
    on newsletter_subscribers for delete
    using (true);
exception when duplicate_object then null;
end $$;
