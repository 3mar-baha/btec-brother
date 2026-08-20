-- ============================================================================
-- BTEC Hub — Incremental Migration: Telegram Auth & Notifications
-- ----------------------------------------------------------------------------
-- Run directly in the live Supabase SQL editor. Adds Telegram identity columns
-- to `public.users`, updates `handle_new_user` to capture them from auth
-- metadata, and extends `enforce_user_field_protection` to cover them.
-- Assumes the base schema (users table, user_role enum, is_admin(), and the
-- approval-workflow columns/RPCs from update_approval_workflow.sql) already
-- exist.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Column additions (idempotent)
-- ---------------------------------------------------------------------------
alter table public.users add column if not exists telegram_chat_id bigint;
alter table public.users add column if not exists telegram_username text;

-- ---------------------------------------------------------------------------
-- 2. Updated handle_new_user trigger
-- Captures telegram_chat_id / telegram_username from raw_user_meta_data so
-- Telegram OAuth sign-ups populate them automatically.
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
    case when new.email = 'admin@btechub.app' then 'admin'::public.user_role else 'worker'::public.user_role end,
    nullif(new.raw_user_meta_data ->> 'phone_number', ''),
    (new.email = 'admin@btechub.app'),
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

-- ---------------------------------------------------------------------------
-- 3. Updated field-protection trigger
-- Extends the non-admin write guard to also cover the Telegram identity
-- columns (only the service role / auth flow may mutate them).
-- ---------------------------------------------------------------------------
create or replace function public.enforce_user_field_protection()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if not public.is_admin() then
    if new.role is distinct from old.role
       or new.is_approved is distinct from old.is_approved
       or new.requested_role is distinct from old.requested_role
       or new.is_active is distinct from old.is_active
       or new.telegram_chat_id is distinct from old.telegram_chat_id
       or new.telegram_username is distinct from old.telegram_username
    then
      raise exception 'لا تملك صلاحية تعديل بيانات الحساب' using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_user_fields on public.users;
create trigger protect_user_fields
before update on public.users
for each row execute function public.enforce_user_field_protection();
