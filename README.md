<div align="center">

# BTEC Brother

**Academic Project & Task Operations Platform**
نظام إدارة وتشغيل مشاريع BTEC

[![CI](https://github.com/3mar-baha/btec-brother/actions/workflows/ci.yml/badge.svg)](https://github.com/3mar-baha/btec-brother/actions/workflows/ci.yml)

</div>

## Overview

**BTEC Brother** is an internal, Arabic-first (RTL) operations platform for a
team producing Pearson BTEC coursework. Brokers register client orders and
publish them to an open task pool; workers claim one task at a time, log
daily progress, and submit deliverables with Turnitin/AI scores; admins
oversee accounts, finances, and analytics — with an automatic 80/20 revenue
split and one-click payout settlement.

**Stack:** Next.js 14 (App Router, RSC) · TypeScript (strict) · Tailwind CSS
+ shadcn/ui · Supabase (PostgreSQL 15, Auth, RLS, Realtime, Storage) ·
Telegram Bot notifications · Vercel Cron · Playwright + Node test runner.

## Value Proposition

- **One workflow, zero side-channels** — every order, revision, and payout
  lives in one auditable system.
- **Clients CRM built in** — aggregated client directory with composable
  filters, duplicate detection at entry, internal notes, WhatsApp quick
  actions, and CSV export.
- **Money handled by the database** — atomic 80/20 payout generation and
  row-locked settlement; balances are always visible.
- **Deadlines defended automatically** — Telegram reminders at 24h and 6h
  before every in-progress deadline.
- **PII by design** — workers never receive client contact data; guards live
  in RLS and Server Components, not in hidden buttons.

## Quick Start

```bash
git clone https://github.com/3mar-baha/btec-brother.git
cd btec-brother
npm install
cp .env.example .env.local   # fill in Supabase + Telegram values
npm run dev                  # http://localhost:3000
```

Database setup: run `supabase/schema.sql` then `supabase/seed.sql` in your
Supabase SQL Editor, then apply any pending files from
`supabase/migrations/` (manual, staging first). Full guide:
[docs/13-DEPLOYMENT.md](docs/13-DEPLOYMENT.md).

## Architecture

```
Next.js (RSC + middleware guards) ── Supabase (RLS + RPC workflows)
        │                                   │
        ├── Telegram Bot (webhook + DMs)     ├── Realtime (orders)
        └── Vercel Cron (hourly reminders)   └── Storage (attachments)
```

| Doc | Contents |
| --- | -------- |
| [01-PRODUCT-REQUIREMENTS](docs/01-PRODUCT-REQUIREMENTS.md) | PRD, personas, goals |
| [02-PRODUCT-SPECIFICATION](docs/02-PRODUCT-SPECIFICATION.md) | Workflows, state machine, edge cases, CRM |
| [03-TECHNICAL-SPECIFICATION](docs/03-TECHNICAL-SPECIFICATION.md) | Stack, performance, constraints |
| [04-ARCHITECTURE](docs/04-ARCHITECTURE.md) | System design, components, data flow |
| [05-DATA-MODEL](docs/05-DATA-MODEL.md) | Schemas, RLS policies, RPC contracts |
| [06-API-SPECIFICATION](docs/06-API-SPECIFICATION.md) | Route handlers + RPC API |
| [07-IMPLEMENTATION-PLAN](docs/07-IMPLEMENTATION-PLAN.md) | Phases & acceptance criteria |
| [10-CHECKPOINT](docs/10-CHECKPOINT.md) | Current live state |
| [11-TESTING](docs/11-TESTING.md) | E2E/unit suites, regression gates |
| [12-SECURITY](docs/12-SECURITY.md) | Threat model, RLS guards, audit history |
| [13-DEPLOYMENT](docs/13-DEPLOYMENT.md) | Vercel, cron, Supabase setup |
| [CHANGELOG](CHANGELOG.md) | Release history |
| [CONTRIBUTING](CONTRIBUTING.md) | Workflow & conventions |

## Testing

```bash
node --test "tests/unit/*.test.ts"   # unit — no environment needed
npm run test:e2e                     # Playwright, staging only (.env.staging)
```

24 E2E tests cover auth, role-based access control, the clients CRM
end-to-end, marketplace pagination/filtering, the full revision loop, and
the payout settlement flow. See [docs/11-TESTING.md](docs/11-TESTING.md).

## Security

Row Level Security on every table; state transitions only through guarded
Postgres RPCs; client PII restricted to staff queries; cron endpoints
bearer-protected. Report vulnerabilities per
[SECURITY.md](SECURITY.md) — never in public issues.

## License

Proprietary — all rights reserved. See [LICENSE](LICENSE).
