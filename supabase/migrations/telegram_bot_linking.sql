-- ============================================================================
-- BTEC Hub — Migration: Telegram bot deep-link linking
-- ----------------------------------------------------------------------------
-- Run directly in the live Supabase SQL editor. Enables "link your Telegram
-- account" via the bot (t.me/btechub_team_bot?start=<token>) instead of the
-- OAuth login widget. The settings page inserts a one-time token; the bot
-- webhook resolves it to a chat_id and stores that on public.users.
--
-- Self-contained: re-applies the service_role table grants (idempotent) so it
-- works even if grant_service_role_and_promote_admin.sql was not run yet.
-- ============================================================================

-- 1. Baseline role grants (idempotent; RLS remains the security boundary).
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all functions in schema public to anon, authenticated, service_role;

alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;

-- 2. One-time link tokens. Only the service role (settings page + webhook)
--    reads/writes this table; RLS denies authenticated/anon.
create table if not exists public.telegram_link_tokens (
  token      text primary key,
  user_id    uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '10 minutes')
);

alter table public.telegram_link_tokens enable row level security;

grant all on public.telegram_link_tokens to service_role;
