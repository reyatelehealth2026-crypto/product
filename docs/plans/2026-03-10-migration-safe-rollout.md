# Migration-Safe Rollout Plan

Date: 2026-03-10
Project: cny-product-selector
Status: In progress

## Current findings

### Build/deploy flow today
The current project build pipeline only runs:
- `prisma generate`
- `next build`

It does **not** run:
- `prisma migrate deploy`
- `prisma db push`

### Database migration state
There is currently no `prisma/migrations` directory in the project.
This means schema changes in `prisma/schema.prisma` do not automatically reach production.

## Root cause of the production incident
The application deployed code that expected new Prisma model columns (`prices`, `stockDetails`, `flashSaleInfo`) before the production database had those columns.
Prisma then generated queries against non-existent columns, causing `P2022` in production.

## Safe rollout strategy

### Phase A — Prepare migration workflow
1. Create proper Prisma migrations locally
2. Store them in `prisma/migrations`
3. Ensure deployment has an explicit migration step

### Phase B — Two-step rollout for schema changes
1. Deploy migration-compatible code first (old behavior still works)
2. Run migration on production
3. Deploy code that actually reads/writes the new columns

### Phase C — Backfill data
1. Re-sync page 1–250 after schema is live
2. Confirm normalized fields are populated
3. Only then expose advanced normalized UI again

## Recommended production-safe rule
Never merge Prisma schema field additions that are referenced by runtime code unless one of these is true:
1. migration files exist and are applied in production, or
2. the runtime code is fully gated to avoid selecting the new fields before migration

## Next concrete implementation steps
1. Add migration/deploy documentation
2. Add a safe deploy script for production migrations
3. Create the initial migration for normalized columns
4. Keep normalized feature code behind a compatibility-safe rollout

## Immediate goal for this round
Do not re-enable normalized DB columns yet.
Instead, prepare the project so the next schema expansion can be deployed safely without breaking production.
