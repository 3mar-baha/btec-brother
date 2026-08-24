-- ============================================================================
-- BETC Brother — Migration: CRM feature suite
-- ----------------------------------------------------------------------------
-- Run manually in the Supabase SQL Editor (staging first, then production).
-- Adds:
--   1. Deadline reminder flags on orders (24h / 6h Telegram reminders)
--   2. client_notes table — internal CRM notes keyed by normalized phone
--   3. update_open_order() — guarded edit of open orders (owner broker/admin,
--      blocked once the order leaves 'open')
-- Idempotent: safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Reminder tracking columns
-- ---------------------------------------------------------------------------
alter table public.orders add column if not exists reminder_sent_24h timestamptz;
alter table public.orders add column if not exists reminder_sent_6h timestamptz;

-- ---------------------------------------------------------------------------
-- 2) client_notes — internal CRM notes per client (keyed by normalized phone)
-- ---------------------------------------------------------------------------
create table if not exists public.client_notes (
  id uuid primary key default gen_random_uuid(),
  client_phone text not null,
  author_id uuid not null references public.users(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

create index if not exists idx_client_notes_phone on public.client_notes(client_phone);

alter table public.client_notes enable row level security;

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

grant select, insert, delete on public.client_notes to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3) update_open_order() — edit an order while it is still unclaimed.
--    Enforces: caller is the owning broker or an admin, status is 'open',
--    and validates the editable fields. Logged to activity_logs.
-- ---------------------------------------------------------------------------
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
  v_number  numeric;
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

  v_number := p_total_price;
  if v_number is null or v_number <= 0 then
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
    total_price = v_number,
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
