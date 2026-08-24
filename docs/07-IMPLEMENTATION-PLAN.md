# 07 — Implementation Plan

Historical phased plan with acceptance criteria. Phases 0–5 are **shipped**;
Phase 6 is the forward roadmap.

## Phase 0 — Foundation ✅
Auth (email + Telegram), approval gate, role model, RTL shell, theming.
**Accepted when:** an unapproved signup lands on `/pending-approval`; an
approved user reaches their role landing page.

## Phase 1 — Order Marketplace ✅
Orders table, open pool, create-order modal with BTEC presets, atomic
claim/drop, realtime pool, Telegram group notifications.
**Accepted when:** two workers race a claim and exactly one wins; the broker
is notified.

## Phase 2 — Execution & Review Loop ✅
Daily updates, submission with Drive link + Turnitin/AI %, revision loop,
approve → completion with automatic 80/20 payouts, admin settlement.
**Accepted when:** a full open→completed→settled cycle leaves correct payout
states and balances (covered by `tests/e2e/revisions.spec.ts` +
`settlements.spec.ts`).

## Phase 3 — Security Hardening ✅ (2026-08-24)
`orders_select` closed to authenticated-only, actor-scoped log inserts,
function grants revoked from `public`, drifted function variants dropped.
Audit: `docs/AUDIT-REPORT-2026-08-24.md`.

## Phase 4 — Clients CRM ✅ (2026-08-24)
`client_school` field, `/clients` directory with aggregated clients, 8
composable URL-synced filters, history drawer, WhatsApp actions, order
prefill, staff-only access.

## Phase 5 — Operations Suite ✅ (2026-08-24)
Deadline reminder cron, duplicate-client detection, CSV export, guarded
open-order editing, CRM realtime sync, client notes, revenue reports,
server-side pagination, rebrand to BTEC Brother (crimson identity).

## Phase 6 — Roadmap (prioritized)

| # | Item | Notes |
| - | ---- | ----- |
| 1 | Notes/edit E2E coverage | Requires `crm_features.sql` applied to staging first |
| 2 | Server-side CRM aggregation RPC | If any broker exceeds ~5k orders (keep in-memory until then) |
| 3 | Client merge tool | Manual merge of two phone keys into one |
| 4 | Configurable country code | Replace the hardcoded +962 `wa.me` assumption |
| 5 | Payout reversal flow | Cancelled orders with generated payouts |
| 6 | Overdue-order digest | Daily group summary of late tasks (cron extension) |
