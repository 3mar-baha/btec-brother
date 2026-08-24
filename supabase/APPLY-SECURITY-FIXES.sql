-- ============================================================================
-- ██ APPLY-SECURITY-FIXES.sql — انسخ هذا الملف كاملاً والصقه في Supabase SQL Editor وشغّل مرة واحدة
--
-- يطبق ترحيلَي تدقيق 2026-08-24 بالترتيب الصحيح:
--   1) فحوصات وقائية تتوقف برسالة عربية إذا كانت البيانات ستُفشل الترحيل
--   2) security_hardening.sql   (RLS / RPC guards / قيود)
--   3) remove_hardcoded_admin_bootstrap.sql
--   4) استعلامات تحقق نهائية — آخرها يكشف حسابات ما زالت على كلمة المرور العلنية
--
-- آمن للتكرار: كل خطوة idempotent (create or replace / drop-if-exists / شرطية).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- [1/4] فحص قبلية: لا يجوز وجود أدمين غير معتمد أو موقوف
-- ---------------------------------------------------------------------------
do $$
declare v int;
begin
  select count(*) into v
  from public.users
  where role = 'admin' and (not is_approved or not is_active);

  if v > 0 then
    raise exception '⏹ أُوقِف السكربت: يوجد % حساب أدمن غير معتمد أو موقوف. اعتمدْه من لوحة الأعضاء أولاً ثم أعد تشغيل السكربت.', v;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- [1/4] فحص قبلية: telegram_chat_id مكررة ستُفشل قيد UNIQUE
-- ---------------------------------------------------------------------------
do $$
declare dups text;
begin
  select string_agg(t.chat_id::text || ' (×' || t.c || ')', ' ، ')
    into dups
  from (
    select telegram_chat_id as chat_id, count(*) as c
    from public.users
    where telegram_chat_id is not null
    group by 1
    having count(*) > 1
  ) t;

  if dups is not null then
    raise exception '⏹ أُوقِف السكربت: chat_id مكررة: %. وحِّدْها أولاً، مثال: update public.users set telegram_chat_id = null where id = ''<معرف_الحساب_الزائد>''; ثم أعد التشغيل.', dups;
  end if;
end $$;

-- ============================================================================
-- [2/4] security_hardening.sql
-- ============================================================================

-- ============================================================================
-- security_hardening.sql — fixes from the 2026-08-24 security audit
-- Apply manually: supabase db execute (or psql) against staging, then prod.
--
-- 1) Workflow RPCs reject non-approved / suspended accounts (claim, drop,
--    submit, revision, approve).
-- 2) approve_and_complete_order / settle_payout take row locks so concurrent
--    approvals can no longer create duplicate payouts.
-- 3) orders_select no longer grants anon access (client PII stays behind a
--    signed-in session).
-- 4) activity_logs_insert requires the actor to participate in the order,
--    matching daily_updates_insert — stops forged audit entries.
-- 5) Direct UPDATE on orders revoked from client roles; all mutations must go
--    through the SECURITY DEFINER RPCs (no app code updates orders directly).
-- 6) users.telegram_chat_id becomes UNIQUE — prevents two accounts binding
--    one Telegram chat. NOTE: fails if duplicates already exist; dedupe first.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1+2) Workflow RPCs: approval guard + payout row locks
-- ---------------------------------------------------------------------------

-- claim_order: worker claims an open order from the market.
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

-- drop_order: worker drops their own task (or admin force-reassigns).
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

-- submit_order_solution: worker submits (or re-submits) their solution.
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

-- request_revision: broker requests changes ('submitted' -> 'revision').
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

-- approve_and_complete_order: 'submitted' -> 'completed' + payouts.
-- FOR UPDATE serializes concurrent approvals: the second caller re-reads the
-- committed row, sees status <> 'submitted', and aborts instead of paying twice.
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

-- settle_payout: admin settles pending payouts; FOR UPDATE keeps count/total
-- consistent when two settles race.
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
-- 3) orders_select: signed-in members only (was implicitly public to anon)
-- ---------------------------------------------------------------------------
drop policy if exists "orders_select" on public.orders;
create policy "orders_select" on public.orders
  for select to authenticated
  using (
    status = 'open'
    or broker_id = auth.uid()
    or worker_id = auth.uid()
    or public.is_admin()
  );

-- ---------------------------------------------------------------------------
-- 4) activity_logs_insert: actor must participate in the order
-- ---------------------------------------------------------------------------
drop policy if exists "activity_logs_insert" on public.activity_logs;
create policy "activity_logs_insert" on public.activity_logs
  for insert with check (
    actor_id = auth.uid()
    and exists (
      select 1 from public.orders o
      where o.id = order_id and (o.broker_id = auth.uid() or o.worker_id = auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- 5) All order mutations go through RPCs — close the direct-table bypass
-- ---------------------------------------------------------------------------
revoke update on public.orders from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6) One Telegram chat per account
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'users_telegram_chat_id_key'
  ) then
    alter table public.users
      add constraint users_telegram_chat_id_key unique (telegram_chat_id);
  end if;
end $$;

-- ============================================================================
-- [3/4] remove_hardcoded_admin_bootstrap.sql
-- ============================================================================

-- ============================================================================
-- remove_hardcoded_admin_bootstrap.sql — audit follow-up 2026-08-24
--
-- Removes automatic admin grants by hardcoded email from handle_new_user
-- ('admin@btechub.app', and 'omarbaha224@gmail.com' in some environments).
-- Anyone registering such an address on a fresh environment used to become
-- an approved admin without any verification.
--
-- After this migration every sign-up is an unapproved worker/broker request;
-- admins are provisioned EXPLICITLY. Bootstrap a new admin with (runs as
-- postgres / SQL editor / psql — auth.uid() is null there, which
-- enforce_user_field_protection allows through):
--
--   update public.users set role = 'admin', is_approved = true
--   where email = '<your-email>';
--
-- supabase/seed.sql already promotes its accounts by UUID, so fresh env
-- seeding is unaffected.
-- ============================================================================

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

-- Existing admins keep their role; nothing to revoke here. Verify with:
--   select email, role, is_approved from public.users where role = 'admin';

-- ============================================================================
-- [4/4] تحقق نهائي — اقرأ النتائج بعد التشغيل
-- ============================================================================

-- أ) الأدمين الحقيقي يجب أن يظهر هنا بدور admin ومعتمد:
select email, role, is_approved, is_active
from public.users
where role = 'admin';

-- ب) تقرير: حسابات ما زالت على كلمة المرور العلنية Password123!
--    كل صف يظهر هنا يجب تدويره (انظر القالب أسفل الملف).
select email as "حساب_ما_زال_على_كلمة_المرور_العلنية"
from auth.users
where crypt('Password123!', encrypted_password) = encrypted_password;

-- ج) صحة سياسات orders الجديدة (يجب أن ترجع TO authenticated):
select policy_name, roles
from pg_policies
where schemaname = 'public' and tablename = 'orders' and policy_name = 'orders_select';

-- ============================================================================
-- قالب تدوير كلمة المرور — لكل حساب ظهر في القائمة (ب)، انسخ السطر،
-- استبدل الكلمة الجديدة بكلمة قوية فريدة، وألصقه في SQL Editor:
--
-- update auth.users
--    set encrypted_password = crypt('ضع_هنا_كلمة_قوية_فريدة', gen_salt('bf', 10))
--  where email = 'admin@btechub.app';
--
-- ثم سجّل الدخول بها من التطبيق للتأكد.
-- ============================================================================
