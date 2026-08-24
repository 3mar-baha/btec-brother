# CLAUDE.md — BTEC Brother

## Commit attribution (STRICT, PERMANENT)

NEVER append "Co-authored-by: Claude", "Co-authored-by: Claude Code",
"Generated with Claude Code", or any other AI attribution trailer to commit
messages in this repository. Commit messages contain only the human team's
attribution ("Madaa Team") and the change description.

## Project

BTEC Brother (بِتيك براذر) — Arabic-first RTL platform for managing BTEC
assignment orders. Next.js 14 App Router + Supabase (Postgres/Auth/RLS/
Realtime) + Telegram notifications, deployed on Vercel.

- Brand color: crimson `#BB1928` (`--brand` in `globals.css`) — never orange.
- Workers must never receive client contact data (PII); role guards live in
  Server Components and RLS, never in UI hiding alone.
- DB migrations are applied manually in the Supabase SQL Editor: staging
  project first, verify e2e, then production. Follow with
  `notify pgrst, 'reload schema';` if the API cache lags.
- Quality gates before every push: `npm run lint`, `npx tsc --noEmit`,
  `node --test "tests/unit/*.test.ts"`, and `npm run test:e2e` against
  staging (never production).
