-- Row existence in profiles/user_roles is no longer a reliable signal for
-- "has this user finished onboarding" because handle_new_user() auto-creates
-- both rows synchronously on auth.users insert (before our own onboarding
-- flow runs). This flag is set true only when the user actually submits
-- their chosen display name + role via assignUserRole.
alter table profiles
  add column if not exists onboarding_completed boolean not null default false;
