# 🪴 Plant Care

Personal plant-care app: plant collection, a rules-based care-scheduling
engine, a Today task view, photo timelines, installable Android PWA, and
daily ntfy.sh reminders that deep-link to the plant that needs attention.

**Stack:** Next.js (App Router, TypeScript) · Prisma + PostgreSQL · Tailwind ·
Railway (EU) · Cloudinary (photos) · ntfy.sh + GitHub Actions (reminders).
Single-user, no auth.

---

## Setup (Windows 11 / PowerShell)

1. Clone and install:

   ```powershell
   git clone https://github.com/ankiborg/Plant-care.git ; cd Plant-care ; npm install
   ```

2. Copy the env template and fill it in (see the table below):

   ```powershell
   Copy-Item .env.example .env
   ```

3. Create the database tables and seed ~15 species:

   ```powershell
   npx prisma migrate deploy ; npm run seed
   ```

4. Run it:

   ```powershell
   npm run dev
   ```

Run the engine's unit tests any time with `npm test`.

## Environment variables — what goes where

| Variable | Railway (app service) | GitHub repo secrets | Local `.env` | What to paste |
|---|---|---|---|---|
| `DATABASE_URL` | ✅ (use `${{Postgres.DATABASE_URL}}` reference) | — | ✅ (use the **public** URL from the Postgres service's Variables tab) | Railway → Postgres service → Variables |
| `CLOUDINARY_URL` | ✅ | — | ✅ | Cloudinary dashboard → API Keys → "API environment variable" |
| `NTFY_TOPIC` | ➖ optional | ✅ | ✅ | A long random string **you invent** — the topic name is the secret. Subscribe to the same topic in the ntfy Android app. The **GitHub secret** is the one the daily reminders use; Railway only needs it if you send from the app (see below). |
| `APP_URL` | ➖ (recommended) | ✅ | ✅ | Your Railway public URL, e.g. `https://plant-care-production.up.railway.app` (no trailing slash). On Railway it falls back to the injected `RAILWAY_PUBLIC_DOMAIN`; without either, reminders still arrive, just without a tap-through link. |
| `NTFY_SERVER` | ➖ optional | — | ➖ optional | Only if you self-host ntfy. Defaults to `https://ntfy.sh`. |
| `CRON_SECRET` | ✅ | ✅ | ✅ | Another long random string you invent |

Generate a random string in PowerShell:

```powershell
-join ((48..57)+(97..122) | Get-Random -Count 40 | % {[char]$_})
```

## Deploying on Railway (EU)

1. New project → **Deploy from GitHub repo** → pick this repo (region: EU).
2. Add a **PostgreSQL** service to the same project.
3. On the app service, set the variables from the table above.
   For `DATABASE_URL` use Railway's variable reference so it wires to the
   internal network: `${{Postgres.DATABASE_URL}}`.
4. Set the app service's **custom start command** so migrations run on every
   deploy: `npx prisma migrate deploy && npm run start`
   (this runs on Railway's Linux builder, so `&&` is correct there).
5. First deploy only — seed the species list from your machine against the
   public DB URL:

   ```powershell
   npm run seed
   ```

## The scheduling engine (`lib/schedule.ts`)

Pure module, no DB calls. Watering:

```
interval = round(baseWaterDays × potFactor × soilFactor × lightFactor × seasonFactor)
```

All multiplier tables are named constants at the top of `lib/schedule.ts` —
tune them there. Seasons (Sweden): Apr–Sep growing ×1.0 · Mar/Oct shoulder
×1.2 · Nov–Feb dormant ×1.5. Fertilizing is season-gated: never scheduled in
Nov–Feb (due dates landing there are pushed to Mar 1), 1.5× interval in
shoulder months. "Last watered/fertilized" is always derived from `CareLog`
history (fallback: `acquiredAt`) — there is deliberately no `lastWatered`
column.

Note: day boundaries are computed in UTC (Railway's clock). For Sweden that
means "today" flips at 01:00/02:00 local time, which is fine for plant care.

## Installing on Android (PWA)

Open the Railway URL in Chrome → ⋮ menu → **Add to home screen** → Install.
It launches standalone (no browser chrome) with its own plant icon.
Notification deep links open `/plants/<id>` inside the installed app.

## Daily reminders (ntfy.sh)

The app decides *who* needs watering; the GitHub runner *sends* the
notifications. That split is not decoration: Railway's network cannot open a
connection to ntfy.sh at all (`connect ETIMEDOUT` on 443, and no IPv6 route),
so a reminder sent from the app never arrives. The runner has no such problem.

- `POST /api/cron/reminders?mode=prepare` (header `x-cron-secret: $CRON_SECRET`)
  computes due tasks with the same engine and returns the ready-made
  notifications — **without** the topic, and without sending anything:

  ```json
  {"plants":3,"due":2,"notifications":[{"title":"💧 Water: …","message":"…","tags":["potted_plant"],"click":"https://…/plants/abc"}],"failures":[]}
  ```

- `.github/workflows/plant-reminders.yml` calls it daily at **07:00 UTC**, adds
  the topic from the `NTFY_TOPIC` repo secret and POSTs each notification to
  ntfy (also runnable manually via *Actions → plant-reminders → Run workflow*).
  It never prints the payloads — they contain plant nicknames and the Actions
  log is public.
- Overdue plants ping again every day until you mark the task done — by design.
- `POST /api/cron/reminders` with no `mode` still sends from the app itself
  (one ntfy notification per due plant, retried, with an IPv4-pinned fallback
  when `fetch` fails at the network layer). Usable if the app ever moves
  somewhere with working egress to ntfy; needs `NTFY_TOPIC` on the app service.
- What the status codes mean when a run goes red:

  | Status | Meaning | Fix |
  |---|---|---|
  | `401` | `CRON_SECRET` in GitHub ≠ `CRON_SECRET` on Railway | Re-paste the same string in both places |
  | `500` | Database unreachable, or (send mode) `NTFY_TOPIC` missing on the app service | Check the app service's Variables tab in Railway |
  | `502` | (send mode) ntfy rejected or never received **every** notification | Read the `failures` in the body — it names the connection error |
  | `200` | The app answered; the workflow log then reports how many notifications went out | — |

- `GET /api/cron/reminders` (same secret header) is a config check: it reports
  whether `NTFY_TOPIC`/`APP_URL` are set, whether the database answers, and
  whether ntfy is reachable from the app over each transport
  (`ntfyReachable`), **without sending anything**. The workflow calls it
  automatically when the app won't answer, so the Actions log shows why.

> ⏰ **Timezone caveat:** GitHub cron is UTC and ignores DST. `0 7 * * *` ≈
> 08:00 in Swedish winter and 09:00 in Swedish summer. Edit the cron hour in
> the workflow if you want a different time — it will not auto-adjust for DST.

On your phone, install the [ntfy app](https://ntfy.sh/) and subscribe to your
`NTFY_TOPIC`. Anyone who knows the topic name can read it, so keep it long and
random — the topic **is** the secret.

## Out of scope so far

AI plant ID/diagnosis, before/after photo slider + ghost-overlay framing,
weather-adjusted watering, auth/multi-user, per-plant reminder times.
