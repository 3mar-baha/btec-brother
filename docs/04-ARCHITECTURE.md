# 04 — Architecture

## 1. System Design

```
┌─────────────────────────────  Vercel (fra1)  ─────────────────────────────┐
│                                                                            │
│  Next.js 14 App Router                                                     │
│  ┌───────────────────┐  ┌────────────────────┐  ┌───────────────────────┐ │
│  │ (auth)/login      │  │ (dashboard)/*      │  │ api/*                 │ │
│  │ pending-approval  │  │ market workspace   │  │  auth/register        │ │
│  │                   │  │ clients directory  │  │  auth/telegram(+link) │ │
│  │ RSC, force-dyn.  │  │ logs admin profile │  │  telegram/webhook     │ │
│  └────────┬──────────┘  └─────────┬──────────┘  │  cron/reminders       │ │
│           │  middleware.ts (session cookie, approval gate, route guard)   │
└───────────┼─────────────────────┼───────────────────┼─────────────────────┘
            ▼                     ▼                   ▼
┌────────────────────────── Supabase project ──────────────────────────────┐
│  Auth (email + Telegram-linked identities)                                │
│  PostgreSQL 15 — RLS on every table                                       │
│    tables: users, orders, order_attachments, daily_updates,               │
│            activity_logs, reviews, payouts, client_notes,                 │
│            telegram_link_tokens, specialisations, grade_levels,           │
│            criteria_levels                                                │
│  RPCs: claim_order, drop_order, submit_order_solution,                    │
│        request_revision, approve_and_complete_order, settle_payout,       │
│        approve_user, reject_user, update_open_order, directory_stats,     │
│        is_admin()                                                         │
│  Realtime: orders (INSERT/UPDATE/DELETE)                                  │
│  Storage: order-attachments bucket                                        │
└───────────────────────────────────────────────────────────────────────────┘
            │                     │                    │
            ▼                     ▼                    ▼
   Telegram Bot API        wa.me deep links      Vercel Cron (hourly)
   (group + private DMs)   (client quick chat)   → /api/cron/reminders
```

## 2. Request Flow

1. **Every request** passes `src/middleware.ts`: session refresh via
   Supabase SSR cookies, approval gate (`/pending-approval`), and the
   protected-route list (`/market /workspace /directory /clients /logs
   /admin /settings /profile`).
2. **Server Components** call `getCurrentUser()` / `getCurrentProfile()`
   (React `cache()`-deduped) and enforce **role guards** (e.g. `/clients`
   redirects non-staff to `/market`) before rendering.
3. **Client components** own interactivity: filters (URL via
   `history.replaceState`, shallow), modals (Radix), realtime subscriptions,
   and mutations through the browser Supabase client (RLS applies).

## 3. Component Registry (feature folders)

| Folder | Responsibility |
| ------ | -------------- |
| `components/market` | Order pool: filter bar, order cards, create/edit modals, duplicate-client hint |
| `components/workspace` | Worker + broker workspaces: task card, daily updates, submit solution, revision loop |
| `components/clients` | CRM: aggregation logic (`aggregate.ts`), filter bar, drawer, notes panel, main screen |
| `components/admin` | Dashboard tabs: finance, members, categories, reports, emergency control, settle modal |
| `components/dashboard` | Header nav, bottom nav, balance, page transition |
| `components/directory` | Team directory (stats via `directory_stats` RPC) |
| `components/logs` | Activity log views |
| `lib/` | Supabase clients (server/browser/service), format helpers, export CSV, telegram senders, BTEC presets |

## 4. Data Flow Examples

**Claim a task:** card button → `supabase.rpc('claim_order')` → Postgres
transaction validates "no active task", sets `worker_id`, `in_progress` →
realtime event → broker CRM/market refresh → Telegram DM to broker.

**Deadline reminder:** Vercel Cron hourly → `GET /api/cron/reminders`
(bearer `CRON_SECRET`) → service-role client scans `in_progress` orders with
`deadline` inside 24h/6h windows → Telegram DMs to worker + broker →
`reminder_sent_*` timestamps written (idempotent).

## 5. Key Design Decisions

| Decision | Rationale |
| -------- | --------- |
| URL as filter state (`history.replaceState`) | Shareable/refreshable CRM views with zero server round-trips |
| Phone digits as client identity | Robust across `07…/9627…/+9627…` formats; matches broker mental model |
| Dependency-free charts | Two bar charts don't justify a chart library's bundle cost |
| `security invoker` for `update_open_order` | Ownership check runs under the caller's RLS context; definer functions reserved for atomic workflows |
