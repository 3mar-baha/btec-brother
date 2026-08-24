# PRIVATE OWNER MANUAL 🔒

> **OWNER-ONLY.** This file contains operational secrets-handling procedures.
> Do not share, screen-share, or paste its contents into issues/PRs/chats.
> Everything here can also be found in git history — treat repo access as
> owner access.

## 1. Admin Bootstrap

The seeded admin account (staging): `admin@btechub.app` / `Password123!`.

Promote any user to admin/broker directly in SQL Editor (production):

```sql
select public.approve_user('<user-uuid>', 'broker');  -- or 'admin' / 'worker'
-- hard role change without approval flow:
update public.users set role = 'admin', is_approved = true where email = '<email>';
```

First-ever admin (fresh project): run `supabase/seed.sql`, then
`supabase/migrations/grant_service_role_and_promote_admin.sql`, or set the
role by hand with the `update` above after the user signs up once.

## 2. Financial Payout Execution (procedure)

1. Open `/admin?tab=finance` → ledger shows each member's
   **الرصيد المعلق** (pending) and **إجمالي المدفوع** (settled).
2. Execute the real-world transfer first (bank app / wallet) for the exact
   pending amount.
3. Click «تسوية المبلغ» on that member's row → enter the transfer reference
   in «مرجع / ملاحظة الدفع» → «تأكيد التسوية».
4. `settle_payout` marks **all** of that member's pending payouts `settled`
   atomically and notifies them on Telegram. The worker's header balance
   updates immediately.
5. Export the ledger CSV (تصدير كشف الحسابات) for bookkeeping after each
   settlement batch.

⚠️ Cancelled orders with already-generated payouts are **not** auto-reversed.
Reverse manually if needed:

```sql
delete from public.payouts where order_id = '<order-uuid>';  -- only if truly wrong
```

## 3. Telegram Bot Management

**Bot identity:** @btechub_team_bot (token in Vercel env `TELEGRAM_BOT_TOKEN`).

**Webhook registration / refresh** (after a token rotation or salt change):

```bash
# compute the secret (must match src/app/api/telegram/webhook/route.ts salt)
node -e "const c=require('crypto');console.log(c.createHash('sha256').update('btec-hub-telegram-webhook:'+process.env.TELEGRAM_BOT_TOKEN).digest('hex'))"

curl "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -d "url=https://<domain>/api/telegram/webhook" \
  -d "secret_token=<computed-secret>"
```

**Token rotation:** BotFather → /revoke → update `TELEGRAM_BOT_TOKEN` in
Vercel → re-register the webhook with the new secret → redeploy.

**User linking:** users generate a one-time code in `/settings` and send
`/start <code>` to the bot; the webhook stores their `telegram_chat_id`.
Check links with:

```sql
select full_name, telegram_chat_id from public.users where telegram_chat_id is not null;
```

**Group notifications:** `TELEGRAM_CHAT_ID` receives new-order announcements.
Test with the `scripts/telegram-test.mjs` helper.

## 4. Cron Verification

```bash
curl -i https://<domain>/api/cron/reminders            # expect 401
curl -s -H "Authorization: Bearer $CRON_SECRET" \
     https://<domain>/api/cron/reminders               # expect {"ok":true,...}
```

Vercel → Cron tab: schedule `35 * * * *`, inspect invocation history/logs.
Reminders only fire for `in_progress` orders inside the 24h/6h windows; the
`reminder_sent_24h/6h` columns make runs idempotent. To re-test a reminder
for a specific order:

```sql
update public.orders set reminder_sent_24h = null, reminder_sent_6h = null
where id = '<order-uuid>';
```

## 5. Environment & Secret Maintenance

| Secret | Where it lives | Rotation |
| ------ | -------------- | -------- |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel + `.env.local`/`.env.staging` | Supabase → Settings → API → rotate; update Vercel + local files |
| `TELEGRAM_BOT_TOKEN` | Vercel + env files | BotFather /revoke → update env → re-register webhook |
| `CRON_SECRET` | Vercel only | Any long random string; rotate freely (Vercel Cron picks it up automatically) |
| `NEXT_PUBLIC_*` | Vercel (build-time) | Any change requires a redeploy |

**Staging isolation:** `.env.staging` points at the staging project — never
merge its values into `.env.local`, and never point Playwright at production.

## 6. Database Access

Migrations are manual (SQL Editor). Staging project ref lives in
`.env.staging` (`uylgrofjixompsexhzpg`). Always: staging → verify →
production, then `notify pgrst, 'reload schema';` if the API cache lags.
