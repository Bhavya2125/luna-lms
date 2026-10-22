# Luna Wave LMS

Internal system for Luna Wave: colleges (fest deals), sponsors, and the artist roster in one pipeline. One Next.js app serves the web version and the installable PWA (home-screen app, offline reading, push alerts).

## What's in it

- **Colleges**: list and board, filters, CSV import, assignment, six-stage pipeline (Reach Out → Initial Connect → Requirements Received → Rates Proposed → Locked / Lost), stage history, notes, and per-year history of artists, production and sponsors (with travel & stay tracking).
- **Sponsors**: companies appear automatically from college sponsor history. One deal pipeline per college, board view, multiple contacts, exclusivity, outreach log.
- **Roster**: artists with multiple contacts and designations, crew size, tech and hospitality rider links, and shows from college history plus ones added by hand.
- **Settings**: theme, push alerts, install, change password, and (Admin and Super Admin) the team; Super Admin creates, edits and revokes accounts.
- **Alerts**: one month before each fest, in the app and as push notifications.

### Rules enforced on the server

| Rule | Who |
| --- | --- |
| Sees only assigned colleges (and their deals) | Executive |
| Artist contacts, rates and fees are hidden | Executive |
| Moves deals forward only; cannot reopen Locked or Lost | Executive |
| Moves deals backward, reopens, assigns colleges, imports CSV | Admin, Super Admin |
| Creates users, changes roles, resets passwords, revokes access | Super Admin |
| Moving to **Rates Proposed** needs a proposed artist or production rate | everyone |
| Moving to **Locked** needs a final amount and deliverables (colleges and sponsor deals) | everyone |
| Sponsor **Proposal Sent** needs the quoted amount; **Lost** needs a reason | everyone |

At least one active Super Admin always remains. Revoking a user ends their sessions immediately.

## Stack

Next.js 16 (App Router) · TypeScript · Postgres via Drizzle ORM · session cookies stored in the database · bcrypt · Zod · SWR · hand-written service worker.

## Run it locally

```bash
npm install
cp .env.example .env.local     # set SEED_PASSWORD; leave DATABASE_URL empty
npm run db:seed                # demo data and four demo accounts
npm run dev                    # http://localhost:3000
```

With no `DATABASE_URL`, development uses an embedded Postgres (PGlite) stored in `.data/`. Delete that folder to start over.

Demo accounts (all use `SEED_PASSWORD`): `aarav` Super Admin, `isha` Admin, `rohan` and `meera` Executives.

## Deploy (Render + Neon)

The pages and the API are one Next.js app, so it runs as a single Render web service. The database is Neon Postgres.

1. **Neon**: create a project (region: Singapore / `aws-ap-southeast-1`). From **Connect**, copy two connection strings: the **pooled** one (host contains `-pooler`) for `DATABASE_URL` and the **direct** one for `DIRECT_DATABASE_URL`. Both end in `?sslmode=require`.
2. **Push keys**: run `npx web-push generate-vapid-keys` once.
3. **Render**: New → **Blueprint** → choose this repo. `render.yaml` creates the web service (Singapore) and a daily alerts job. Fill in the values it asks for: the two Neon URLs, `BOOTSTRAP_ADMIN_USERNAME` / `NAME` / `PASSWORD` (8+ characters), the two VAPID keys, `VAPID_SUBJECT` (`mailto:you@example.com`), and for the cron job `APP_URL` (the web service URL, e.g. `https://luna-wave.onrender.com`). `CRON_SECRET` is generated and shared automatically.
4. Each deploy runs `npm run db:migrate` before building, so schema changes ship with the code. `/api/health` is the health check.
5. Open the app, sign in as the bootstrap Super Admin, change the password in Settings, then delete `BOOTSTRAP_ADMIN_PASSWORD` in Render. Create everyone else in Settings → Team.

Use the Starter plan or above: free Render instances sleep after 15 minutes idle, which makes the first open slow and can delay alerts.

Vercel also works (`vercel.json` and the `vercel-build` script are included): import the repo and set the same environment variables.

Locked out? `ADMIN_USERNAME=… ADMIN_NAME=… ADMIN_PASSWORD=… DATABASE_URL=… npm run create-admin` creates or resets a Super Admin and signs that account out everywhere.

Never run `db:seed` against production: it only fills an empty database and refuses when `NODE_ENV=production` unless `SEED_ALLOW_PRODUCTION=1`.

Sign-in attempts are throttled per server instance. For strict limits across instances put a shared rate limiter in front of `/api/auth/login`.

## PWA notes

- Installable from Chrome, Edge and Android (an Install banner appears on the sign-in page and at the top of the app); on iPhone the banner explains Share → Add to Home Screen (push works for installed apps on iOS 16.4+). Installing needs HTTPS, which Vercel provides.
- Offline: the app shell, pages you opened and the last data you loaded are readable. Changes need a connection; nothing is queued.
- Signing out clears cached pages and data from the device.
- The service worker is only registered in production builds.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js |
| `npm run typecheck` · `npm run lint` · `npm test` | Checks and unit tests |
| `npm run db:generate` | New SQL migration after editing `src/db/schema.ts` |
| `npm run db:migrate` | Apply migrations to `DATABASE_URL` |
| `npm run db:seed` | Demo data (development) |
| `npm run create-admin` | First or recovered Super Admin |
| `BASE=http://localhost:3000 node scripts/api-test.mjs` | End-to-end access-rule checks against a running dev server with seeded data |

## Layout

```
src/db          schema, connection, seed
src/lib         rules, validators, auth, access queries, alerts, shared helpers
src/app/api     route handlers (all go through lib/api.ts: session, role, CSRF)
src/app         pages (login, colleges, sponsors, roster, settings)
src/components  client views and shared UI
public/sw.js    service worker; manifest in src/app/manifest.ts
```
