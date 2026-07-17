# Plant-care — project guide

Personal plant-care PWA for Annika (Swedish, non-developer, on Windows 11 +
PowerShell — give her `;`-separated commands, never `&&`). She often writes in
Swedish; reply in the language she uses. App UI text is English.

## Workflow (important)

- Develop on branch `claude/plant-app-build-error-0pl2q7`, push there only.
- **Never merge or push to main** — Annika merges PRs herself in the GitHub UI
  (saves credits). Just push the branch and tell her to merge.
- Railway auto-deploys main on merge. `npm start` runs
  `prisma migrate deploy` + the seed before `next start`, so migrations and
  seed updates apply automatically on every deploy (seed is idempotent —
  upserts by commonName). No manual seeding needed.
- Verify before pushing: `npx vitest run` (21+ tests), `npm run build`, and for
  UI work a Playwright check against a local prod server
  (`/opt/pw-browsers/chromium`, local Postgres 16: `service postgresql start`,
  db `plantcare`, user/pass `postgres`; container restarts wipe the postgres
  password — re-set with `su postgres -c "psql -c \"ALTER USER postgres PASSWORD 'postgres';\""`).

## Stack

Next.js 15 App Router + TS + React 19, Tailwind v4 (@theme tokens in
`app/globals.css`), Prisma 6 + Postgres (Railway EU), Cloudinary photos,
Claude vision (`claude-opus-4-8`) for species ID + health diagnosis, PWA
(manifest.ts + public/sw.js), ntfy.sh reminders via GitHub Actions cron
(07:00 UTC → `/api/cron/reminders`, guarded by `x-cron-secret`).

Env vars (Railway app service): `DATABASE_URL`, `CLOUDINARY_URL`,
`ANTHROPIC_API_KEY`, `NTFY_TOPIC`, `APP_URL` (public URL, not
`.railway.internal`), `CRON_SECRET`.

## Architecture

- `lib/schedule.ts` — care engine: interval = round(base × pot × soil × light
  × season). Seasons (Sweden): GROWING Apr–Sep ×1.0, SHOULDER Mar/Oct ×1.2,
  DORMANT Nov–Feb ×1.5. No fertilizing Nov–Feb (pushed to Mar 1). UTC day math.
- `lib/care.ts` — next-due/last-done helpers ("last watered" falls back to
  `acquiredAt`).
- `lib/actions.ts` — all server actions. Photo paths never throw: they return
  `{status:"error", message}` states with distinct messages for missing vs
  broken `CLOUDINARY_URL`. 8 MB photo cap (`lib/photo-limits.ts`, checked
  client + server). Body limit raised to 20 MB in `next.config.ts`.
- `lib/vision.ts` — diagnosePlant / suggestPlants (open-ended
  ranked ID, prose fields default Swedish via `InfoLanguage` param), JSON-schema
  output, returns `{error}` instead of throwing. Tests mock `@anthropic-ai/sdk`
  and need `vi.resetModules()` (module caches the client).
- `lib/image-resize.ts` — client-side downscaling of oversized photos (>7 MB →
  2048px JPEG) before upload, used by all three photo inputs (identify,
  add-plant identify, gallery). Files under the threshold pass through
  untouched; undecodable files fall back to the original + normal size check.
- `app/identify/identify-loading.tsx` — animated sprout + rotating quips
  (`LOADING_MESSAGES`, English) shown while identification runs; keyframes in
  globals.css, honors `prefers-reduced-motion`.
- `lib/wikipedia.ts` — pure helpers for example photos on `/identify`: summary
  URL builder + image extraction. Fetched client-side (sv → en fallback,
  illustrated SVG as last resort); sandbox blocks Wikimedia so only the
  fallback path is verifiable locally.
- `prisma/seed.ts` — 17 species, upserts by `commonName` (never rename a
  commonName — add new entries or edit notes only).
- `lib/species-art.ts` + `public/species/*.svg` — 18 illustrated species
  images (commonName → file, fallback `generic.svg`), shown wherever a plant
  has no photo. Generator script lives in session scratchpad only.
- Design system "Fern": tokens in globals.css, dark mode via
  `prefers-color-scheme` + `:root[data-theme]` override (pre-paint script in
  layout.tsx). Fonts Fraunces + Inter via next/font.
- `AppSettings` model (single row, id "app") + `/settings` page (gear icon in
  TopBar): `homeLocation` + `hardinessZone` (växtzon 1–8, `lib/settings.ts`
  parser). When set, `suggestPlants` gets a `home` param → prompt + schema gain
  `suitability`/`plantingTips` per suggestion (maxTokens 3072); fields flow
  into the identify sheet ("At my place"/"Planting") and are stored on saved
  plants. Without settings the fields are absent and the sheet links to
  /settings.
- `lib/saved-plants.ts` + `SavedPlant` model — plants saved from Identify
  into three categories (GARDEN/WISHLIST/SPOTTED, labels + `parseSavedCategory`
  in the lib). Actions: `saveIdentifiedPlant` / `updateSavedPlant` /
  `deleteSavedPlant`. No care schedule — knowledge entries only.
- Nav is 4 tabs: Today, Plants, Garden, Identify. No Add tab — adding lives
  as the "+ Add plant" button on `/plants` (tab stays active on `/plants/new`).
- Screens: `app/page.tsx` Today (due tasks), `app/plants` grid with `?room=`
  filter chips, `app/plants/[id]` detail (care log, photos + compare mode,
  AI diagnose, edit), `app/plants/new` (species picker `species-field.tsx`
  links to /identify for AI identification; `app/location-field.tsx` place
  dropdown; `?speciesId=` preselects the species), `app/garden` (saved plants grid with
  `?cat=` chips; `app/garden/[id]` detail with `wiki-gallery.tsx` — shared
  hero + thumbnail strip + fullscreen, also used by the identify sheet —
  category/note edit + delete), `app/identify` (photo → up to 3
  ranked suggestions with Wikipedia photos + sv/en/latin names; matched seeded
  species link to `/plants/new?speciesId=`; camera/gallery buttons auto-start
  identification; tapping a card opens `plant-detail-sheet.tsx` — bottom sheet
  with Wikipedia media-list gallery + fullscreen images; `IdentifyClient` has
  an `initialState` prop as a UI-test hook).

## Gotchas

- Species select state lives in `species-field.tsx`; location dropdown is
  `app/location-field.tsx` (existing places + "New place…" text input).
- After redeploys stale service workers can 404 chunks → tell her: unregister
  SW / clear site data / hard reload.
- Sandbox egress proxy blocks ntfy.sh, Wikimedia, Cloudinary — code that
  calls them can only be verified for error paths locally.
- `pkill` matches your own shell; kill next servers via
  `ps -eo pid,args | grep "[n]ext"` loop instead.
