# Mauritius Finance Tracker

Mobile-first personal finance app built with Next.js, Prisma, and Better Auth.

## What Is Implemented

- Authentication:
  - Email/password login and registration
  - Google OAuth login
  - Logout and protected app routes
- Finance modules:
  - Dashboard
  - Transactions (manual create/delete/category updates)
  - CSV transaction import with dry-run
  - Bills (create, mark paid, activate/deactivate)
  - Goals (create, contribute)
  - Loans (create, record payments, override balance)
  - Investments (accounts, holdings, transactions, price updates)
  - Comments
- Background job:
  - Daily bill reminder cron endpoint: `POST /api/cron/daily`
- Security:
  - CSRF token/cookie protection
  - Basic rate limiting on auth endpoints
  - Security headers + CSP via proxy/middleware
  - Audit event logging for auth actions

## Tech Stack

- Next.js 16 (App Router, TypeScript)
- Prisma + PostgreSQL (Neon-compatible)
- Better Auth (`better-auth`)
- Tailwind CSS 4
- Zod validation
- Vitest tests

## Project Structure

- `src/app/(auth)` login/register UI
- `src/app/(app)` authenticated app pages
- `src/app/api` API routes
- `src/domains/*/service.ts` domain logic per module
- `src/lib` shared utilities (auth, csrf, rate limit, formatting, etc.)
- `prisma/schema.prisma` database schema
- `prisma/migrations` migration history

## Prerequisites

- Node.js `>=20.9.0`
- npm
- PostgreSQL database (or Neon)

## Environment Variables

Use `.env` for local development.

Required:

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `NEXT_PUBLIC_APP_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `CRON_SECRET` (for cron endpoint protection)

Recommended local values:

- `BETTER_AUTH_URL=http://localhost:3000`
- `NEXT_PUBLIC_APP_URL=http://localhost:3000`

## Local Setup (Step by Step)

1. Install dependencies

```bash
npm install
```

2. Configure `.env`

- Set database URL and auth/oauth secrets.

3. Generate Prisma client

```bash
npx prisma generate
```

4. Apply migrations

```bash
npx prisma migrate deploy
```

5. (Optional) seed data

```bash
npx prisma db seed
```

6. Start app

```bash
npm run dev
```

7. Open

- `http://localhost:3000`

## Google OAuth Setup

In Google Cloud Console (OAuth client):

- Authorized JavaScript origins:
  - `http://localhost:3000`
  - `https://mauritius-finance-tracker.vercel.app`
- Authorized redirect URIs:
  - `http://localhost:3000/api/auth/callback/google`
  - `https://mauritius-finance-tracker.vercel.app/api/auth/callback/google`

In Vercel env vars (Production):

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `BETTER_AUTH_URL=https://mauritius-finance-tracker.vercel.app`
- `NEXT_PUBLIC_APP_URL=https://mauritius-finance-tracker.vercel.app`
- `BETTER_AUTH_SECRET=<strong-random-secret>`
- `AUTH_SECRET=<same-as-BETTER_AUTH_SECRET>`

After env changes, redeploy.

## Step-by-Step Practice Flow

Use this checklist to validate the product end-to-end.

1. Create account or sign in with Google at `/login`.
2. Confirm redirect to `/dashboard`.
3. Create a transaction at `/transactions`.
4. Import a CSV from `/transactions/import`:
   - Run dry-run first
   - Then run real import
5. Create a bill at `/bills` and mark it paid.
6. Create a goal at `/goals` and add a contribution.
7. Create a loan at `/loans` and record a payment.
8. Create an investment account + holding at `/investments`.
9. Add a comment at `/comments`.
10. Log out and confirm return to `/login`.

## API Endpoints (Key)

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET/POST /api/auth/authorize/[provider]`
- `POST /api/transactions/import`
- `POST /api/cron/daily` (requires header: `x-cron-secret`)

## Tests

Run:

```bash
npm test
```

Includes utility and domain-level tests under `tests/`.

## Deployment Notes (Vercel)

1. Set all required environment variables in Vercel.
2. Deploy.
3. Run migrations against production DB:

```bash
npx prisma migrate deploy
```

4. Verify Google sign-in and dashboard redirect in production.
