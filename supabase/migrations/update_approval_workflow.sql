-- ============================================================================
-- BTEC Brother — Incremental Migration: Approval Workflow
-- ----------------------------------------------------------------------------
-- Run directly in the live Supabase SQL editor. Adds the sign-up approval
-- workflow on top of an existing database without wiping data:
--   1. New columns on `public.users` (idempotent)
--   2. Updated `handle_new_user` trigger (defaults to unapproved)
--   3. `approve_user` / `reject_user` admin RPCs
-- Assumes the following already exist from the base schema:
--   - public.user_role enum ('admin', 'broker', 'worker')
--   - public.users, public.activity_logs tables
--   - public.is_admin() helper
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Column alterations
-- ---------------------------------------------------------------------------
alter table public.users add column if not exists is_approved boolean not null default false;
alter table public.users add column if not exists requested_role public.user_role not null default 'worker';

-- ---------------------------------------------------------------------------
-- 2. handle_new_user trigger
-- New sign-ups default to unapproved (is_approved = false); only the seeded
-- admin email is auto-approved with the admin role. requested_role is read
-- from user metadata ('worker' | 'broker').
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requested_role public.user_role;
begin
  v_requested_role := case
    when new.raw_user_meta_data ->> 'requested_role' = 'broker' then 'broker'::public.user_role
    else 'worker'::public.user_role
  end;

  insert into public.users (
    id, email, full_name, role, phone_number, is_approved, requested_role
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    case when new.email = 'admin@btechub.app' then 'admin'::public.user_role else 'worker'::public.user_role end,
    nullif(new.raw_user_meta_data ->> 'phone_number', ''),
    (new.email = 'admin@btechub.app'),
    v_requested_role
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
-- 3. RPC: approve_user(p_user_id, p_role)
-- Admin approves a pending sign-up and (optionally) assigns a final role.
-- ---------------------------------------------------------------------------
create or replace function public.approve_user(p_user_id uuid, p_role public.user_role default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id  uuid := auth.uid();
  v_role     public.user_role;
  v_requested public.user_role;
begin
  select role into v_role from public.users where id = v_user_id;

  if v_role is null or v_role <> 'admin' then
    raise exception 'فقط المدير يمكنه اعتماد المستخدمين' using errcode = 'P0001';
  end if;

  select requested_role into v_requested from public.users where id = p_user_id;
  if not found then
    raise exception 'المستخدم غير موجود' using errcode = 'P0001';
  end if;

  update public.users
     set is_approved = true,
         is_active   = true,
         role        = coalesce(p_role, v_requested, 'worker')
   where id = p_user_id;

  insert into public.activity_logs (order_id, actor_id, action, details)
  values (null, v_user_id, 'approve_user', 'تم اعتماد مستخدم جديد');

  return jsonb_build_object('success', true, 'message', 'تم اعتماد المستخدم');
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. RPC: reject_user(p_user_id)
-- Admin rejects a pending sign-up (marks it unapproved and inactive).
-- ---------------------------------------------------------------------------
create or replace function public.reject_user(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_role    public.user_role;
begin
  select role into v_role from public.users where id = v_user_id;

  if v_role is null or v_role <> 'admin' then
    raise exception 'فقط المدير يمكنه رفض المستخدمين' using errcode = 'P0001';
  end if;

  update public.users
     set is_approved = false,
         is_active   = false
   where id = p_user_id;

  insert into public.activity_logs (order_id, actor_id, action, details)
  values (null, v_user_id, 'reject_user', 'تم رفض مستخدم جديد');

  return jsonb_build_object('success', true, 'message', 'تم رفض المستخدم');
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
revoke all on function public.approve_user(uuid, public.user_role) from public;
grant execute on function public.approve_user(uuid, public.user_role) to authenticated, service_role;

revoke all on function public.reject_user(uuid) from public;
grant execute on function public.reject_user(uuid) to authenticated, service_role;
