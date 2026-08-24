# 06 — API Specification

BTEC Brother has no custom REST layer: the browser talks to **Supabase
PostgREST** (RLS-scoped) and **Postgres RPCs**; the server exposes route
handlers only where secrets or webhooks are involved.

## 1. Route Handlers (Next.js)

### `POST /api/auth/register`
Creates an auth user + `users` row (`requested_role`, `is_approved=false`).
Public. Rate-limited by Supabase Auth.

### `GET|POST /api/auth/telegram`
Telegram OAuth widget callback — signs the user in via a Telegram-validated
payload (hash check against `TELEGRAM_BOT_TOKEN`).

### `POST /api/auth/telegram/link` · `POST /api/auth/telegram/unlink`
Authenticated. Link consumes a one-time token from
`telegram_link_tokens` (issued in Settings) and stores the sender's
`telegram_chat_id`. Unlink clears it.

### `POST /api/telegram/webhook`
Telegram → platform. Verified via `x-telegram-bot-api-secret-token`
(SHA-256 of `btec-hub-telegram-webhook:${TELEGRAM_BOT_TOKEN}` — internal
salt, changing it requires re-registering the webhook). Handles
`/start <token>` deep links; everything else is acked with 200 and ignored.

### `GET /api/cron/reminders`
Vercel Cron (hourly). Requires `Authorization: Bearer ${CRON_SECRET}`
→ 401 otherwise.

**Behavior:** scans `orders` where `status='in_progress'` and
`now() < deadline <= now()+24h`. For each order:
- `deadline <= now()+6h` and `reminder_sent_6h is null` → urgent DM to
  worker + broker, sets `reminder_sent_6h` (and `reminder_sent_24h` if unset).
- else if `reminder_sent_24h is null` → 24h DM, sets `reminder_sent_24h`.

**Response:** `{ ok: true, sent24: number, sent6: number }`.

## 2. RPC Endpoints (Postgres functions, called via `supabase.rpc`)

All return `jsonb` `{ success, message, … }` and raise Postgres exceptions
(`P0001…P0004`, Arabic messages) on violation. Full guards in
[05-DATA-MODEL](05-DATA-MODEL.md#3-rpc-contracts).

| Signature | Caller | Effect |
| --------- | ------ | ------ |
| `claim_order(p_order_id uuid)` | worker | assign self, `open→in_progress` |
| `drop_order(p_order_id, p_reason?)` | worker/admin | release to pool |
| `submit_order_solution(p_order_id, p_url, p_plag?, p_ai?)` | worker | `in_progress|revision→submitted` |
| `request_revision(p_order_id, p_notes)` | owning broker | `submitted→revision` |
| `approve_and_complete_order(p_order_id)` | owning broker | `submitted→completed`, 80/20 payouts |
| `settle_payout(p_user_id, p_note?)` | admin | all pending payouts → settled |
| `update_open_order(p_order_id, p_client_name, p_client_phone, p_client_school, p_title, p_unit_title, p_assignment_name, p_total_price, p_deadline)` | owning broker/admin | edits an `open` order only |
| `approve_user(p_user_id, p_role?)` / `reject_user(p_user_id)` | admin | approval gate |
| `directory_stats()` | authenticated | team + collaboration matrix |

## 3. PostgREST Conventions (application-side)

- Reads: `.select()` with explicit column lists — never `*` on `orders`
  (keeps PII out of worker payloads).
- Market pagination: `.range(page*50, page*50+49)` + `{ count: 'exact' }`.
- Realtime: `postgres_changes` on `public.orders` (INSERT/UPDATE/DELETE).
- Storage: `order-attachments` bucket, public read, authenticated upload,
  path `${order_id}/${filename}`.
