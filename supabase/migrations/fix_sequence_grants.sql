-- ============================================================================
-- BTEC Brother — Fix: sequence grants for order creation
-- ----------------------------------------------------------------------------
-- Symptom: creating an order fails with
--   "permission denied for sequence orders_order_number_seq"
--
-- Root cause: the `authenticated` role lacks USAGE on the sequence that backs
-- `orders.order_number` (a `serial` column). Supabase's default privileges can
-- miss sequences created in the SQL editor, so the sequence does not inherit
-- the baseline grants that the tables got.
--
-- Fix: re-apply the baseline grants now that the sequence exists. Idempotent —
-- safe to run repeatedly.
-- ============================================================================

grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
