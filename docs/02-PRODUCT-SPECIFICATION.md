# 02 — Product Specification

Workflows, order state machine, edge cases, and the Clients CRM behavior.

## 1. Order State Machine

```
            claim_order()                submit_order_solution()
  OPEN ────────────────► IN_PROGRESS ───────────────────────► SUBMITTED
   ▲                        │  ▲                                │
   │ drop_order()           │  │ request_revision()             │ approve_and_complete_order()
   │ (worker or admin)      │  └─────────────┐                  ▼
   └──────────┐             ▼                │              COMPLETED
              │          REVISION ◄─────────┘                  │ payouts generated:
              └───────────────┘                                ▼ (worker 80% / broker 20%, pending)
                                                            ADMIN SETTLES → payouts settled
  CANCELLED — reachable via drop_order from OPEN (reason recorded)
```

State transitions are **RPC-only** (`supabase/schema.sql`). Direct `UPDATE` on
`status` is blocked for workers by RLS grant scoping and never used by the UI.

## 2. Core Workflows

### 2.1 Order creation (broker)
1. Broker opens سوق الطلبات → «إنشاء طلب».
2. Optional BTEC unit preset pre-fills title/unit/specialisation.
3. While typing the client phone, a **duplicate hint** appears when the last
   9 digits match an existing client (history count, school, grade, link into
   `/clients?q=`).
4. On publish: order enters the open pool, the team Telegram group is
   notified, and the order is editable (pencil action) until claimed.

### 2.2 Claim & execution (worker)
- Workers see the pool without client PII (the market query never selects
  client columns).
- `claim_order()` is atomic: exactly one active task per worker; the claim
  notifies the broker on Telegram.
- Worker posts daily updates; header countdown turns urgent <48h.

### 2.3 Review loop (broker)
- Submitted work shows Drive link + Turnitin/AI percentages.
- **Approve** → `approve_and_complete_order()`: sets `completed_at`,
  generates two `pending` payouts (80/20), notifies both parties.
- **Request revision** → `request_revision(notes)`: status → `revision`,
  notes visible to the worker; worker resubmits with updated scores
  (`submit_order_solution`), status returns to `submitted`.

### 2.4 Settlement (admin)
- Finance tab ledger shows per-member pending/settled balances.
- «تسوية المبلغ» → `settle_payout(user_id)` marks **all** of that member's
  pending payouts as `settled` (row-locked, atomic) and records the transfer
  reference. Worker header balance reflects settled amounts only.

## 3. Clients CRM (`/clients`, admin + broker only)

- **Aggregation:** orders grouped by normalized phone (non-digits stripped;
  fallback to lowercased name when a phone is empty). Representative name,
  school set, grade set, totals, active count, last activity derive from the
  group.
- **Composable filters (URL-synced, `history.replaceState`):** omni-search
  (name/phone/school, 300 ms debounce), grade, criteria code (P/M/D), school,
  specialisation, responsible broker (admin only), activity status
  (active / under-revision / completed-only), and sort (recent, spending,
  order count, alphabetical).
- **KPI cards** reflect the active filter set: total clients, distinct
  schools, active orders, top school.
- **Drawer:** order timeline (unit, grade, criteria, status badges, price,
  dates, countdown) + «الملاحظات الإدارية» tab (timestamped internal notes;
  author or admin can delete) + WhatsApp deep link (`wa.me`, +962
  normalization for local `07…` numbers) + one-click new-order prefill.
- **Realtime:** order INSERT/UPDATE/DELETE events refetch the role-scoped set
  and recompute everything live.
- **Export:** CSV with UTF-8 BOM of the currently filtered view.
- **Pagination:** 25 clients/page (client-side over the aggregated view).

## 4. Edge Cases & Rules

| Case | Behavior |
| ---- | -------- |
| Two clients share a phone | They merge into one CRM record (by design — phone is identity) |
| Same phone typed in different formats (`07…`, `9627…`, `+9627…`) | Duplicate detection and CRM grouping normalize digits; notes follow the client across formats |
| Broker edits an order after claim | Blocked server-side by `update_open_order` (raises on non-`open` status) |
| Worker opens `/clients` directly | Redirected to `/market`; API returns no client data (RLS + server guard) |
| Deadline passes with no reminder sent | Next hourly cron run sends the 6h-style urgent notice (window check is `deadline > now`) |
| Duplicate reminder runs | `reminder_sent_24h` / `reminder_sent_6h` flags make the cron idempotent |
| Order cancelled after payouts generated | Payouts are not auto-reversed; admin handles manually (documented in owner manual) |
| Concurrent claim attempts | `claim_order` uses a transactional ownership check; losers get an explicit message |
