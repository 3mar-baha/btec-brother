# Contributing

Thanks for contributing to BETC Brother. Keep it small, correct, and tested.

## Setup

```bash
git clone https://github.com/3mar-baha/betc-brother.git
cd betc-brother
npm install
cp .env.example .env.local   # fill in your Supabase + Telegram values
npm run dev
```

Database setup and environment variables are documented in the [README](README.md).

## Workflow

1. Branch from `main` — pushing to `main` deploys to production via Vercel.
2. Follow [conventional commits](https://www.conventionalcommits.org) (`feat: …`, `fix(db): …`,
   `chore: …`, `docs: …`), as used throughout the history.
3. Open a PR using the provided template; CI must pass (lint, typecheck, unit tests).

## Quality gates (all required before merge)

```bash
npm run lint                  # 0 errors
npm run typecheck             # 0 errors
node --test tests/unit/       # unit suites pass
npm run test:e2e              # Playwright, against STAGING only (needs .env.staging)
```

## Conventions

- **Arabic-first RTL UI.** New user-facing strings are Arabic; use logical CSS properties
  (`ps/pe`, `start/end`, `text-start`) rather than left/right.
- **Server-side role guards.** Any new page must enforce its role rules in the Server
  Component (see `src/app/(dashboard)/clients/page.tsx` for the pattern) — never rely on
  hiding UI alone. Workers must never receive client contact data.
- **Pure logic stays testable.** Aggregation/filter/sort logic lives in framework-free
  modules (`src/components/clients/aggregate.ts` style) with a `node --test` suite in
  `tests/unit/`.
- **Secrets never leave the server.** `SUPABASE_SERVICE_ROLE_KEY` and `TELEGRAM_BOT_TOKEN`
  are server-only; `.env*` files are gitignored.

## Database changes

1. Add an idempotent migration file under `supabase/migrations/` and mirror it in
   `supabase/schema.sql` (and `setup.sql` when relevant).
2. Migrations are applied **manually** in the Supabase SQL Editor — apply to **staging
   first**, verify e2e, then production. Note in the PR which files reviewers must run.
3. After applying, run `notify pgrst, 'reload schema';` if the API schema cache lags.
