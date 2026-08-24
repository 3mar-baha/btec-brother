# 03 — Technical Specification

## 1. Stack (exact versions)

| Layer | Technology |
| ----- | ---------- |
| Framework | Next.js **14.2.35** (App Router, React Server Components) |
| Language | TypeScript (strict mode, `noEmit` typecheck) |
| UI | Tailwind CSS 3.4 + shadcn/ui (Radix primitives), lucide-react icons |
| Backend | Supabase — PostgreSQL 15, Auth, Row Level Security, Realtime, Storage |
| Messaging | Telegram Bot API (webhook + outbound notifications) |
| Scheduling | Vercel Cron → `/api/cron/reminders` (hourly) |
| Hosting | Vercel (`fra1` region), auto-deploy on push to `main` |
| Testing | Playwright (E2E against staging) + Node built-in test runner (unit) |
| Charts | Dependency-free CSS bar charts (no chart library) |

## 2. Architecture Constraints

1. **Server-first data access.** Pages are `force-dynamic` Server Components;
   the browser client is used only for mutations, realtime, and CRM notes.
2. **PII boundary.** Client name/phone/school columns are selected only in
   staff-scoped queries. The market query never includes client columns, so
   worker browsers never receive PII. The edit dialog fetches client fields
   on demand (RLS: owning broker or admin only).
3. **Mutations through RPCs.** Every state transition (`claim_order`,
   `drop_order`, `submit_order_solution`, `request_revision`,
   `approve_and_complete_order`, `settle_payout`, `update_open_order`) is a
   Postgres function that re-validates role + status inside the transaction.
4. **No ORM.** Typed Supabase client generated into `src/types/database.types.ts`.
5. **Manual migrations.** SQL files under `supabase/migrations/` are applied
   by hand (staging first). `schema.sql` is the canonical mirror.

## 3. Performance

- Market: server-side filtering + keyset-friendly `range` pagination
  (50/page) with exact `count` — constant payload per page.
- Clients CRM: one scoped orders fetch (latest-first) aggregated in-memory;
  25 clients/page rendered. Designed for thousands of orders per broker;
  add server-side aggregation RPC if a broker exceeds ~5k orders.
- Admin: single parallel fetch of users/completed orders/payouts; aggregation
  happens server-side in the page (RSC), charts render zero-JS bars.
- Realtime: one channel per screen (`market-orders`, `clients-orders`),
  removed on unmount.

## 4. Environment Variables

| Variable | Scope | Purpose |
| -------- | ----- | ------- |
| `NEXT_PUBLIC_SUPABASE_URL` | public | Project URL (build-time inlined) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Anon key (build-time inlined) |
| `SUPABASE_SERVICE_ROLE_KEY` | server-only | Cron route + scripts |
| `TELEGRAM_BOT_TOKEN` | server-only | Bot API calls |
| `TELEGRAM_CHAT_ID` | server-only | Team group notifications |
| `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` / `_ID` | public | Login widget |
| `CRON_SECRET` | server-only | Protects `/api/cron/*` (Vercel sends it as bearer) |
| `NEXT_PUBLIC_APP_URL` | public | Absolute links inside Telegram messages |

## 5. Coding Conventions

- Arabic-first RTL; logical CSS properties only (`ps/pe`, `start/end`).
- Brand crimson `#BB1928` via `--brand` tokens; never hardcode orange.
- Pure logic (aggregation, filtering, normalization) lives in
  framework-free modules with unit tests (`tests/unit/`).
- Conventional commits; **no AI attribution trailers** (see `CLAUDE.md`).
