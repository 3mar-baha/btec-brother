-- ============================================================================
-- BTEC Brother — Migration: service_role grants + admin promotion
-- ----------------------------------------------------------------------------
-- Run directly in the live Supabase SQL editor. Fixes two things:
--
-- 1. The `service_role` role is missing table-level privileges (it only had
--    function EXECUTE grants), so service-role writes to public.users fail
--    with "permission denied for table users". This blocks Telegram link/unlink
--    and the smart-login duplicate check.
--
-- 2. Promotes omarbaha224@gmail.com to admin (role, is_approved, is_active)
--    and makes the handle_new_user trigger auto-admin that address alongside
--    admin@btechub.app.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Restore Supabase's default role grants on the public schema.
--    RLS remains the security boundary; these grants only restore the baseline
--    that Supabase normally applies so `authenticated`/`service_role` can reach
--    the tables.
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;

grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all functions in schema public to anon, authenticated, service_role;

alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. Promote the requested admin email.
--    Handles both the case where a public.users row already exists and the
--    case where the user signed up before the handle_new_user trigger existed.
-- ---------------------------------------------------------------------------
update public.users
   set role        = 'admin',
       is_approved = true,
       is_active   = true
 where email = 'omarbaha224@gmail.com';

insert into public.users (id, email, full_name, role, is_approved, is_active, requested_role)
select au.id,
       au.email,
       coalesce(au.raw_user_meta_data ->> 'full_name', au.email),
       'admin',
       true,
       true,
       'worker'
from auth.users au
where au.email = 'omarbaha224@gmail.com'
on conflict (id) do update
  set role        = 'admin',
      is_approved = true,
      is_active   = true;

-- ---------------------------------------------------------------------------
-- 3. Update handle_new_user to auto-admin omarbaha224@gmail.com (so any future
--    re-registration keeps admin). Includes the Telegram identity columns from
--    add_telegram_auth.sql.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requested_role public.user_role;
  v_telegram_chat_id bigint;
begin
  v_requested_role := case
    when new.raw_user_meta_data ->> 'requested_role' = 'broker' then 'broker'::public.user_role
    else 'worker'::public.user_role
  end;

  v_telegram_chat_id := nullif(new.raw_user_meta_data ->> 'telegram_chat_id', '')::bigint;

  insert into public.users (
    id, email, full_name, role, phone_number, is_approved, requested_role,
    telegram_chat_id, telegram_username
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    case
      when new.email in ('admin@btechub.app', 'omarbaha224@gmail.com') then 'admin'::public.user_role
      else 'worker'::public.user_role
    end,
    nullif(new.raw_user_meta_data ->> 'phone_number', ''),
    (new.email in ('admin@btechub.app', 'omarbaha224@gmail.com')),
    v_requested_role,
    v_telegram_chat_id,
    nullif(new.raw_user_meta_data ->> 'telegram_username', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
