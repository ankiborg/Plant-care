# Resebudget — project guide

Travel-budget PWA for Annika & Jamie (trip: Italien & Schweiz 20–30 July
2026). Lives in `resebudget/` inside the plant-care repo but is a fully
separate app with its own Railway service (Root Directory `resebudget`),
own Postgres and own env vars (`DATABASE_URL`, `APP_PIN`). Same user
conventions as the root CLAUDE.md: Swedish user, PowerShell (`;` not `&&`),
never push to main. App UI text is **Swedish** (unlike the plant app).

## Core idea

Manual entry in under five seconds: category → quick-amount → Spara.
Offline-first is the point — IndexedDB is the client's source of truth,
an outbox queue syncs mutations, `clientId` (UUID) makes sync idempotent.

## Architecture

- `prisma/schema.prisma` — Trip/Category/Expense per spec + FxRate table.
  `Expense.rate` is locked per expense; `clientId @unique` for idempotent
  upserts. `Category.quick` is `Float[]` (Glass has 4.5). Seed is idempotent
  with `update:{}` so in-app edits (budgets, rates) survive redeploys.
- `lib/money.ts` — toSek (round to whole SEK), Swedish formatting (own
  implementation, ` ` thousands separator, decimal comma), parseAmount.
- `lib/numpad.ts` — pure numpad state transition (max 2 decimals, one comma).
- `lib/expense-calc.ts` — applyExpensePatch: keep original rate unless
  currency changes (then use current rate); always recompute amountSek.
  Shared by PATCH route and client.
- `lib/idb.ts` — IndexedDB stores: `expenses` (key clientId, tombstones via
  `deleted`), `outbox` (one entry per clientId, op "upsert"|"delete" — newer
  ops replace older, which coalesces edits), `meta` (bootstrap cache).
- `lib/sync.ts` — flush outbox (upsert→POST /api/expenses, delete→DELETE),
  then pull /api/trip/active into IDB. Single-flight; 401→redirect login
  (guarded on /login); 4xx drops the entry (won't ever succeed), 5xx/network
  keeps it. `idbRemoveOutbox` checks queuedAt so ops queued mid-request survive.
- `components/trip-provider.tsx` — context all pages use; reads only from
  IDB, computes spentSek per category client-side. Sync triggers: mount,
  online event, visibilitychange, 30s interval, after every mutation.
  Undo delete = `restoreExpense(copy)` — the UI keeps the copy because the
  IDB record is cleaned up as soon as the delete syncs.
- Auth: shared PIN in `APP_PIN` env; middleware compares `rb_auth` cookie to
  sha256 of the PIN (Web Crypto — must work in edge middleware). `rb_payer`
  cookie is client-readable and switchable in entry view + settings.
- API: GET /api/trip/active (everything in one pull), POST /api/expenses
  (idempotent upsert), PATCH/DELETE /api/expenses/:id (:id = db id or
  clientId), POST/PATCH/DELETE /api/categories (delete with ?moveTo= when it
  has expenses), PATCH /api/rates, POST/DELETE /api/auth.
- UI: entry view is one screen, no scroll at ~700px (Playwright-checked).
  Progress bars live inside the category buttons; total card collapses.
  Fonts via @fontsource-variable (bundled, offline-safe): Space Grotesk for
  numbers (`.num` class, tabular-nums), DM Sans for text. Swedish UI text.
- PWA: `app/manifest.ts` + `public/sw.js` (network-first navigations,
  cache-first static, never touches /api/, never caches redirected responses).

## Verify before pushing

`npx vitest run` (27 tests), `npm run build`, and the Playwright flow in the
session scratchpad (login → add expense → history → edit → delete/undo →
settings → offline queue test) against a local prod server on :3100
(local Postgres db `resebudget`, see root CLAUDE.md for the password-reset
gotcha after container restarts).

## Out of scope (spec says never build)

Bank/PSD2 integration, receipt photos, who-owes-whom, charts beyond the
bars, more users than A/J, push notifications.
