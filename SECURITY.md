# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in BTEC Brother, please report it
responsibly. Do **not** open a public issue.

Email the maintainer directly with a description of the issue, steps to
reproduce, and (if possible) a suggested fix. Please allow a reasonable window
for a fix to be prepared before any public disclosure.

## Scope

In-scope examples:

- Authentication / authorization bypass
- Row Level Security (RLS) gaps that expose data across roles
- Exposure of the Supabase service-role key or Telegram bot token
- Server-side request forgery, injection, or other OWASP Top 10 issues

Out of scope:

- Issues already documented in this repository
- Denial-of-service attacks against a locally run development instance

## Secure-development notes

- The Supabase **service-role key** and **Telegram bot token** are server-only
  and must never appear in client code or be committed to version control.
- Real `.env` files (`.env.local`, `.env.staging`) are gitignored. If you believe
  a secret has been committed, rotate it in Supabase / BotFather immediately.
