# Migration-Safe Rollout Plan

Date: 2026-03-10
Project: cny-product-selector
Status: Baseline required before migrate deploy

## Current findings

### Build/deploy flow today
The current project build pipeline only runs:
- `prisma generate`
- `next build`

It does **not** run:
- `prisma migrate deploy`
- `prisma db push`

### Database migration state
The project now has `prisma/migrations`, but production is an existing non-empty database with no Prisma migration history table established yet.

## Root cause of the production incident
The application deployed code that expected new Prisma model columns (`prices`, `stockDetails`, `flashSaleInfo`) before the production database had those columns.
Prisma then generated queries against non-existent columns, causing `P2022` in production.

## New finding during Step 2
Running `prisma migrate deploy` failed with:
- `P3005: The database schema is not empty`

This means the production database must be **baselined** before Prisma Migrate can manage future migrations safely.

## Safe rollout strategy

### Phase A — Baseline production
1. Create a baseline migration history entry that represents the current production schema state
2. Mark the baseline as already applied in the production database
3. Keep additive feature migrations separate from the baseline migration

### Phase B — Additive migration rollout
1. Keep the normalized-column migration as a follow-up migration
2. Apply it only after baseline history is established
3. Verify columns exist in production

### Phase C — Runtime enablement
1. Re-enable runtime code that writes/reads the new columns
2. Re-sync page 1–250
3. Re-enable advanced export/data completeness features

## Recommended production-safe rule
Never merge Prisma schema field additions that are referenced by runtime code unless one of these is true:
1. migration files exist and are applied in production, or
2. the runtime code is fully gated to avoid selecting the new fields before migration

## Next concrete implementation steps
1. Create a baseline migration placeholder
2. Resolve migration history with `prisma migrate resolve --applied <baseline_name>`
3. Re-run `prisma migrate deploy`
4. Verify additive migration applied successfully

## Immediate goal for this round
Do not re-enable normalized runtime usage yet.
First establish Prisma migration history safely on the existing production database.
