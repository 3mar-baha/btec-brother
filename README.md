<div dir="rtl" align="center">

# BTEC Brother · بيتك براذر

**منصة لإدارة طلبات ومهام BTEC — تربط الوسطاء والعاملين والإدارة في سير عمل واحد.**

</div>

<p align="center">
  <a href="https://github.com/3mar-baha/betc-brother/actions/workflows/ci.yml">
    <img src="https://github.com/3mar-baha/betc-brother/actions/workflows/ci.yml/badge.svg" alt="CI">
  </a>
</p>

<p align="center">
  <a href="#features">Features</a> ·
  <a href="#roles--workflow">Roles</a> ·
  <a href="#tech-stack">Tech Stack</a> ·
  <a href="#getting-started">Getting Started</a> ·
  <a href="#environment-variables">Env Vars</a> ·
  <a href="#database">Database</a> ·
  <a href="#testing">Testing</a> ·
  <a href="#deployment">Deployment</a> ·
  <a href="#license">License</a>
</p>

---

## Overview

**BTEC Brother** is a full-stack platform for managing BTEC assignment orders. Brokers
(`وسيط`) create orders on behalf of clients, workers (`عامل`) claim tasks from the
open pool and log daily progress, and admins (`مدير`) oversee the whole operation —
approving new accounts, monitoring activity, and settling payouts.

The app is fully Arabic (RTL), production-hosted on Vercel, and backed by Supabase
(PostgreSQL + Auth + Row Level Security + Realtime).

## Features

- **Email/password & Telegram authentication** — sign up, verify, and link a Telegram account for notifications.
- **Approval workflow** — new accounts land on a pending-approval page until an admin approves them.
- **Open-pool order market** — brokers publish orders; workers claim one active task at a time.
- **Clients CRM** (`/clients`, admin + broker only) — client directory aggregated from orders with
  composable multi-criteria filters (grade, criteria level, school, specialisation, broker, activity
  status), omni-search, four sort keys, URL-synced filter state, per-client order-history drawer,
  WhatsApp quick actions, and one-click order prefill.
- **Daily task updates** — workers post progress notes against their in-progress order.
- **Team directory** — public member listing with earnings (admins are excluded from stats).
- **Activity logs** — full audit trail of order and payment actions.
- **Automatic revenue split** — 80/20 worker/broker split generated on order completion.
- **Admin settlement** — admins settle pending payouts; worker balances reflect settled amounts.
- **Realtime balance** — the header wallet refreshes on navigation and via realtime events.
- **Role-based UI** — create-order, admin, and settlement controls appear only for authorized roles.

## Roles & Workflow

| Role            | Arabic    | Capabilities                                                                 |
| --------------- | --------- | ---------------------------------------------------------------------------- |
| **Admin**       | مدير      | Approves users, edits profiles, promotes roles, monitors logs, settles payouts |
| **Broker**      | وسيط      | Creates orders, manages the clients CRM, approves submission → completion     |
| **Worker**      | عامل      | Claims tasks from the open pool, posts daily updates, submits completed work  |

```
broker creates order  →  worker claims (open pool)  →  worker posts daily updates
      →  broker marks completed  →  80/20 payouts generated (pending)
      →  admin settles payouts  →  worker sees balance in header + profile
```

## Tech Stack

