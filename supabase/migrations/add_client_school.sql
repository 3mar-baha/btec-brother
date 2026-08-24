-- ============================================================================
-- BTEC Hub — Migration: client school name on orders
-- ----------------------------------------------------------------------------
-- Run directly in the live Supabase SQL editor. Adds an optional
-- `client_school` column to `public.orders` so brokers can record the
-- client's school alongside their name and phone.
--
-- Nullable by design: existing orders stay valid, and workers never see
-- client fields anyway (hidden at the query layer; see schema.sql RLS note).
-- ============================================================================

alter table public.orders add column if not exists client_school text;
