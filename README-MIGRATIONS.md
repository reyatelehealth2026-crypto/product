# Prisma Migration & Production Rollout Guide

## Why this file exists
This project previously deployed Prisma schema changes without applying matching database migrations in production.
That caused runtime Prisma errors such as:
- `P2022: column does not exist`

## Current deployment behavior
`package.json` currently builds with:
- `prisma generate`
- `next build`

This does **not** update the production database schema.

## Safe rollout process for future Prisma schema changes

### Option A — Preferred: Prisma migrations

#### 1. Create migration locally
```bash
cd /root/.openclaw/workspace/cny-product-selector
npx prisma migrate dev --name <change-name>
```

#### 2. Commit both files
Commit:
- `prisma/schema.prisma`
- `prisma/migrations/...`

#### 3. Apply migration in production before enabling runtime usage
Run in production environment:
```bash
npx prisma migrate deploy
```

#### 4. Deploy runtime code that depends on the new columns
Only after step 3 is complete.

---

### Option B — Emergency/manual path: db push
Use only if you intentionally accept schema drift and know the risks.

```bash
npx prisma db push
```

This is faster, but weaker than real migrations because it does not create durable migration history.

## Recommended release order

### For additive columns
1. Add migration files
2. Deploy migration-compatible code (does not require the new columns yet)
3. Run `npx prisma migrate deploy`
4. Deploy feature code that reads/writes the new columns
5. Run data backfill / re-sync

## Rule of thumb
If runtime code references new Prisma fields, production DB must already have them.

## Suggested future improvement
If deploying on Vercel, add a separate migration step in CI/CD or run `npx prisma migrate deploy` as a controlled release step before promoting schema-dependent code.
