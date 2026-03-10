# Flex Export Wizard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a dedicated Hybrid Flex Export Wizard page that groups selected DB-backed products into 9-item 3x3 bubbles with preset templates, global campaign content, per-bubble overrides, preview, and copyable Flex JSON.

**Architecture:** Keep product selection in the existing `ProductSelector` flow, but move export configuration and preview to a dedicated route/page so export state and UI complexity stay isolated. Use DB-backed product data plus existing image URL normalization, generate a preview model first, then transform that model into LINE Flex JSON.

**Tech Stack:** Next.js App Router, React, TypeScript, existing UI components/shadcn dialog/button/input patterns, Prisma-backed product API data.

---

### Task 1: Audit the current export flow and map reusable code

**Files:**
- Read: `app/ProductSelector.tsx`
- Read: `app/components/ProductCard.tsx`
- Read: `app/api/products/route.ts`
- Read: `app/api/image/route.ts`

**Step 1: Inspect current export-related state and functions**
- Find existing selected-product state
- Find current Flex generation function
- Find current dialog/preview code

**Step 2: List reusable helpers and constraints**
- Identify existing image URL helper logic
- Identify current bubble grouping logic
- Identify current selected item source of truth

**Step 3: Write implementation notes into the plan branch context**
- Confirm what should be extracted vs replaced

**Step 4: Commit**
```bash
git add docs/plans/2026-03-10-flex-export-wizard-implementation.md
git commit -m "docs: plan flex export wizard implementation"
```

### Task 2: Add export route and route-level page shell

**Files:**
- Create: `app/export/flex/page.tsx`
- Create: `app/export/flex/loading.tsx`
- Modify: `app/ProductSelector.tsx`

**Step 1: Add export entry point from selector**
- Replace/augment current export action so it can navigate to `/export/flex`
- Pass selected product ids via query params or encoded route state

**Step 2: Create page shell**
- Add page title, layout container, back button, and placeholder sections for template panel, content setup, bubble editor, and preview

**Step 3: Add empty/loading states**
- No selected products
- Invalid product ids
- Loading selected product export data

**Step 4: Run build**
```bash
npm run build
```
Expected: PASS

**Step 5: Commit**
```bash
git add app/export/flex/page.tsx app/export/flex/loading.tsx app/ProductSelector.tsx
git commit -m "feat: add flex export wizard route shell"
```

### Task 3: Create export data helpers for grouping and preview modeling

**Files:**
- Create: `app/export/flex/export-helpers.ts`
- Create: `app/export/flex/export-types.ts`
- Test: `app/export/flex/export-helpers.test.ts` or equivalent local test harness if the project lacks formal test setup

**Step 1: Define export types**
Include:
- `ExportTemplateKey`
- `ExportGlobalConfig`
- `ExportBubbleConfig`
- `ExportPreviewProduct`
- `ExportPreviewBubble`
- `ExportPreviewDocument`

**Step 2: Implement pure helpers**
Include:
- `chunkProductsIntoBubbles(products, 9)`
- `build3x3Grid(products)`
- `buildPreviewDocument(products, globalConfig, bubbleOverrides)`
- `getProductBadgeTokens(product)`
- `getResolvedExportImageUrl(product)`

**Step 3: Verify helper behavior manually**
- 9 items => 1 full 3x3 bubble
- 10 items => 2 bubbles with last partial grid
- Missing images => fallback safe URL handling

**Step 4: Run build**
```bash
npm run build
```
Expected: PASS

**Step 5: Commit**
```bash
git add app/export/flex/export-helpers.ts app/export/flex/export-types.ts
git commit -m "feat: add flex export preview helpers"
```

### Task 4: Implement preset templates and global content form

**Files:**
- Create: `app/export/flex/export-presets.ts`
- Modify: `app/export/flex/page.tsx`

**Step 1: Add template presets**
Initial presets:
- promotion
- recommend
- bestseller
- rx
- flashsale

Each preset should provide sensible defaults for:
- title
- intro
- footerText
- ctaLabel
- theme token

**Step 2: Build global content form UI**
Fields:
- title
- intro
- footer text
- CTA label
- theme selector

**Step 3: Connect preset selection to form state**
- Preset apply should populate defaults
- User edits should remain editable after preset selection

**Step 4: Run build**
```bash
npm run build
```
Expected: PASS

