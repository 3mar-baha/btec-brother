# 05 — Data Model

Canonical schema: [`supabase/schema.sql`](../supabase/schema.sql) (mirrors the
live database; incremental changes in `supabase/migrations/`). TypeScript
mirror: `src/types/database.types.ts`.

## 1. Tables

### users
| Column | Type | Notes |
| ------ | ---- | ----- |
| id | uuid PK | = `auth.users.id` |
| email | text | |
| full_name | text | |
| role | user_role | `admin \| broker \| worker` |
| phone_number | text null | |
| avatar_url | text null | |
| is_active | bool | soft-disable flag |
| is_approved | bool | approval gate |
| requested_role | user_role | signup request |
| telegram_chat_id / telegram_username | null | linked bot identity |

### orders
| Column | Type | Notes |
| ------ | ---- | ----- |
| id | uuid PK | |
| order_number | int | human sequence |
| broker_id | uuid → users | owner |
| worker_id | uuid null → users | assigned on claim |
| title / unit_title / assignment_name | text | |
| client_name / client_phone | text | **PII — staff queries only** |
| client_school | text null | |
| specialisation_id / grade_id / criteria_id | int → lookup tables | |
| total_price | numeric | worker_share = 80%, broker_share = 20% |
| deadline | timestamptz | |
| status | order_status | `open in_progress submitted revision completed cancelled` |
| completed_at | timestamptz null | |
| submission_url / plagiarism_rate / ai_percentage / revision_notes | null | review data |
| reminder_sent_24h / reminder_sent_6h | timestamptz null | cron idempotency flags |
| created_at | timestamptz | |

### client_notes
| Column | Type | Notes |
| ------ | ---- | ----- |
| id | uuid PK | |
| client_phone | text | **normalized digits key** (same key as CRM grouping/dedupe) |
| author_id | uuid → users | FK cascade |
| content | text | |
| created_at | timestamptz | |

Index: `idx_client_notes_phone`. Notes are immutable (no UPDATE policy).

### payouts
`order_id`, `user_id`, `amount`, `share_type (worker|broker)`,
`status (pending|settled)`, `created_at`. Generated 80/20 on completion.

### Supporting tables
`order_attachments` (storage metadata), `daily_updates` (worker progress),
`activity_logs` (audit trail: order_id, actor_id, action, details),
`reviews`, `telegram_link_tokens` (one-time link codes),
`specialisations` / `grade_levels` / `criteria_levels` (admin-managed
taxonomy; criteria carry P/M/D codes).

## 2. Row Level Security (all tables enabled)

| Table | SELECT | WRITE |
| ----- | ------ | ----- |
| users | authenticated | own profile update; admin all |
| orders | authenticated where `status='open' OR broker_id=uid OR worker_id=uid OR is_admin()` | via RPCs (RLS update policy exists as defense-in-depth) |
| client_notes | admin/broker | insert: author = self + staff; delete: author or admin |
| payouts | own rows (admin all) | service/admin only |
| activity_logs | participants | insert: actor participates in the order |
| order_attachments / daily_updates | participants | participants |
| taxonomy tables | authenticated | admin |

## 3. RPC Contracts (security-critical)

| RPC | Guard inside the function |
| --- | ------------------------- |
| `claim_order(p_order_id)` | approved+active worker, no active task, order still open |
| `drop_order(p_order_id, p_reason?)` | owner worker or admin; returns order to pool |
| `submit_order_solution(p_order_id, p_url, p_plagiarism?, p_ai?)` | assigned worker, status in_progress or revision |
| `request_revision(p_order_id, p_notes)` | owning broker, status submitted |
| `approve_and_complete_order(p_order_id)` | owning broker, status submitted → completed + 80/20 payouts |
| `settle_payout(p_user_id, p_note?)` | admin; row-locked settlement of all pending payouts |
| `update_open_order(p_order_id, …7 fields)` | owner broker or admin **and** `status='open'`; validates required fields, price > 0, deadline in future; writes an `edit` activity log |
| `approve_user / reject_user` | admin only |
| `directory_stats()` | team + client stats aggregation |

## 4. Triggers & Sequences

- `order_number` sequence per insert.
- `updated_at`-style triggers are not used; `activity_logs` provides history.
- Telegram linking uses one-time tokens with expiry (no trigger needed).
