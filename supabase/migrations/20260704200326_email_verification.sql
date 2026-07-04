-- Adds passwordless instant-login verification tracking.
-- email_verified: informational only, does not gate access.
-- email_verify_token: one-time token emailed on first signup; nulled once used.
alter table profiles
  add column if not exists email_verified boolean not null default false,
  add column if not exists email_verify_token text,
  add column if not exists email_verify_sent_at timestamptz;

create unique index if not exists profiles_email_verify_token_idx
  on profiles (email_verify_token)
  where email_verify_token is not null;
