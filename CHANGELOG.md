# Changelog

All notable changes to BTEC Brother are documented here.
Format loosely follows [Keep a Changelog](https://keepachangelog.com); dates are `YYYY-MM-DD`.

## [2026-08-24] — CRM Feature Suite

### Added
- **Telegram deadline reminders** (`/api/cron/reminders`, hourly via Vercel Cron,
  `CRON_SECRET`-protected): DMs the worker and broker 24h and 6h before an
  in-progress order's deadline; `reminder_sent_24h/6h` flags prevent spam.
- **Duplicate client detection**: typing a known phone in the create-order form
  surfaces the client's history count, usual school and grade with a link into
  the CRM (matches on last-9 digits across formats).
- **Clients CSV/Excel export** (UTF-8 BOM) of the currently filtered directory.
- **Open-order editing**: owning brokers and admins can fix client details,
  title, unit, price and deadline while an order is unclaimed — enforced by a
  new `update_open_order` RPC (status + ownership re-checked server-side).
- **Realtime client sync**: the CRM recalculates stats, badges and totals live
  from Supabase Realtime order events.
- **CRM notes** (`client_notes` table, staff-only RLS): timestamped internal
  notes per client in the drawer, deletable by author or admin.
- **Revenue reports** (admin → التقارير): monthly revenue bars, distribution by
  specialisation, per-broker/worker completion velocity — dependency-free.
- **Server-side pagination**: market filters now run in the DB (50/page, exact
  count); clients directory paginates at 25/page.
- E2E suites for the full revision flow and the settlement flow (24 total).

### Fixed
- `package-lock.json` drift that broke CI's `npm ci` (regenerated with the
  CI's npm major; `node --test` now receives an explicit TS glob).

## [2026-08-24]
- **Full rebrand to BTEC Brother**: platform name updated across metadata, PWA manifest,
  login/pending screens, Telegram notifications, and the admin export header; brand color
  shifted from orange-red `#EA2804` to the emblem's crimson `#BB1928` (`--brand`,
  `--brand-pressed`, `--primary`, browser theme color) across light and dark themes.
- **Rebranded platform logo** to the new BTEC Brother identity: header lockup
  (`logo-light.png` / `logo-dark.png`, shared across light/dark themes) and all app icons
  (`favicon.ico`, `icon-192/512`, `apple-icon`) regenerated from the new artwork with the
  background removed for transparency.

### Added
- **Clients CRM screen** (`/clients`, admin + broker only): client directory aggregated from
  orders (grouped by normalized phone) with stat cards, desktop table + mobile cards, and a
  per-client order-history drawer with WhatsApp quick actions and order-form prefill.
- **Composable multi-criteria filtering** with URL-synced state: omni-search (debounced),
  grade level, academic criteria (P/M/D), school, specialisation, responsible broker
  (admin-only), client activity status, and four sort keys. KPI cards reflect active filters.
- Staff-only «العملاء» entries in the header and bottom navigation.
- `defaultClient` prop on the create-order modal for client prefill from the CRM.
- Playwright e2e suite for the clients CRM (12 scenarios, deterministic staging fixtures)
  and a `node --test` unit suite for the aggregation logic; CI runs both.

### Fixed
- Clients filters for grade / criteria / specialisation / broker updated the URL but not the
  applied filter state (param-name vs state-key mismatch) — caught by the new e2e suite.
- `pg_policies` verification query column name in the security-fix script.

### Security
- Applied the 2026-08-24 security hardening set: `orders_select` restricted to signed-in
  members (was implicitly public to anon), actor-scoped `activity_logs_insert`, function
  grants revoked from `public`, and drifted function variants dropped before recreate.

## [2026-08-24] — Orders

### Added
- Optional `client_school` field on orders (migration `add_client_school.sql`) with broker
  order-form input, so client school names feed the clients CRM.

[Unreleased]: keep new entries under this heading until the next dated section.