| Layer        | Technology                                                              |
| ------------ | ----------------------------------------------------------------------- |
| Framework    | [Next.js 14](https://nextjs.org) (App Router, RSC)                       |
| Language     | TypeScript                                                               |
| Styling      | [Tailwind CSS v3](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) (Radix) |
| Backend      | [Supabase](https://supabase.com) — Postgres, Auth, RLS, Realtime, RPC    |
| Data fetching| Supabase JS client (React Server Components + client components)         |
| Animation    | Anime.js                                                                 |
| Testing      | [Playwright](https://playwright.dev) (E2E) + Node test runner (unit)     |

## Getting Started

### Prerequisites

- Node.js ≥ 18.17 (Node 20+ recommended)
- npm
- A [Supabase](https://supabase.com) project

### Installation

```bash
git clone https://github.com/3mar-baha/betc-brother.git
cd betc-brother
npm install
```

### Environment variables

Copy the template and fill in your values:

```bash
cp .env.example .env.local
```

See [Environment variables](#environment-variables) for the full list.

### Database setup

1. Open your Supabase project's **SQL Editor**.
2. Run the schema and seed files in order:
   - `supabase/schema.sql` — tables, enums, RLS policies, triggers, RPC functions.
   - `supabase/seed.sql` — reference data (specialisations, grade levels, criteria levels).
3. Apply any pending migration files in `supabase/migrations/` (each targets a specific change).

> **Note:** schema and migrations are applied manually in the SQL Editor; the app has
> no automated migration runner.

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable                          | Description                                        |
| --------------------------------- | -------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`        | Supabase project URL (baked at build time)         |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | Supabase anon/public key (baked at build time)     |
| `SUPABASE_SERVICE_ROLE_KEY`       | Service-role key (server-side only, never exposed) |
| `TELEGRAM_BOT_TOKEN`              | Telegram bot token (server-side)                   |
| `TELEGRAM_CHAT_ID`                | Telegram chat ID for admin notifications           |
| `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` | Telegram bot username (baked at build time)      |
| `NEXT_PUBLIC_TELEGRAM_BOT_ID`     | Telegram bot ID (baked at build time)              |

> Variables prefixed `NEXT_PUBLIC_` are inlined at build time — changing them requires
> a redeploy. Keep `SUPABASE_SERVICE_ROLE_KEY` and `TELEGRAM_BOT_TOKEN` out of any
> client bundle and never commit real values.

## Testing

**Unit tests** cover the clients-CRM aggregation/filter/sort logic — no environment needed:

```bash
node --test "tests/unit/*.test.ts"
```

**End-to-end tests** use Playwright against a **staging** Supabase project (never production).

```bash
# 1. Create .env.staging with the same 7 variables pointing at the staging project
#    (use .env.example as the template)

# 2. Install Playwright browsers (first run only)
npx playwright install

# 3. Run the suite
npm run test:e2e
```

E2E coverage: authentication, role-based access control (including the clients CRM guards),
the clients directory (stats, aggregation, all eight filters, sorting, history drawer,
order-form prefill), the team directory, daily task updates, and header balance correctness.
The clients spec seeds deterministic fixtures on staging and deletes them after the run.

## Deployment

The project is deployed on [Vercel](https://vercel.com) (`fra1` region). Pushing to the
`main` branch triggers a production deployment automatically.

1. Import the repo into Vercel.
2. Set all seven environment variables (see above) in the Vercel project settings.
3. Deploy — the framework (Next.js) is auto-detected.

## Project Structure

```
src/
  app/                    # App Router pages + API route handlers
    (auth)/login/         # login page
    (dashboard)/          # market, workspace, clients, directory, profile, logs, admin, settings
    api/                  # auth (register, telegram), telegram webhook
    pending-approval/     # post-signup approval screen
  components/             # feature components (dashboard, market, workspace, clients, admin…)
  lib/                    # Supabase clients, helpers, utils
  hooks/                  # shared React hooks
supabase/
  schema.sql              # full schema (tables, enums, RLS, RPC)
  seed.sql                # reference data
  setup.sql               # consolidated schema + seed
  migrations/             # incremental SQL migrations
tests/
  e2e/                    # Playwright specs + helpers
  unit/                   # node --test unit suites (clients aggregation logic)
```

## Security

- Row Level Security (RLS) enforced on all tables; client access is scoped per role.
- Service-role key is used **only** in server code (route handlers, migrations, tests).
- `.env*` files, `recovery-codes.txt`, and `.mcp.json` are gitignored.
- See [SECURITY.md](SECURITY.md) for reporting vulnerabilities.

## License

Proprietary — all rights reserved. See [LICENSE](LICENSE).

---

<div dir="rtl">

## نبذة

**بيتك براذر** منصة متكاملة لإدارة طلبات ومهام BTEC. الوسطاء ينشئون الطلبات نيابةً عن
العملاء، والعاملون يستلمون المهام من السوق المفتوح ويسجّلون التقدّم اليومي، والمدير
يشرف على العملية كاملة: اعتماد الحسابات، متابعة النشاط، وتسوية المدفوعات.

التطبيق بالكامل باللغة العربية (RTL)، مستضاف على Vercel، ومدعوم بـ Supabase.

## الأدوار

- **المدير** — يعتمد الحسابات، يعدّل الملفات، يرقي الأدوار، يسوّي المدفوعات.
- **الوسيط** — ينشئ الطلبات، يتابعها، ويعتمد الإنجاز (يولّد دفعات 80/20).
- **العامل** — يستلم مهمة واحدة نشطة، يسجّل التحديثات اليومية، ويسلّم العمل.

## التثبيت والتشغيل

```bash
git clone https://github.com/3mar-baha/betc-brother.git
cd betc-brother
npm install
cp .env.example .env.local   # ثم عبّئ القيم
npm run dev
```

طالع الأقسام أعلاه للحصول على تفاصيل متغيّرات البيئة، وإعداد قاعدة البيانات،
والاختبارات، والنشر.

## الترخيص

حقوق الملكية محفوظة — راجع [LICENSE](LICENSE).

</div>
