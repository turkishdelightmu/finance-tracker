# Mauritius Personal Finance Tracker

Mobile-first MVP for tracking spending, bills, goals, loans, and investments in Mauritius.

## Stack
- Next.js (App Router) + TypeScript + Tailwind
- PostgreSQL + Prisma
- Auth: email/password
- Validation: zod

## Local setup
1. Install dependencies
```bash
npm install
```

2. Configure environment
Create `.env` with:
```
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/mauritius_finance"
DIRECT_URL="postgresql://USER:PASSWORD@localhost:5432/mauritius_finance"
CRON_SECRET="your-random-secret"
BETTER_AUTH_SECRET="your-long-random-secret"
GOOGLE_CLIENT_ID="optional"
GOOGLE_CLIENT_SECRET="optional"
```
`DIRECT_URL` should be a non-pooled connection string for migrations when using Neon.
The app will automatically use the Neon adapter when `DATABASE_URL` contains `neon.tech`.

3. Run migrations and seed
```bash
npx prisma migrate dev --name init
npx prisma generate
npx prisma db seed
```

4. Start the app
```bash
npm run dev
```

Open http://127.0.0.1:3000

## Demo login
Demo user is **disabled by default**. To enable locally, set:
```
ENABLE_DEMO_USER="true"
```
Then run `npx prisma db seed`.

## CSV import
Go to Transactions → Import CSV. Map columns to fields and import. Dates accept `dd/mm/yyyy` or ISO. Use dry-run to validate rows before writing.

## Bill reminders job
Create a daily cron at **08:00 Mauritius time** that calls:
```
POST /api/cron/daily
x-cron-secret: <CRON_SECRET>
```
The job creates in-app notifications and email placeholders for due bills.

## Tests
```bash
npm test
```

## Notes
- Currency defaults to `MUR`.
- Dates displayed as `dd/mm/yyyy` in `Indian/Mauritius` timezone.
- Email reminders are logged as notifications in MVP; integrate a provider later.
- Passwords must be at least 8 characters and include a letter + number.
- Basic security headers, CSRF protection, and rate limiting are enabled for auth routes.
- Audit events are recorded for key actions (auth, transactions, bills, goals, loans, investments).

## Architecture (MVP, scalable)
- UI (App Router pages) call **domain services** instead of direct Prisma access.
- Each domain keeps a simple, readable folder: `schema.ts` + `service.ts` (no extra layers).
- Prisma + auditing are shared utilities (`src/lib/*`), keeping data access consistent.
- Future scale path: replace module internals with service/repository layers without touching UI.

## Deployment

### Environment checklist (production)
- `DATABASE_URL` (Neon pooled URL or standard Postgres URL)
- `DIRECT_URL` (non-pooled URL for migrations; required for Neon)
- `CRON_SECRET` (random secret for `/api/cron/daily`)
- `BETTER_AUTH_SECRET` (required for Better Auth)
- `ENABLE_DEMO_USER` should be **unset** or `false` in production

### Vercel (primary path)
1. Create a new Vercel project and import this repo.
2. Set the environment variables above in Vercel.
3. Deploy.
4. Run migrations from CI (recommended) or locally:
   ```bash
   npx prisma migrate deploy
   npx prisma generate
   npx prisma db seed
   ```

### Render (optional alternative)
1. Create a new Web Service and connect your repo.
2. Set environment variables in Render.
3. Build command:
   ```bash
   npm install && npm run build
   ```
4. Start command:
   ```bash
   npm run start
   ```
5. Run migrations from a one-off job or locally:
   ```bash
   npx prisma migrate deploy
   npx prisma generate
   npx prisma db seed
   ```

### CI migration step
Add a deploy-time step in your CI/CD pipeline:
```bash
npx prisma migrate deploy
npx prisma generate
```
Notes:
- `migrate deploy` is idempotent and safe to run on every deploy.
- Run `db seed` only for first-time environments or when you want demo data.

### GitHub Actions (Vercel)
Minimal workflow: `.github/workflows/vercel-deploy.yml`
Required GitHub Secrets:
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `DATABASE_URL`
- `DIRECT_URL`

Migrations run **only on production deploys** (main branch). Preview deploys skip migrations.

### Production notes
- Use a **non-pooled** connection string for `DIRECT_URL` (Neon).
- Keep `CRON_SECRET` private and rotate if exposed.
- Schedule the daily bill reminder job at **08:00 Mauritius time** and send the secret in `x-cron-secret`.
- Consider setting `NODE_ENV=production` and enabling HTTPS-only cookies in your hosting provider.

### Go-live checklist
- Custom domain configured and HTTPS verified.
- Environment variables set in Vercel.
- Database migrated (`prisma migrate deploy`) and client generated.
- Cron scheduled for bill reminders.
- Admin user created (do not enable demo user in production).

### Rollback plan
- Redeploy a previous commit from the Vercel dashboard or by re-running the workflow on an earlier SHA.
- If a migration fails: fix forward (new migration) or revert the deploy without running new migrations.

## Production Acceptance Test (10 min)
- Login
- Add a Transaction
- CSV import dry-run + import
- Create a Bill + mark paid
- Create a Goal + contribute
- Create a Loan + record a payment

## Cron setup (Mauritius time)
Daily 08:00 MUT = 04:00 UTC
- **Vercel Cron** (if available):
  - Schedule: `0 4 * * *` (UTC)
  - URL: `https://<domain>/api/cron/daily`
  - Header: `x-cron-secret: <CRON_SECRET>`
- **External scheduler** (alternative):
  - Any scheduler (GitHub Actions, UptimeRobot, cron-job.org) calling:
    - `POST https://<domain>/api/cron/daily`
    - Header `x-cron-secret: <CRON_SECRET>`
