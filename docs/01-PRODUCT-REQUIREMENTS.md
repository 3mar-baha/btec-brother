# 01 — Product Requirements (PRD)

**Product:** BTEC Brother — نظام إدارة وتشغيل مشاريع BTEC
**Tagline:** Academic Project & Task Operations Platform
**Status:** Live in production (Vercel, fra1) · 2026-08-24

## 1. Product Overview

BTEC Brother is an internal operations platform for a team that produces
Pearson BTEC coursework (reports, units, assignments) on behalf of students.
It connects three roles in one workflow:

- **Brokers (وسيط)** — sales/relationship owners. They register client orders,
  publish them to an open task pool, review submitted work, and approve
  completion.
- **Workers (عامل)** — producers. They claim one task at a time from the pool,
  log daily progress, submit the deliverable with Turnitin/AI scores, and
  handle revision requests.
- **Admins (مدير)** — operators. They approve accounts, manage taxonomy,
  monitor finances, settle payouts, and intervene in stuck tasks.

## 2. Goals

| # | Goal | Measure |
| - | ---- | ------- |
| G1 | Single source of truth for every client order | 100% of orders live in the platform, zero side-channel tracking |
| G2 | Fair, transparent 80/20 revenue split | Automatic payout generation on completion; worker balance visible at all times |
| G3 | Zero missed deadlines | Automated Telegram reminders at 24h and 6h before every in-progress deadline |
| G4 | Clean client relationships | Clients CRM with dedupe hints, per-client history, internal notes, CSV export |
| G5 | Financial accountability | Admin ledger with pending/settled balances and one-click settlement |

## 3. Non-Goals

- Public-facing student portal (clients interact with brokers directly).
- Invoicing/tax accounting (payout settlement records only).
- Multi-tenant support (single team workspace).

## 4. User Personas

### P1 — Broker "محمد" (primary persona)
Handles 10–30 active clients. Needs: fast order creation with BTEC presets,
instant answer to "what did this client order before?", a WhatsApp shortcut,
and edit rights on orders that nobody claimed yet. Pain today: duplicate
client records and typos in phone numbers.

### P2 — Worker "يوسف"
Wants exactly one clear active task, a visible countdown, and to be reminded
before deadlines. Claims from an open pool filtered by specialisation, grade,
and academic level (Pass/Merit/Distinction).

### P3 — Admin "أحمد"
Needs the money picture (gross revenue, pending vs settled payouts), the
people picture (who completes what, how fast), and an emergency lever to pull
stuck tasks back into the pool.

## 5. Functional Requirements (summary)

| ID | Requirement | Status |
| -- | ----------- | ------ |
| FR-1 | Email/password + Telegram auth, admin approval gate | ✅ Live |
| FR-2 | Open-pool market with claim/drop atomic RPCs | ✅ Live |
| FR-3 | Daily worker progress notes | ✅ Live |
| FR-4 | Submission with Drive link + Turnitin % + AI % | ✅ Live |
| FR-5 | Broker review: approve → completion + 80/20 payouts | ✅ Live |
| FR-6 | Revision loop with notes and resubmission | ✅ Live |
| FR-7 | Clients CRM (aggregated directory, 8 composable filters, drawer, notes, export) | ✅ Live |
| FR-8 | Duplicate-client detection at order creation | ✅ Live |
| FR-9 | Edit open orders (owner broker/admin, server-guarded) | ✅ Live |
| FR-10 | Deadline reminder bot (24h/6h, Telegram DM) | ✅ Live (cron) |
| FR-11 | Admin reports: monthly revenue, specialisation mix, staff velocity | ✅ Live |
| FR-12 | Realtime market + CRM sync | ✅ Live |

## 6. Constraints

- Arabic-first RTL UI; workers never see client PII.
- Phone numbers are Jordan-centric (+962 normalization for wa.me links).
- Manual DB migrations (SQL Editor), staging-before-production.
