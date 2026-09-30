-- Run once through the Supabase SQL editor or migrations before deploying the function.
create schema if not exists ephyra_private;
revoke all on schema ephyra_private from public, anon, authenticated;
create table if not exists ephyra_private.delete_attempts (
  account_id uuid primary key references auth.users(id) on delete cascade,
  window_start timestamptz not null,
  attempts integer not null
);
alter table ephyra_private.delete_attempts enable row level security;
revoke all on ephyra_private.delete_attempts from public, anon, authenticated;
grant usage on schema ephyra_private to service_role;
grant select, insert, update on ephyra_private.delete_attempts to service_role;

create or replace function public.ephyra_allow_delete_attempt(account_id uuid)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare attempt_count integer;
begin
  insert into ephyra_private.delete_attempts as attempt_window (account_id, window_start, attempts)
  values (account_id, now(), 1)
  on conflict on constraint delete_attempts_pkey do update set
    window_start = case when attempt_window.window_start < now() - interval '15 minutes' then now() else attempt_window.window_start end,
    attempts = case when attempt_window.window_start < now() - interval '15 minutes' then 1 else attempt_window.attempts + 1 end
  returning attempts into attempt_count;
  return attempt_count <= 5;
end;
$$;
revoke all on function public.ephyra_allow_delete_attempt(uuid) from public, anon, authenticated;
grant execute on function public.ephyra_allow_delete_attempt(uuid) to service_role;
