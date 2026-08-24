# Changelog

All notable changes to BTEC Hub are documented here.
Format loosely follows [Keep a Changelog](https://keepachangelog.com); dates are `YYYY-MM-DD`.

## [2026-08-24]

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
