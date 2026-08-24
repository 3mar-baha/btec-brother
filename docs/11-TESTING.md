# 11 — Testing

## 1. Test Pyramid

| Layer | Runner | Location | Environment |
| ----- | ------ | -------- | ----------- |
| Unit | `node --test` (native TS type-stripping) | `tests/unit/*.test.ts` | none |
| E2E | Playwright (Chromium, 1 worker) | `tests/e2e/*.spec.ts` | **staging** Supabase via `.env.staging` |
| CI | GitHub Actions | `.github/workflows/ci.yml` | lint + typecheck + unit |

**Never run E2E against production.** `playwright.config.ts` and
`tests/e2e/helpers.ts` load `.env.staging` exclusively.

## 2. Commands

```bash
node --test "tests/unit/*.test.ts"   # unit (no env needed)
npx playwright install               # first run only
npm run test:e2e                     # full E2E suite (needs .env.staging)
npm run lint && npx tsc --noEmit     # static gates
npm run build                        # production build check
```

## 3. Unit Suites

- `tests/unit/aggregate.test.ts` — clients-CRM core logic: phone-key
  normalization, wa.me link building (+962 rules), grouping, composable
  filters (grade/criteria/activity/search), empty-result safety, all four
  sort keys. **5 tests.**

## 4. E2E Suites (24 tests)

| Spec | Coverage |
| ---- | -------- |
| `auth.spec.ts` | unauthenticated redirect with `redirectedFrom`, admin login landing, wrong-password toast |
| `clients.spec.ts` | CRM access control (anon → login, worker → market, nav visibility), stat cards, aggregation math, omni-search + URL sync, school/grade/criteria filter composition, activity filter, sorting, drawer timeline + badges + wa.me href, order-form prefill, admin broker filter, admin cannot create orders |
| `dashboard.spec.ts` | directory rendering, admin exclusion from stats, un-inflated earnings, role-based market controls |
| `workspace.spec.ts` | daily update posting, settled header balance, balance update after navigation |
| `revisions.spec.ts` | full loop: broker requests revision (notes) → status `revision` → worker resubmits with updated Turnitin/AI → `submitted`, scores persisted |
| `settlements.spec.ts` | seeded completed order with pending 80/20 payouts → admin settles worker from ledger → payout `settled`, header balance reflects total |

### Determinism rules
- Specs seed their own fixtures through the **service-role key**
  (`beforeAll`) and delete them (`afterAll`) — staging is never polluted.
- Multi-role specs call `page.context().clearCookies()` between logins.
- Cards/rows are targeted by seeded title/name, not positional order.

## 5. Regression Gates (required before every merge)

1. `npm run lint` — 0 errors, 0 warnings
2. `npx tsc --noEmit` — 0 type errors
3. `node --test "tests/unit/*.test.ts"` — all pass
4. `npm run build` — all routes compile
5. `npm run test:e2e` — 24/24 against staging
6. GitHub Actions CI green on the PR/push
