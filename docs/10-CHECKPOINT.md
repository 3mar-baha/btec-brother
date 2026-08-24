# 10 — Checkpoint (Live State)

**Milestone:** BTEC Brother rebrand + CRM Operations Suite
**Date:** 2026-08-24
**Production:** Vercel (`fra1`), auto-deploys from `main`
**Database:** `supabase/migrations/crm_features.sql` applied to production
(staging: apply before running notes/edit E2E)

## ✅ Live Features (verified by 24-test E2E suite)

### Access & Auth
- Email/password + Telegram login; approval gate; middleware route guards.
- `/clients` strictly admin+broker (workers redirected, zero PII exposure).

### Marketplace
- Open pool with server-side filtering (specialisation/grade/criteria/
  urgency) and 50/page exact-count pagination; realtime refresh.
- Create-order modal: BTEC presets, attachments, duplicate-client hint
  (last-9-digit match → history, school, grade, CRM link).
- Open-order editing (owner broker/admin) via `update_open_order` RPC.

### Workspace
- One active task per worker, atomic claim/drop, daily updates.
- Submission with Drive link + Turnitin/AI %; revision loop with notes.

### Clients CRM (`/clients`)
- Aggregated directory (phone-digits identity), 8 composable URL-synced
  filters, 4 sort keys, live KPI cards.
- Drawer: order timeline, WhatsApp deep links (+962 normalization),
  order-form prefill, الملاحظات الإدارية notes tab (staff RLS).
- CSV/Excel export (UTF-8 BOM) of the filtered view; 25/page pagination.
- Realtime sync of stats/badges/totals.

### Admin
- Finance ledger with settle flow (row-locked `settle_payout`), CSV export.
- التقارير tab: monthly revenue bars, specialisation distribution,
  per-broker/worker velocity tables.
- Categories manager, user approval/promotion, emergency task reassignment.

### Automation
- `/api/cron/reminders` hourly (Vercel Cron, `CRON_SECRET`): Telegram DMs at
  24h/6h with idempotency flags. **Requires `CRON_SECRET` + 
  `NEXT_PUBLIC_APP_URL` in Vercel env.**

## 🎨 Brand
- Name: **BTEC Brother** (strict spelling) — metadata, PWA manifest,
  Telegram templates, docs, repo (`3mar-baha/betc-brother`).
- Color: crimson `#BB1928` (`--brand`), pressed `#971420`; theme-color
  browser + PWA. Logo: BETC BROTHER artwork (JPEG-derived, transparent).

## 🧪 Quality Gates (all green at this checkpoint)
`npm run lint` · `npx tsc --noEmit` · `npm run build` (22 routes) ·
`node --test "tests/unit/*.test.ts"` (5) · Playwright 24/24 on staging ·
GitHub Actions CI green.

## 📌 Known Open Items
1. Staging DB needs `crm_features.sql` before notes/edit E2E can run there.
2. Vercel project name + `NEXT_PUBLIC_APP_URL` still reference the old
   `btec-hub` naming (owner action in Vercel dashboard).
3. Legacy `.docx` specs were removed from the repo (English `.md` suite
   replaces them; originals remain in the local `BTEC Brother -
   Documentation` folder).
4. Logo artwork spells "BETC BROTHER" while platform text uses "BTEC
   Brother" — replace the artwork file if strict BTEC spelling is wanted in
   the logo itself.
