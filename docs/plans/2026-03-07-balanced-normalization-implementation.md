# Balanced Normalization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Normalize CNY Pharmacy product payloads into a more stable product shape for UI rendering, filtering, detail dialogs, and Flex export.

**Architecture:** Extend the existing Product model with a small number of structured JSON fields, normalize remote API payloads during sync, and keep the list API/UI consuming a stable shape. This avoids a full relational redesign while making the data more reliable across the app.

**Tech Stack:** Next.js App Router, Prisma, MySQL, TypeScript, React, shadcn/ui

---

### Task 1: Extend Product schema for balanced normalization

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Add JSON fields to Product**
Add these fields to `model Product`:
- `prices Json?`
- `stockDetails Json? @map("stock_details")`
- `flashSaleInfo Json? @map("flash_sale_info")`

**Step 2: Keep naming aligned with current schema style**
Use existing camelCase Prisma field names with snake_case DB mappings where needed.

**Step 3: Generate Prisma client**
Run:
```bash
cd /root/.openclaw/workspace/cny-product-selector && npx prisma generate
```
Expected: Prisma client generated successfully.

**Step 4: Commit**
```bash
git add prisma/schema.prisma
 git commit -m "feat: extend product schema for normalized payload data"
```

---

### Task 2: Add normalization helpers in sync route

**Files:**
- Modify: `app/api/sync/route.ts`

**Step 1: Add hashtag normalization helper**
Implement a helper that:
- accepts direct hashtag arrays
- reads nested `product_hashtag`
- JSON parses string payloads when necessary
- trims blanks
- deduplicates

**Step 2: Add unit normalization helper**
Implement a helper that maps `product_unit` into a stable array of:
```ts
{ id?: number; targetId?: number; unit: string; unitNum?: number; contain?: number }
```

**Step 3: Add price normalization helper**
Implement a helper that flattens nested `product_price` into:
```ts
{ productUnitId?: number; price?: number; promotionPrice?: number; buyMin?: number; buyMax?: number; priceLevelId?: number }
```
Also add a helper to choose the primary/base display price.

**Step 4: Add stock normalization helper**
Implement a helper that maps `product_stock` into:
```ts
{ productLotId?: number; stockNum?: number; expiryDate?: string | null }
```
Also add a helper that computes total stock quantity.

**Step 5: Add flash sale normalization helper**
If the remote payload includes flash sale detail arrays, normalize them into a JSON-safe structure and store them as-is with light cleanup.

**Step 6: Commit**
```bash
git add app/api/sync/route.ts
 git commit -m "feat: add product payload normalization helpers"
```

---

### Task 3: Persist normalized fields during sync

**Files:**
- Modify: `app/api/sync/route.ts`

**Step 1: Use normalized helpers inside sync loop**
Before `upsert`, compute:
- normalized hashtags
- normalized units
- normalized prices
- normalized stock details
- normalized flash sale info
- total stock quantity
- primary base price / promotion price

**Step 2: Update `update` and `create` payloads**
Store the normalized values in:
- `hashtags`
- `units`
- `prices`
- `stockDetails`
- `flashSaleInfo`
- `basePrice`
- `promotionPrice`
- `stockQuantity`

**Step 3: Preserve backward compatibility**
Do not break existing fields consumed by UI.

**Step 4: Run build**
Run:
```bash
cd /root/.openclaw/workspace/cny-product-selector && npm run build
```
Expected: build passes.

**Step 5: Commit**
```bash
git add app/api/sync/route.ts
 git commit -m "feat: persist normalized product fields during sync"
```

---

### Task 4: Improve products API consumption of normalized data

**Files:**
- Modify: `app/api/products/route.ts`

**Step 1: Review current filters against normalized fields**
Update filter logic where useful so it better reflects normalized values, especially for:
- `discount`
- `hashtag`
- stock-related filters

**Step 2: Keep response shape stable**
Continue returning product rows with promotions included.

**Step 3: Run build**
Run:
```bash
cd /root/.openclaw/workspace/cny-product-selector && npm run build
```
Expected: build passes.

**Step 4: Commit**
```bash
git add app/api/products/route.ts
 git commit -m "refactor: align products API with normalized product fields"
```

---

### Task 5: Update UI bindings for normalized product fields

**Files:**
- Modify: `app/components/ProductCard.tsx`
- Modify: `app/ProductSelector.tsx`

**Step 1: Update ProductCard data reads**
Make sure card UI reads normalized arrays safely:
- `hashtags`
- `units`
- `prices`
- `stockDetails` if needed

**Step 2: Update detail dialog**
Show richer normalized data where available:
- more reliable units
- more reliable hashtags
- structured stock details preview
- structured price entries preview if useful

**Step 3: Update flex generation**
Use normalized product metadata for:
- display price
- hashtags
- image selection
- future flash support hooks

**Step 4: Run build**
Run:
```bash
cd /root/.openclaw/workspace/cny-product-selector && npm run build
```
Expected: build passes.

**Step 5: Commit**
```bash
git add app/components/ProductCard.tsx app/ProductSelector.tsx
 git commit -m "feat: bind UI to normalized product data"
```

---

### Task 6: Verification and final sync guidance

**Files:**
- Modify: `docs/plans/2026-03-07-balanced-normalization-design.md` (optional notes only)
- Modify: `docs/plans/2026-03-07-balanced-normalization-implementation.md` (optional execution notes only)

**Step 1: Run final build**
Run:
```bash
cd /root/.openclaw/workspace/cny-product-selector && npm run build
```
Expected: PASS

**Step 2: Inspect git diff**
Run:
```bash
cd /root/.openclaw/workspace/cny-product-selector && git status --short
```
Expected: only intended files changed.

**Step 3: Final commit**
```bash
git add .
 git commit -m "feat: improve product data completeness with balanced normalization"
```

**Step 4: Push**
```bash
git push origin main
```
Expected: push succeeds.

---

Plan complete and saved to `docs/plans/2026-03-07-balanced-normalization-implementation.md`.
