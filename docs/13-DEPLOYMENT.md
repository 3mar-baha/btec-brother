# 13 — Deployment

## 1. Topology

| Piece | Where | Notes |
| ----- | ----- | ----- |
| Web app | Vercel, region `fra1` | auto-deploy on push to `main` |
| Database/Auth/Realtime/Storage | Supabase (production project) | manual SQL migrations |
| Staging Supabase | separate project (ref in `.env.staging`) | E2E target only |
| Cron | Vercel Cron → `GET /api/cron/reminders`, hourly (`35 * * * *`) | `CRON_SECRET` bearer |
| Repo | `github.com/3mar-baha/betc-brother` | CI: lint + typecheck + unit |

## 2. Environment Variables (Vercel project settings)

All seven app variables plus the two operations variables:

```
CRON_SECRET=<long random string>
NEXT_PUBLIC_APP_URL=https://<production-domain>
```

`NEXT_PUBLIC_*` values are baked at build time — changing them requires a
redeploy.

## 3. Database Migration Procedure

1. Write the migration under `supabase/migrations/<name>.sql` (idempotent:
   `if not exists` / `drop … create`).
2. Mirror the change in `supabase/schema.sql` (canonical) and
   `src/types/database.types.ts`.
3. Apply in the **staging** project SQL Editor → run E2E.
4. Apply to **production** SQL Editor.
5. If the API schema cache lags: `notify pgrst, 'reload schema';`

## 4. Cron Verification (post-deploy)

```bash
# unauthorized → must return 401
curl -i https://<domain>/api/cron/reminders

# authorized → {"ok":true,"sent24":N,"sent6":M}
curl -s -H "Authorization: Bearer $CRON_SECRET" \
  https://<domain>/api/cron/reminders
```

Vercel dashboard → project → Cron tab shows the hourly schedule and recent
invocations.

## 5. Deploy Checklist

- [ ] CI green on `main`
- [ ] Migrations applied to production
- [ ] `CRON_SECRET` + `NEXT_PUBLIC_APP_URL` present in Vercel env
- [ ] Smoke: login → market → clients → admin reports render
- [ ] Cron returns 200 with the bearer, 401 without

## 6. Rollback

Redeploy the previous build from the Vercel dashboard (instant). Database
migrations are additive (`if not exists`) and do not require reversal; any
reversal is a new forward migration.
