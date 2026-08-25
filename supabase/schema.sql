-- ============================================================================
-- BTEC Brother — Database Schema & Policies
-- ----------------------------------------------------------------------------
-- `users` and `orders` follow docs/05-DATA-MODEL.md exactly. The remaining
-- tables (specialisations, grade_levels, criteria_levels, order_attachments,
-- daily_updates, activity_logs, reviews, payouts) are only named in the ER
-- overview / API spec, so their columns were designed to match those docs and
-- the workflows in docs/02-PRODUCT-SPECIFICATION.md. Review before production.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.user_role as enum ('admin', 'broker', 'worker');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.order_status as enum ('open', 'in_progress', 'submitted', 'revision', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payout_status as enum ('pending', 'settled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.share_type as enum ('worker', 'broker');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- users: linked to Supabase Auth (auth.users). Populated by trigger.
create table if not exists public.users (
  id             uuid primary key references auth.users (id) on delete cascade,
  email          text unique not null,
  full_name      text not null,
  role           public.user_role not null default 'worker',
  phone_number   text,
  avatar_url     text,
  is_active      boolean not null default true,
  is_approved    boolean not null default false,
  requested_role public.user_role not null default 'worker',
  created_at     timestamptz not null default now()
);

-- Approval-workflow columns (idempotent for pre-existing databases).
alter table public.users add column if not exists is_approved boolean not null default false;
alter table public.users add column if not exists requested_role public.user_role not null default 'worker';

-- ---------------------------------------------------------------------------
-- Helper: is_admin()
-- SECURITY DEFINER so it can read the users table without RLS recursion.
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.users where id = auth.uid() and role = 'admin'
  );
$$;

create table if not exists public.specialisations (
  id         serial primary key,
  name       text not null unique,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.grade_levels (
  id         serial primary key,
  name       text not null unique,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.criteria_levels (
  id         serial primary key,
  code       text not null unique, -- 'P' | 'M' | 'D'
  name       text not null,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id                uuid primary key default gen_random_uuid(),
  order_number      serial unique,
  broker_id         uuid not null references public.users (id),
  worker_id         uuid references public.users (id),
  title             text not null,
  client_name       text not null,  -- hidden from workers (see RLS note)
  client_phone      text not null,  -- hidden from workers (see RLS note)
  client_school     text,           -- optional; hidden from workers like other client fields
  specialisation_id int not null references public.specialisations (id),
  grade_id          int not null references public.grade_levels (id),
  criteria_id       int not null references public.criteria_levels (id),
  unit_title        text not null,
  assignment_name   text not null,
  total_price       numeric(10,2) not null check (total_price >= 0),
  worker_share      numeric(10,2) generated always as (total_price * 0.80) stored,
  broker_share      numeric(10,2) generated always as (total_price * 0.20) stored,
  deadline          timestamptz not null,
  status            public.order_status not null default 'open',
  completed_at      timestamptz,
  submission_url    text,
  plagiarism_rate   numeric(5,2),
  ai_percentage     numeric(5,2),
  revision_notes    text,
  reminder_sent_24h timestamptz,  -- set by /api/cron/reminders to dedupe notices
  reminder_sent_6h  timestamptz,
  created_at        timestamptz not null default now()
);

-- Internal CRM notes per client, keyed by normalized phone digits.
create table if not exists public.client_notes (
  id            uuid primary key default gen_random_uuid(),
  client_phone  text not null,
  author_id     uuid not null references public.users(id) on delete cascade,
  content       text not null,
  created_at    timestamptz default now()
);

create index if not exists idx_client_notes_phone on public.client_notes(client_phone);

create table if not exists public.order_attachments (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders (id) on delete cascade,
  file_name  text not null,
  file_url   text not null,
  comment    text,
  created_at timestamptz not null default now()
);

create table if not exists public.daily_updates (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders (id) on delete cascade,
  author_id  uuid not null references public.users (id) default auth.uid(),
  note       text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid references public.orders (id) on delete cascade,
  actor_id   uuid not null references public.users (id),
  action     text not null,          -- 'claim' | 'drop' | 'submit' | 'approve' | ...
  details    text,
  created_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders (id) on delete cascade,
  reviewer_id uuid not null references public.users (id),
  rating      int check (rating >= 1 and rating <= 5),
  comment     text,
  created_at  timestamptz not null default now()
);

create table if not exists public.payouts (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders (id) on delete cascade,
  user_id    uuid not null references public.users (id),
  amount     numeric(10,2) not null check (amount >= 0),
  share_type public.share_type not null,
  status     public.payout_status not null default 'pending',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Trigger: enforce single active (in_progress) task per worker
-- ---------------------------------------------------------------------------
create or replace function public.check_worker_active_task_limit()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'in_progress' and (old.status is null or old.status = 'open') then
    if exists (
      select 1
      from public.orders
      where worker_id = new.worker_id
        and status = 'in_progress'
        and id <> new.id
    ) then
      raise exception 'العامل لديه مهمة نشطة بالفعل ولا يمكنه استلام مهمة جديدة';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_single_active_task on public.orders;
create trigger enforce_single_active_task
before update on public.orders
for each row
when (new.status = 'in_progress')
execute function public.check_worker_active_task_limit();

-- ---------------------------------------------------------------------------
-- Trigger: create a public.users row on auth sign-up.
-- Every sign-up is an unapproved worker/broker request. Admins are
-- provisioned explicitly after signup:
--   update public.users set role = 'admin', is_approved = true
--   where email = '<your-email>';
-- requested_role is read from user metadata ('worker' | 'broker').
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
    'worker'::public.user_role,
    nullif(new.raw_user_meta_data ->> 'phone_number', ''),
    false,
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
-- Trigger: protect sensitive user fields (role / is_approved /
-- requested_role / is_active) from being modified by non-admins. Row-level
-- policies cannot express column-level rules, so a trigger enforces this.
-- Direct/system context (no authenticated session, e.g. seed/migrations) is
-- allowed through.
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

-- ---------------------------------------------------------------------------
-- RPC: claim_order(p_order_id)
-- Worker claims an open order. Optimistic lock: single conditional UPDATE.
-- ---------------------------------------------------------------------------
create or replace function public.claim_order(p_order_id uuid)
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

  if v_role is null then
    raise exception 'حسابك غير مسجل في المنصة' using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from public.users
    where id = v_user_id and is_approved and is_active
  ) then
    raise exception 'حسابك غير مُعتمد أو موقوف حالياً' using errcode = 'P0001';
  end if;

  if v_role <> 'worker' then
    raise exception 'فقط العمال يمكنهم حجز المهام من السوق' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.orders where worker_id = v_user_id and status = 'in_progress'
  ) then
    raise exception 'لديك مهمة نشطة حالياً ولا يمكنك حجز مهمة جديدة' using errcode = 'P0001';
  end if;

  update public.orders
     set worker_id = v_user_id,
         status    = 'in_progress'
   where id = p_order_id
     and status = 'open'
     and worker_id is null;

  if not found then
    raise exception 'تم حجز هذه المهمة مسبقاً من قِبل عامل آخر' using errcode = 'P0001';
  end if;

  insert into public.activity_logs (order_id, actor_id, action, details)
  values (p_order_id, v_user_id, 'claim', 'قام العامل بحجز المهمة');

  return jsonb_build_object(
    'success',  true,
    'message',  'تم حجز المهمة بنجاح',
    'order_id', p_order_id::text,
    'status',   'in_progress'
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: drop_order(p_order_id, p_reason)
-- Worker drops their own task (or admin force-reassigns). Returns to 'open'.
-- ---------------------------------------------------------------------------
create or replace function public.drop_order(p_order_id uuid, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id   uuid := auth.uid();
  v_role      public.user_role;
  v_worker_id uuid;
begin
  select role into v_role from public.users where id = v_user_id;

  if v_role is null then
    raise exception 'حسابك غير مسجل في المنصة' using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from public.users
    where id = v_user_id and is_approved and is_active
  ) then
    raise exception 'حسابك غير مُعتمد أو موقوف حالياً' using errcode = 'P0001';
  end if;

  select worker_id into v_worker_id from public.orders where id = p_order_id;

  if v_worker_id is null then
    raise exception 'الطلب غير محجوز حالياً' using errcode = 'P0001';
  end if;

  if v_role <> 'admin' and v_worker_id <> v_user_id then
    raise exception 'لا تملك صلاحية التنازل عن هذه المهمة' using errcode = 'P0001';
  end if;

  update public.orders
     set worker_id = null,
         status    = 'open'
   where id = p_order_id;

  insert into public.activity_logs (order_id, actor_id, action, details)
  values (p_order_id, v_user_id, 'drop', p_reason);

  return jsonb_build_object(
    'success',  true,
    'message',  'تم التنازل عن المهمة وإعادتها إلى السوق',
    'order_id', p_order_id::text,
    'status',   'open'
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: submit_order_solution(p_order_id, p_submission_url, p_plagiarism_rate, p_ai_percentage)
-- Worker submits (or re-submits after revision) their solution.
-- 'in_progress' | 'revision' → 'submitted'.
-- ---------------------------------------------------------------------------
create or replace function public.submit_order_solution(
  p_order_id uuid,
  p_submission_url text,
  p_plagiarism_rate numeric default null,
  p_ai_percentage numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id   uuid := auth.uid();
  v_worker_id uuid;
  v_status    public.order_status;
begin
  if not exists (
    select 1 from public.users
    where id = v_user_id and is_approved and is_active
  ) then
    raise exception 'حسابك غير مُعتمد أو موقوف حالياً' using errcode = 'P0001';
  end if;

  select worker_id, status into v_worker_id, v_status
  from public.orders where id = p_order_id;

  if v_worker_id is null then
    raise exception 'هذه المهمة غير محجوزة' using errcode = 'P0001';
  end if;

  if v_worker_id <> v_user_id then
    raise exception 'لست مكلفاً بهذه المهمة' using errcode = 'P0001';
  end if;

  if v_status not in ('in_progress', 'revision') then
    raise exception 'لا يمكن تسليم الحل في الحالة الحالية' using errcode = 'P0001';
  end if;

  if p_submission_url is null or trim(p_submission_url) = '' then
    raise exception 'يرجى إدخال رابط الحل' using errcode = 'P0001';
  end if;

  update public.orders
     set status          = 'submitted',
         submission_url  = p_submission_url,
         plagiarism_rate = p_plagiarism_rate,
         ai_percentage   = p_ai_percentage,
         revision_notes  = null
   where id = p_order_id;

  insert into public.activity_logs (order_id, actor_id, action, details)
  values (p_order_id, v_user_id, 'submit', 'قام العامل بتسليم الحل');

  return jsonb_build_object(
    'success',  true,
    'message',  'تم تسليم الحل بنجاح',
    'order_id', p_order_id::text,
    'status',   'submitted'
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: request_revision(p_order_id, p_revision_notes)
-- Broker requests changes. 'submitted' → 'revision'.
-- ---------------------------------------------------------------------------
create or replace function public.request_revision(
  p_order_id uuid,
  p_revision_notes text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id   uuid := auth.uid();
  v_role      public.user_role;
  v_broker_id uuid;
  v_status    public.order_status;
begin
  select role into v_role from public.users where id = v_user_id;

  if v_role is null then
    raise exception 'حسابك غير مسجل في المنصة' using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from public.users
    where id = v_user_id and is_approved and is_active
  ) then
    raise exception 'حسابك غير مُعتمد أو موقوف حالياً' using errcode = 'P0001';
  end if;

  select broker_id, status into v_broker_id, v_status
  from public.orders where id = p_order_id;

  if v_role <> 'admin' and v_broker_id <> v_user_id then
    raise exception 'لا تملك صلاحية طلب التعديل على هذه المهمة' using errcode = 'P0001';
  end if;

  if v_status <> 'submitted' then
    raise exception 'لا يمكن طلب التعديل في الحالة الحالية' using errcode = 'P0001';
  end if;

  if p_revision_notes is null or trim(p_revision_notes) = '' then
    raise exception 'يرجى كتابة ملاحظات التعديل' using errcode = 'P0001';
  end if;

  update public.orders
     set status         = 'revision',
         revision_notes = p_revision_notes
   where id = p_order_id;

  insert into public.activity_logs (order_id, actor_id, action, details)
  values (p_order_id, v_user_id, 'revision', p_revision_notes);

  return jsonb_build_object(
    'success',  true,
    'message',  'تم طلب التعديل',
    'order_id', p_order_id::text,
    'status',   'revision'
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: approve_and_complete_order(p_order_id)
-- Broker approves. 'submitted' → 'completed' + creates pending 80/20 payouts.
-- ---------------------------------------------------------------------------
create or replace function public.approve_and_complete_order(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id   uuid := auth.uid();
  v_role      public.user_role;
  v_broker_id uuid;
  v_worker_id uuid;
  v_status    public.order_status;
  v_total     numeric;
begin
  select role into v_role from public.users where id = v_user_id;

  if v_role is null then
    raise exception 'حسابك غير مسجل في المنصة' using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from public.users
    where id = v_user_id and is_approved and is_active
  ) then
    raise exception 'حسابك غير مُعتمد أو موقوف حالياً' using errcode = 'P0001';
  end if;

  select broker_id, worker_id, status, total_price
    into v_broker_id, v_worker_id, v_status, v_total
  from public.orders where id = p_order_id for update;

  if v_role <> 'admin' and v_broker_id <> v_user_id then
    raise exception 'لا تملك صلاحية اعتماد هذه المهمة' using errcode = 'P0001';
  end if;

  if v_status <> 'submitted' then
    raise exception 'لا يمكن الاعتماد في الحالة الحالية' using errcode = 'P0001';
  end if;

  if v_worker_id is null then
    raise exception 'لا يوجد عامل مكلف بهذه المهمة' using errcode = 'P0001';
  end if;

  update public.orders
     set status       = 'completed',
         completed_at = now()
   where id = p_order_id;

  insert into public.payouts (order_id, user_id, amount, share_type, status)
  values
    (p_order_id, v_worker_id, v_total * 0.80, 'worker', 'pending'),
    (p_order_id, v_broker_id, v_total * 0.20, 'broker', 'pending');

  insert into public.activity_logs (order_id, actor_id, action, details)
  values (p_order_id, v_user_id, 'approve', 'تم اعتماد المهمة وإنشاء مستحقات الدفع');

  return jsonb_build_object(
    'success',  true,
    'message',  'تم اعتماد المهمة واكتمالها',
    'order_id', p_order_id::text,
    'status',   'completed'
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: settle_payout(p_user_id, p_note)
-- Admin settles all pending payouts for a member and logs the event.
-- ---------------------------------------------------------------------------
create or replace function public.settle_payout(p_user_id uuid, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_role    public.user_role;
  v_count   int;
  v_total   numeric;
begin
  select role into v_role from public.users where id = v_user_id;

  if v_role is null then
    raise exception 'حسابك غير مسجل في المنصة' using errcode = 'P0001';
  end if;

  if v_role <> 'admin' then
    raise exception 'فقط المدير يمكنه تسوية المدفوعات' using errcode = 'P0001';
  end if;

  -- Lock the pending rows first: FOR UPDATE cannot sit on an aggregate query.
  perform 1
    from public.payouts
   where user_id = p_user_id and status = 'pending'
     for update;

  select count(*), coalesce(sum(amount), 0)
    into v_count, v_total
  from public.payouts
  where user_id = p_user_id and status = 'pending';

  update public.payouts
     set status = 'settled'
   where user_id = p_user_id and status = 'pending';

  insert into public.activity_logs (order_id, actor_id, action, details)
  values (null, v_user_id, 'settle', coalesce(p_note, 'تسوية مستحقات مالية'));

  return jsonb_build_object(
    'success',        true,
    'message',        'تمت تسوية المستحقات',
    'settled_count',  v_count,
    'settled_amount', v_total
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: approve_user(p_user_id, p_role)
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
-- RPC: reject_user(p_user_id)
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
-- RPC: directory_stats()
-- Aggregated team stats for the directory. SECURITY DEFINER so any
-- authenticated member can read cross-team aggregates despite row-level RLS.
-- ---------------------------------------------------------------------------
create or replace function public.directory_stats()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'members', (
      select coalesce(jsonb_agg(m), '[]'::jsonb)
      from (
        select jsonb_build_object(
          'id',         u.id,
          'full_name',  u.full_name,
          'avatar_url', u.avatar_url,
          'role',       u.role,
          'is_active',  u.is_active,
          'completed',  (select count(*) from public.orders o
                          where o.status = 'completed'
                            and (o.worker_id = u.id or o.broker_id = u.id)),
          'active',     (select count(*) from public.orders o
                          where o.status in ('in_progress', 'submitted', 'revision')
                            and (o.worker_id = u.id or o.broker_id = u.id)),
          'earnings',   coalesce((select sum(p.amount) from public.payouts p
                                   where p.user_id = u.id), 0),
          'avg_days',   coalesce((select round(avg(extract(epoch from (o.completed_at - o.created_at)) / 86400.0)::numeric, 1)
                                   from public.orders o
                                  where o.status = 'completed'
                                    and (o.worker_id = u.id or o.broker_id = u.id)), 0),
          'on_time',    (select count(*) from public.orders o
                          where o.status = 'completed'
                            and o.completed_at is not null
                            and o.completed_at <= o.deadline
                            and (o.worker_id = u.id or o.broker_id = u.id)),
          'precise',    (select count(*) from public.orders o
                          where o.status = 'completed'
                            and o.plagiarism_rate is not null
                            and o.plagiarism_rate <= 15
                            and (o.worker_id = u.id or o.broker_id = u.id)),
          'urgent',     (select count(*) from public.orders o
                          where o.status = 'completed'
                            and extract(epoch from (o.deadline - o.created_at)) < 3 * 86400
                            and (o.worker_id = u.id or o.broker_id = u.id))
        ) as m
        from public.users u
        where u.is_approved = true
          and u.role <> 'admin'
        order by u.full_name
      ) m
    ),
    'matrix', (
      select coalesce(jsonb_agg(m), '[]'::jsonb)
      from (
        select jsonb_build_object(
          'worker_id',   w.id,
          'worker_name', w.full_name,
          'broker_id',   b.id,
          'broker_name', b.full_name,
          'count',       count(o.id)
        ) as m
        from public.orders o
        join public.users w on w.id = o.worker_id
        join public.users b on b.id = o.broker_id
        where o.status = 'completed'
        group by w.id, w.full_name, b.id, b.full_name
        order by count(o.id) desc
      ) m
    )
  );
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

-- users ---------------------------------------------------------------------
alter table public.users enable row level security;

drop policy if exists "users_select_authenticated" on public.users;
create policy "users_select_authenticated" on public.users
  for select using (auth.uid() is not null);

drop policy if exists "users_update_own" on public.users;
create policy "users_update_own" on public.users
  for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "users_admin_all" on public.users;
create policy "users_admin_all" on public.users
  for all using (public.is_admin());

-- classification tables (admin-managed) --------------------------------------
alter table public.specialisations enable row level security;
alter table public.grade_levels enable row level security;
alter table public.criteria_levels enable row level security;

drop policy if exists "specialisations_select" on public.specialisations;
create policy "specialisations_select" on public.specialisations
  for select using (auth.uid() is not null);
drop policy if exists "specialisations_admin_write" on public.specialisations;
create policy "specialisations_admin_write" on public.specialisations
  for all using (public.is_admin());

drop policy if exists "grade_levels_select" on public.grade_levels;
create policy "grade_levels_select" on public.grade_levels
  for select using (auth.uid() is not null);
drop policy if exists "grade_levels_admin_write" on public.grade_levels;
create policy "grade_levels_admin_write" on public.grade_levels
  for all using (public.is_admin());

drop policy if exists "criteria_levels_select" on public.criteria_levels;
create policy "criteria_levels_select" on public.criteria_levels
  for select using (auth.uid() is not null);
drop policy if exists "criteria_levels_admin_write" on public.criteria_levels;
create policy "criteria_levels_admin_write" on public.criteria_levels
  for all using (public.is_admin());

-- orders ---------------------------------------------------------------------
alter table public.orders enable row level security;

-- Open orders are visible to everyone; otherwise only broker/worker/admin.
-- client_name / client_phone / client_school are hidden from workers at the query layer.
drop policy if exists "orders_select" on public.orders;
create policy "orders_select" on public.orders
  for select to authenticated
  using (
    status = 'open'
    or broker_id = auth.uid()
    or worker_id = auth.uid()
    or public.is_admin()
  );

drop policy if exists "orders_insert" on public.orders;
create policy "orders_insert" on public.orders
  for insert with check (broker_id = auth.uid() or public.is_admin());

drop policy if exists "orders_update" on public.orders;
create policy "orders_update" on public.orders
  for update using (
    broker_id = auth.uid() or worker_id = auth.uid() or public.is_admin()
  ) with check (
    broker_id = auth.uid() or worker_id = auth.uid() or public.is_admin()
  );

drop policy if exists "orders_delete" on public.orders;
create policy "orders_delete" on public.orders
  for delete using (public.is_admin());

-- All order mutations must go through the SECURITY DEFINER RPCs; direct
-- table updates from client roles would bypass the workflow state machine.
revoke update on public.orders from anon, authenticated;

-- order_attachments ----------------------------------------------------------
alter table public.order_attachments enable row level security;

drop policy if exists "attachments_select" on public.order_attachments;
create policy "attachments_select" on public.order_attachments
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (o.status = 'open' or o.broker_id = auth.uid() or o.worker_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "attachments_insert" on public.order_attachments;
create policy "attachments_insert" on public.order_attachments
  for insert with check (
    exists (
      select 1 from public.orders o
      where o.id = order_id and (o.broker_id = auth.uid() or public.is_admin())
    )
  );

-- daily_updates --------------------------------------------------------------
alter table public.daily_updates enable row level security;

drop policy if exists "daily_updates_select" on public.daily_updates;
create policy "daily_updates_select" on public.daily_updates
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (o.broker_id = auth.uid() or o.worker_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "daily_updates_insert" on public.daily_updates;
create policy "daily_updates_insert" on public.daily_updates
  for insert with check (
    author_id = auth.uid()
    and exists (select 1 from public.orders o where o.id = order_id and o.worker_id = auth.uid())
  );

-- activity_logs --------------------------------------------------------------
alter table public.activity_logs enable row level security;

drop policy if exists "activity_logs_select" on public.activity_logs;
create policy "activity_logs_select" on public.activity_logs
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.orders o
      where o.id = order_id and (o.broker_id = auth.uid() or o.worker_id = auth.uid())
    )
  );

drop policy if exists "activity_logs_insert" on public.activity_logs;
create policy "activity_logs_insert" on public.activity_logs
  for insert with check (
    actor_id = auth.uid()
    and exists (
      select 1 from public.orders o
      where o.id = order_id and (o.broker_id = auth.uid() or o.worker_id = auth.uid())
    )
  );

-- reviews --------------------------------------------------------------------
alter table public.reviews enable row level security;

drop policy if exists "reviews_select" on public.reviews;
create policy "reviews_select" on public.reviews
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.orders o
      where o.id = order_id and (o.broker_id = auth.uid() or o.worker_id = auth.uid())
    )
  );

drop policy if exists "reviews_insert" on public.reviews;
create policy "reviews_insert" on public.reviews
  for insert with check (
    reviewer_id = auth.uid()
    and exists (
      select 1 from public.orders o
      where o.id = order_id and (o.broker_id = auth.uid() or public.is_admin())
    )
  );

-- payouts --------------------------------------------------------------------
alter table public.payouts enable row level security;

drop policy if exists "payouts_select" on public.payouts;
create policy "payouts_select" on public.payouts
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "payouts_insert" on public.payouts;
create policy "payouts_insert" on public.payouts
  for insert with check (public.is_admin());

drop policy if exists "payouts_update" on public.payouts;
create policy "payouts_update" on public.payouts
  for update using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- RLS: client_notes — staff (admin/broker) only; authors manage their notes
-- ---------------------------------------------------------------------------
drop policy if exists "client_notes_staff_read" on public.client_notes;
create policy "client_notes_staff_read" on public.client_notes
  for select to authenticated
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role in ('admin', 'broker')
    )
  );

drop policy if exists "client_notes_staff_insert" on public.client_notes;
create policy "client_notes_staff_insert" on public.client_notes
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role in ('admin', 'broker')
    )
  );

drop policy if exists "client_notes_staff_delete" on public.client_notes;
create policy "client_notes_staff_delete" on public.client_notes
  for delete to authenticated
  using (
    author_id = auth.uid() or exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  );

-- ---------------------------------------------------------------------------
-- Storage: bucket for order attachments
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('order-attachments', 'order-attachments', true)
on conflict (id) do nothing;

drop policy if exists "attachments_public_read" on storage.objects;
create policy "attachments_public_read" on storage.objects
  for select using (bucket_id = 'order-attachments');

drop policy if exists "attachments_auth_upload" on storage.objects;
create policy "attachments_auth_upload" on storage.objects
  for insert with check (bucket_id = 'order-attachments' and auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

-- Baseline table + sequence access. Supabase's default privileges can miss
-- sequences created via `serial` in the SQL editor, which breaks INSERTs with
-- "permission denied for sequence ...". Grant explicitly so order creation works.
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;

revoke all on function public.claim_order(uuid) from public;
grant execute on function public.claim_order(uuid) to authenticated, service_role;

revoke all on function public.drop_order(uuid, text) from public;
grant execute on function public.drop_order(uuid, text) to authenticated, service_role;

revoke all on function public.submit_order_solution(uuid, text, numeric, numeric) from public;
grant execute on function public.submit_order_solution(uuid, text, numeric, numeric) to authenticated, service_role;

revoke all on function public.request_revision(uuid, text) from public;
grant execute on function public.request_revision(uuid, text) to authenticated, service_role;

revoke all on function public.approve_and_complete_order(uuid) from public;
grant execute on function public.approve_and_complete_order(uuid) to authenticated, service_role;

revoke all on function public.settle_payout(uuid, text) from public;
grant execute on function public.settle_payout(uuid, text) to authenticated, service_role;

revoke all on function public.directory_stats() from public;
grant execute on function public.directory_stats() to authenticated, service_role;

revoke all on function public.approve_user(uuid, public.user_role) from public;
grant execute on function public.approve_user(uuid, public.user_role) to authenticated, service_role;

revoke all on function public.reject_user(uuid) from public;
grant execute on function public.reject_user(uuid) to authenticated, service_role;

-- RPC: update_open_order — edit an order while still unclaimed (owner broker/admin)
create or replace function public.update_open_order(
  p_order_id uuid,
  p_client_name text,
  p_client_phone text,
  p_client_school text,
  p_title text,
  p_unit_title text,
  p_assignment_name text,
  p_total_price numeric,
  p_deadline timestamptz
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_role    public.user_role;
  v_broker  uuid;
  v_status  public.order_status;
begin
  if v_user_id is null then
    raise exception 'الجلسة غير صالحة' using errcode = '42501';
  end if;

  select role into v_role from public.users where id = v_user_id;
  if v_role is null then
    raise exception 'حسابك غير مسجل في المنصة' using errcode = 'P0001';
  end if;

  select broker_id, status into v_broker, v_status
  from public.orders
  where id = p_order_id;

  if v_broker is null then
    raise exception 'الطلب غير موجود' using errcode = 'P0002';
  end if;

  if v_role <> 'admin' and v_broker <> v_user_id then
    raise exception 'لا تملك صلاحية تعديل هذا الطلب' using errcode = '42501';
  end if;

  if v_status <> 'open' then
    raise exception 'لا يمكن تعديل الطلب بعد حجزه — الحالة الحالية: %', v_status
      using errcode = 'P0003';
  end if;

  if p_client_name is null or btrim(p_client_name) = '' then
    raise exception 'اسم العميل مطلوب' using errcode = 'P0004';
  end if;
  if p_client_phone is null or btrim(p_client_phone) = '' then
    raise exception 'هاتف العميل مطلوب' using errcode = 'P0004';
  end if;
  if p_title is null or btrim(p_title) = '' then
    raise exception 'عنوان الطلب مطلوب' using errcode = 'P0004';
  end if;
  if p_unit_title is null or btrim(p_unit_title) = '' then
    raise exception 'عنوان الوحدة مطلوب' using errcode = 'P0004';
  end if;
  if p_assignment_name is null or btrim(p_assignment_name) = '' then
    raise exception 'اسم التكليف مطلوب' using errcode = 'P0004';
  end if;
  if p_total_price is null or p_total_price <= 0 then
    raise exception 'السعر يجب أن يكون أكبر من صفر' using errcode = 'P0004';
  end if;
  if p_deadline is null or p_deadline <= now() then
    raise exception 'الموعد النهائي يجب أن يكون في المستقبل' using errcode = 'P0004';
  end if;

  update public.orders set
    client_name = btrim(p_client_name),
    client_phone = btrim(p_client_phone),
    client_school = nullif(btrim(coalesce(p_client_school, '')), ''),
    title = btrim(p_title),
    unit_title = btrim(p_unit_title),
    assignment_name = btrim(p_assignment_name),
    total_price = p_total_price,
    deadline = p_deadline
  where id = p_order_id;

  insert into public.activity_logs (order_id, actor_id, action, details)
  values (
    p_order_id,
    v_user_id,
    'edit',
    'تم تعديل بيانات الطلب المفتوح بواسطة ' || coalesce(
      (select full_name from public.users where id = v_user_id), 'مستخدم'
    )
  );

  return jsonb_build_object(
    'success', true,
    'message', 'تم تحديث الطلب بنجاح',
    'order_id', p_order_id
  );
end;
$$;

revoke all on function public.update_open_order(uuid, text, text, text, text, text, text, numeric, timestamptz) from public;
grant execute on function public.update_open_order(uuid, text, text, text, text, text, text, numeric, timestamptz) to authenticated, service_role;

grant select, insert, delete on public.client_notes to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Seed data lives in seed.sql (classification reference data + team accounts).
-- ---------------------------------------------------------------------------
