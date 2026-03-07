# Balanced Normalization Design

Date: 2026-03-07
Project: cny-product-selector
Status: Approved for planning

## Goal
Improve data completeness from the CNY Pharmacy API without overcomplicating the system. The application should normalize the API payload into a stable shape that is easier to query, render, filter, and export into Flex messages.

## Why this design
The current implementation stores enough data to render basic cards, but several fields are still too raw or inconsistent for reliable UI and export behavior. In particular, hashtags, units, prices, stock, and flash-sale-related data need a more stable intermediate format.

A balanced normalization layer gives us the best trade-off:
- better UI fidelity
- simpler frontend logic
- more reliable filters and exports
- less schema complexity than storing every raw payload as first-class query fields

## Scope
This round focuses on four areas:

1. Normalization layer
2. Sync pipeline improvements
3. Products API improvements
4. UI binding improvements

## Data to normalize

### 1. Hashtags
Sources may vary in structure and format.
We will normalize to a flat string array with duplicates removed and blank values discarded.

Normalized shape:
- `hashtags: string[]`

### 2. Units
Units should be preserved as a structured array for rendering in cards and detail dialogs.

Normalized shape:
- `units: Array<{ id?: number; unit: string; unitNum?: number; contain?: number; targetId?: number }>`

### 3. Prices
Price payloads are nested and tied to unit ids. We will normalize them into a consistent structured list while also preserving the primary display price fields used by the UI.

Normalized shape:
- `prices: Array<{ productUnitId?: number; price?: number; promotionPrice?: number; buyMin?: number; buyMax?: number; priceLevelId?: number }>`
- Primary fields kept for fast querying/rendering:
  - `basePrice`
  - `promotionPrice`
  - `salePrice`

### 4. Stock
Stock data should be summarized for list rendering while preserving detail for the product detail dialog.

Normalized shape:
- `stockDetails: Array<{ productLotId?: number; stockNum?: number; expiryDate?: string | null }>`
- Primary fields kept for fast querying/rendering:
  - `stockQuantity`
  - `stockUnit`

### 5. Flash and related display flags
We will continue using first-class booleans for:
- `isFlashsale`
- `isPromotion`
- `isBestseller`
- `isRecommend`
- `isRx`

If flash-sale detail exists in payloads, it should be stored in a structured JSON field for future UI use.

Normalized shape:
- `flashSaleInfo: Json`

## Schema direction
We should extend the Product model with JSON fields that are useful for rendering but not worth fully relationalizing right now.

Proposed additions:
- `prices Json?`
- `stockDetails Json?`
- `flashSaleInfo Json?`

These fields support the balanced normalization strategy without requiring a full relational redesign.

## Sync pipeline design
The sync route will:
1. fetch page data from the remote API
2. normalize each product payload
3. compute key summary values
4. upsert normalized data into the Product table

### Key rules
- Primary price comes from the first valid normalized price entry
- Promotion price is stored only when meaningfully different from base price
- Stock quantity is derived from normalized stock detail
- Hashtags are merged across all available hashtag sources
- Unit and price normalization must be resilient to missing arrays or malformed payload segments

## Products API design
The products API should continue serving list-friendly data but with improved reliability because upstream normalization is stronger.

This round does not require a breaking API redesign. Instead, it improves the quality of the returned product objects.

Potential follow-up improvements:
- better filter semantics for hashtags and discounts
- richer stock-based filtering
- flash-sale date filtering if structured timing becomes available

## UI design impact
No major UI redesign is required in this round.
Instead, existing UI should become more accurate:
- hashtags display should be cleaner
- units list should be more reliable
- promotion price display should be more accurate
- detail dialog can show richer stock and price information
- flex export can use more trustworthy product metadata

## Risks
1. Remote payload inconsistency
   - Mitigation: defensive parsing and fallback defaults

2. Existing records may contain older shapes
   - Mitigation: gradual re-sync and null-safe UI rendering

3. Price source ambiguity
   - Mitigation: define a clear primary-price selection rule and use it consistently

## Success criteria
This round is successful if:
- synced products have cleaner normalized hashtags
- units and price arrays render consistently in UI
- stock summary and stock details are both available
- flex export uses normalized product data reliably
- build passes and the app remains backward-compatible

## Out of scope
- full raw payload archival for every product
- full relational redesign for unit prices and stock lots
- advanced analytics or reporting
- a brand-new frontend architecture

## Recommended next step
Write the implementation plan and then execute the schema + sync + API + UI binding updates in small verifiable phases.
