# Hybrid Flex Export Wizard with 3x3 Product Grid

Date: 2026-03-10
Project: cny-product-selector
Status: Approved design

## Goal
Design a dedicated Flex export experience that lets users prepare LINE Flex-ready product messages from DB-backed product data.

The export flow should:
- use a separate wizard page instead of a small popup
- support preset templates
- support a hybrid content model: global header + per-bubble overrides
- render 9 products per bubble in a strict 3x3 grid
- keep cards scannable and compact
- export structured Flex JSON for practical sending/copying

## Approved product requirements
- Export UX = wizard page + preset template flow
- Content model = hybrid
  - global header/content for the whole export set
  - editable subtitle/label per bubble
- 1 bubble = 9 products
- 9 products must be laid out as a 3x3 grid, not as a vertical list
- Use DB-backed product data as the stable source while re-sync is paused

## Approaches considered

### 1. Simple Wizard
Separate page with one global header and automatic multi-bubble generation.

**Pros**
- fast to use
- easiest to implement

**Cons**
- weak control over bubble-specific messaging

### 2. Fully Editable Bubble Builder
Separate page with deep customization for each bubble.

**Pros**
- maximum control
- good for mixed campaigns

**Cons**
- slower workflow
- more complex UX

### 3. Hybrid Export Wizard (Recommended / Approved)
A wizard page with preset templates, global campaign content, and per-bubble overrides.

**Pros**
- best balance of speed and flexibility
- fits actual merchandising/export workflow
- supports bubble-level nuance without making routine export too slow

**Cons**
- more complex than a simple dialog

## UX Flow

### Step 1 — Select products
Users select products from the main selector page as usual.

### Step 2 — Enter export wizard
Clicking export opens a dedicated page such as `/export/flex`.

### Step 3 — Configure campaign content
The export page contains three major zones:

#### A. Template panel
Preset templates such as:
- Promotion
- Recommended
- Bestseller
- RX
- Flash Sale

#### B. Global content setup
Shared settings for the whole export set:
- title
- intro text
- footer text / CTA
- visual theme token

#### C. Bubble editor
Each bubble can override selected fields:
- subtitle
- bubble label
- optional note

Each bubble contains exactly 9 selected products in a 3x3 grid.

### Step 4 — Preview and export
Users can:
- preview generated bubble groups
- inspect 3x3 layout
- copy Flex JSON
- export one bubble or all bubbles
- regenerate grouping if needed

## 3x3 Product Grid Design

## Bubble layout rules
- Each bubble contains exactly 9 products
- Arrange products in 3 rows x 3 columns
- Every mini-card should have consistent dimensions

## Mini-card content
Each product cell should prioritize scanability:
- product image
- short product name (1-2 lines)
- price / promo price
- compact badge (RX / Promotion / Flash)
- optional stock indicator

## UX rationale
The bubble should feel like a scannable product board, not a dense details panel.
Detailed information remains in the product detail flow, not the Flex export tile.

## Data Model

### Global export config
- `template`
- `title`
- `intro`
- `footerText`
- `theme`
- `ctaLabel`

### Per-bubble config
- `bubbleIndex`
- `subtitle`
- `label`
- `note`
- `productIds[]`

### Product export source
Use DB-backed fields as the stable source:
- `id`
- `name`
- `image`
- `basePrice`
- `promotionPrice`
- `isRx`
- `isPromotion`
- `isFlashsale`
- `stockQuantity`
- `hashtags`

### Output targets
Two representations are needed:
1. preview model for the wizard UI
2. Flex JSON model for actual copy/export/send usage

## Architecture Direction

### Recommended page structure
- Keep selection flow in existing `ProductSelector`
- Add dedicated export route/page
- Pass selected product ids into export state
- Build preview/grouping logic in a dedicated export module instead of overloading the existing selector page

### State direction
Use separate export-specific state for:
- selected products for export
- global campaign content
- per-bubble overrides
- generated grouping structure
- generated Flex output

This avoids making the current selector page too heavy or brittle.

## Error handling
- If fewer than 9 products remain, allow the last bubble to render as a partial 3x3 grid
- If an image is missing, use fallback image handling already proven with public image URL resolution
- If product data is incomplete, prefer safe DB values and fallbacks instead of blocking export
- If no selected products are available, disable export entry and show guidance

## Testing expectations
- Verify grouping into 9-item bubbles
- Verify 3x3 preview rendering
- Verify copy/export output shape
- Verify bubble-level overrides do not affect global defaults incorrectly
- Verify partial last bubble behavior
- Verify mobile readability and desktop usability

## Scope recommendation

### Phase 1
- export wizard page
- preset templates
- global header/footer inputs
- per-bubble subtitle/label overrides
- 3x3 preview grid
- copy Flex JSON

### Phase 2
- drag and drop regrouping
- manual per-cell rearrangement
- save templates/presets
- more advanced theme control
- export/send per bubble versus full set

## Final recommendation
Implement Phase 1 first as the highest-value path:
- practical for daily work
- low enough complexity to ship soon
- strong foundation for richer export tooling later
