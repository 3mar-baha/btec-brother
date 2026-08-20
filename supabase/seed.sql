-- ============================================================================
-- BTEC Hub — Seed Data
-- ----------------------------------------------------------------------------
-- Run AFTER schema.sql on a fresh database. The script is idempotent.
--
-- 1. Classification reference data (Specialisations, Grade Levels, Criteria).
-- 2. Team accounts linked to Supabase Auth (1 Admin, 3 Brokers, 7 Workers).
--
-- Default password for all seeded accounts: Password123!
-- (change it immediately in production)
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. Classification reference data
-- ---------------------------------------------------------------------------
insert into public.specialisations (name) values
  ('إدارة الأعمال'),
  ('تكنولوجيا المعلومات'),
  ('الهندسة'),
  ('الضيافة والسياحة')
on conflict (name) do nothing;

insert into public.grade_levels (name) values
  ('الصف العاشر'),
  ('الأول ثانوي'),
  ('التوجيهي')
on conflict (name) do nothing;

insert into public.criteria_levels (code, name) values
  ('P', 'مقبول'),
  ('M', 'جيد'),
  ('D', 'ممتاز')
on conflict (code) do nothing;

-- ---------------------------------------------------------------------------
-- 2. Team accounts (linked to Supabase Auth)
-- ---------------------------------------------------------------------------
-- Inserting into auth.users fires the `handle_new_user` trigger, which creates
-- the matching public.users row (role defaults to 'worker', full_name taken
-- from raw_user_meta_data). Roles are then corrected below.
-- ---------------------------------------------------------------------------
insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  created_at,
  updated_at
) values
  -- Admin
  ('11111111-1111-4111-8111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'admin@btechub.app', crypt('Password123!', gen_salt('bf', 10)), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"أحمد المدير"}',
   '', '', '', '', now(), now()),
  -- Brokers
  ('22222222-2222-4222-8222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'broker1@btechub.app', crypt('Password123!', gen_salt('bf', 10)), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"محمد الوسيط"}',
   '', '', '', '', now(), now()),
  ('33333333-3333-4333-8333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'broker2@btechub.app', crypt('Password123!', gen_salt('bf', 10)), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"خالد الوسيط"}',
   '', '', '', '', now(), now()),
  ('44444444-4444-4444-8444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'broker3@btechub.app', crypt('Password123!', gen_salt('bf', 10)), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"سارة الوسيط"}',
   '', '', '', '', now(), now()),
  -- Workers
  ('55555555-5555-4555-8555-555555555555', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'worker1@btechub.app', crypt('Password123!', gen_salt('bf', 10)), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"يوسف العامل"}',
   '', '', '', '', now(), now()),
  ('66666666-6666-4666-8666-666666666666', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'worker2@btechub.app', crypt('Password123!', gen_salt('bf', 10)), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"عمر العامل"}',
   '', '', '', '', now(), now()),
  ('77777777-7777-4777-8777-777777777777', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'worker3@btechub.app', crypt('Password123!', gen_salt('bf', 10)), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"ليلى العاملة"}',
   '', '', '', '', now(), now()),
  ('88888888-8888-4888-8888-888888888888', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'worker4@btechub.app', crypt('Password123!', gen_salt('bf', 10)), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"نور العاملة"}',
   '', '', '', '', now(), now()),
  ('99999999-9999-4999-8999-999999999999', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'worker5@btechub.app', crypt('Password123!', gen_salt('bf', 10)), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"عبدالله العامل"}',
   '', '', '', '', now(), now()),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'worker6@btechub.app', crypt('Password123!', gen_salt('bf', 10)), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"فاطمة العاملة"}',
   '', '', '', '', now(), now()),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'worker7@btechub.app', crypt('Password123!', gen_salt('bf', 10)), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"زياد العامل"}',
   '', '', '', '', now(), now())
on conflict (id) do nothing;

-- Email identities so password sign-in resolves correctly.
insert into auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at, last_sign_in_at)
values
  ('11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111',
   jsonb_build_object('sub', '11111111-1111-4111-8111-111111111111', 'email', 'admin@btechub.app'),
   'email', '11111111-1111-4111-8111-111111111111', now(), now(), now()),
  ('22222222-2222-4222-8222-222222222222', '22222222-2222-4222-8222-222222222222',
   jsonb_build_object('sub', '22222222-2222-4222-8222-222222222222', 'email', 'broker1@btechub.app'),
   'email', '22222222-2222-4222-8222-222222222222', now(), now(), now()),
  ('33333333-3333-4333-8333-333333333333', '33333333-3333-4333-8333-333333333333',
   jsonb_build_object('sub', '33333333-3333-4333-8333-333333333333', 'email', 'broker2@btechub.app'),
   'email', '33333333-3333-4333-8333-333333333333', now(), now(), now()),
  ('44444444-4444-4444-8444-444444444444', '44444444-4444-4444-8444-444444444444',
   jsonb_build_object('sub', '44444444-4444-4444-8444-444444444444', 'email', 'broker3@btechub.app'),
   'email', '44444444-4444-4444-8444-444444444444', now(), now(), now()),
  ('55555555-5555-4555-8555-555555555555', '55555555-5555-4555-8555-555555555555',
   jsonb_build_object('sub', '55555555-5555-4555-8555-555555555555', 'email', 'worker1@btechub.app'),
   'email', '55555555-5555-4555-8555-555555555555', now(), now(), now()),
  ('66666666-6666-4666-8666-666666666666', '66666666-6666-4666-8666-666666666666',
   jsonb_build_object('sub', '66666666-6666-4666-8666-666666666666', 'email', 'worker2@btechub.app'),
   'email', '66666666-6666-4666-8666-666666666666', now(), now(), now()),
  ('77777777-7777-4777-8777-777777777777', '77777777-7777-4777-8777-777777777777',
   jsonb_build_object('sub', '77777777-7777-4777-8777-777777777777', 'email', 'worker3@btechub.app'),
   'email', '77777777-7777-4777-8777-777777777777', now(), now(), now()),
  ('88888888-8888-4888-8888-888888888888', '88888888-8888-4888-8888-888888888888',
   jsonb_build_object('sub', '88888888-8888-4888-8888-888888888888', 'email', 'worker4@btechub.app'),
   'email', '88888888-8888-4888-8888-888888888888', now(), now(), now()),
  ('99999999-9999-4999-8999-999999999999', '99999999-9999-4999-8999-999999999999',
   jsonb_build_object('sub', '99999999-9999-4999-8999-999999999999', 'email', 'worker5@btechub.app'),
   'email', '99999999-9999-4999-8999-999999999999', now(), now(), now()),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   jsonb_build_object('sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'email', 'worker6@btechub.app'),
   'email', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', now(), now(), now()),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
   jsonb_build_object('sub', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'email', 'worker7@btechub.app'),
   'email', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', now(), now(), now())
on conflict do nothing;

-- Correct roles (the trigger defaults everyone to 'worker') and mark all
-- seeded team accounts as pre-approved.
update public.users set role = 'admin',  is_approved = true where id = '11111111-1111-4111-8111-111111111111';
update public.users set role = 'broker', is_approved = true where id in (
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444444'
);
update public.users set role = 'worker', is_approved = true where id in (
  '55555555-5555-4555-8555-555555555555',
  '66666666-6666-4666-8666-666666666666',
  '77777777-7777-4777-8777-777777777777',
  '88888888-8888-4888-8888-888888888888',
  '99999999-9999-4999-8999-999999999999',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
);
