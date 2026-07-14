# Resebudget

PWA för att följa reseutgifter mot budget. Byggd för Annika & Jamie inför
Italien/Schweiz 20–30 juli 2026. Manuell inmatning på under fem sekunder:
välj kategori → tryck snabbelopp → Spara. Funkar helt offline — utgifter
köas i telefonen och synkas när nätet kommer tillbaka.

## Deploy till Railway

Appen ligger i mappen `resebudget/` i plant-care-repot och deployas som en
**egen Railway-tjänst** (den rör inte växtappen):

1. I Railway-projektet: **New → Database → PostgreSQL** (en egen databas för
   resebudgeten — dela inte växtappens).
2. **New → GitHub Repo** → välj `ankiborg/Plant-care`.
3. På den nya tjänsten under **Settings**:
   - **Root Directory**: `resebudget`
   - (valfritt) **Watch paths**: `resebudget/**`
4. Under **Variables**:
   - `DATABASE_URL` → referens till den nya Postgres-tjänsten
     (`${{Postgres.DATABASE_URL}}`)
   - `APP_PIN` → er hemliga PIN-kod, t.ex. `4711`
5. Deploya. `npm start` kör `prisma migrate deploy` + seed automatiskt, så
   resan och kategorierna finns direkt.
6. Öppna URL:en på mobilen, logga in med PIN, välj vem du är, och lägg till
   på hemskärmen ("Lägg till på startskärmen") så blir det en riktig app.

## Köra lokalt (Windows 11 / PowerShell)

```powershell
cd resebudget; npm install
Copy-Item .env.example .env   # fyll i DATABASE_URL + APP_PIN
npx prisma migrate deploy; npm run seed
npm run dev
```

Tester: `npx vitest run`

## Bra att veta

- **Kurser** är låsta per utgift. Ändras kursen i inställningarna påverkas
  bara nya utgifter.
- **Offline**: utgifter sparas i telefonens IndexedDB och synkas via en
  outbox-kö (idempotent på `clientId` — inga dubbletter även om samma post
  skickas flera gånger). "N väntar på synk" visas uppe till vänster tills
  allt är framme.
- **Payer** byts i inställningarna eller direkt i inmatningsvyn (Annika/Jamie-
  knappen) — ingen ny inloggning behövs.
- **Ta bort kategori** med utgifter: appen erbjuder att flytta utgifterna
  till Övrigt först.
- Efter en ny deploy kan en gammal service worker visa en inaktuell version —
  stäng appen helt och öppna igen, eller "Rensa webbplatsdata" om det strular.