**Step 5: Commit**
```bash
git add app/export/flex/export-presets.ts app/export/flex/page.tsx
git commit -m "feat: add flex export presets and global form"
```

### Task 5: Implement per-bubble override editor

**Files:**
- Modify: `app/export/flex/page.tsx`
- Optionally create: `app/export/flex/BubbleOverrideEditor.tsx`

**Step 1: Add per-bubble editable fields**
Per bubble:
- subtitle
- label
- note

**Step 2: Bind overrides to generated bubble groups**
- Bubble override state should not mutate global defaults directly
- Bubble order should remain stable

**Step 3: Show bubble summary header**
Display:
- bubble number
- number of items in bubble
- editable labels

**Step 4: Run build**
```bash
npm run build
```
Expected: PASS

**Step 5: Commit**
```bash
git add app/export/flex/page.tsx app/export/flex/BubbleOverrideEditor.tsx
git commit -m "feat: add per-bubble export overrides"
```

### Task 6: Build the 3x3 preview grid

**Files:**
- Create: `app/export/flex/ProductGrid3x3Preview.tsx`
- Modify: `app/export/flex/page.tsx`

**Step 1: Render preview bubbles with strict 3-column grid**
- Use CSS grid with 3 columns
- Preserve compact scanability
- Handle partial last bubble cleanly

**Step 2: Render each product mini-card**
Show:
- image
- short name
- promo/base price
- compact badge set
- optional stock marker

**Step 3: Ensure mobile readability**
- Keep cards aligned
- Prevent runaway text expansion
- Maintain consistent spacing and aspect ratio

**Step 4: Run build**
```bash
npm run build
```
Expected: PASS

**Step 5: Commit**
```bash
git add app/export/flex/ProductGrid3x3Preview.tsx app/export/flex/page.tsx
git commit -m "feat: add 3x3 flex export preview grid"
```

### Task 7: Generate Flex JSON from preview model

**Files:**
- Create: `app/export/flex/flex-json.ts`
- Modify: `app/export/flex/page.tsx`

**Step 1: Build serializer from preview model to Flex JSON**
Include:
- bubble wrapper
- hero/header section
- 3x3 body layout
- footer/CTA section

**Step 2: Support output modes**
- export all bubbles
- export per bubble

**Step 3: Add copy/export controls**
- copy JSON to clipboard
- show readable pretty JSON preview

**Step 4: Run build**
```bash
npm run build
```
Expected: PASS

**Step 5: Commit**
```bash
git add app/export/flex/flex-json.ts app/export/flex/page.tsx
git commit -m "feat: generate flex json from export preview"
```

### Task 8: Integrate DB-only export assumptions and guardrails

**Files:**
- Modify: `app/export/flex/page.tsx`
- Modify: `app/ProductSelector.tsx`
- Optionally modify: `app/api/products/route.ts`

**Step 1: Ensure export reads stable DB-backed data only**
- No implicit sync trigger from export flow
- Use current DB values only

**Step 2: Add user-facing notices when relevant**
- If selection empty => block export
- If products have incomplete fields => use safe fallbacks without crashing

**Step 3: Preserve existing normalized-field guards**
- Keep array checks/fallbacks
- Do not reintroduce brittle assumptions

**Step 4: Run build**
```bash
npm run build
```
Expected: PASS

**Step 5: Commit**
```bash
git add app/export/flex/page.tsx app/ProductSelector.tsx app/api/products/route.ts
git commit -m "feat: enforce db-only flex export guardrails"
```

### Task 9: Final verification and handoff

**Files:**
- Review: `app/export/flex/*`
- Review: `app/ProductSelector.tsx`
- Review: `docs/plans/2026-03-10-flex-export-wizard-design.md`

**Step 1: Manual verification checklist**
- Select products from main page
- Enter export wizard
- Apply preset
- Edit global content
- Edit per-bubble subtitle/label
- Confirm 9-item 3x3 preview layout
- Confirm partial last bubble behavior
- Copy Flex JSON

**Step 2: Run build**
```bash
npm run build
```
Expected: PASS

**Step 3: Review generated Flex JSON samples**
- Validate output structure is stable and readable
- Confirm image URLs use public working host strategy

**Step 4: Commit**
```bash
git add app/export/flex app/ProductSelector.tsx docs/plans/2026-03-10-flex-export-wizard-design.md docs/plans/2026-03-10-flex-export-wizard-implementation.md
git commit -m "feat: ship hybrid flex export wizard"
```
