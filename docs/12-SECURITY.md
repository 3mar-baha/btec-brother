# 12 — Security

Reporting a vulnerability: see [SECURITY.md](../SECURITY.md) — email the
maintainer, never a public issue. Audit history:
[AUDIT-REPORT-2026-08-24.md](AUDIT-REPORT-2026-08-24.md).

## 1. Threat Model (summary)

| Asset | Threat | Control |
| ----- | ------ | ------- |
| Client PII (name/phone/school) | Exposure to workers or anon | Staff-only queries, market select excludes client columns, RLS `orders_select`, `/clients` server guard |
| Payouts money paths | Self-approval, double settlement | RPC-only transitions, `settle_payout` admin-gated with row locks, 80/20 computed server-side |
| Order integrity | Editing claimed orders, status jumping | `update_open_order` re-checks ownership + `status='open'` in-transaction; all transitions via guarded RPCs |
| Cron endpoint | Unauthorized triggering of Telegram spam | `CRON_SECRET` bearer check; 401 without it |
| Telegram webhook | Forged updates | `x-telegram-bot-api-secret-token` = SHA-256(bot token + internal salt) |
| Account takeover | Brute force | Supabase Auth built-in limits; approval gate adds a second factor for platform access |
| Service-role key | Client leakage | Server-only env var; never imported in client components |

## 2. RLS Guards (defense in depth)

- Every table has RLS enabled; the anon role reads nothing sensitive.
- `orders_select`: authenticated-only, scoped to open pool + own
  participation + admin.
- `client_notes`: select admin/broker; insert author=self + staff;
  delete author or admin.
- `activity_logs_insert`: actor must participate in the order (no forged
  audit entries).
- `update_open_order` runs as `security invoker` so the caller's own RLS
  applies beneath the explicit ownership check.

## 3. Secrets Policy

- `.env*` gitignored; `.env.example` documents every variable.
- `SUPABASE_SERVICE_ROLE_KEY`, `TELEGRAM_BOT_TOKEN`, `CRON_SECRET` are
  server-only. If a secret ever leaks: rotate in Supabase / BotFather /
  Vercel immediately (see SECURITY.md).

## 4. Audit History

- **2026-08-24 hardening set** (applied to production): `orders_select`
  closed from implicit anon access, actor-scoped log inserts, `EXECUTE`
  revoked from `public` on all RPCs, drifted function variants dropped
  before recreate. Details: [AUDIT-REPORT-2026-08-24.md](AUDIT-REPORT-2026-08-24.md).
- Git history contains no AI attribution (enforced by `CLAUDE.md` policy;
  verified 0 occurrences across all refs).
