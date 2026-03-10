import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

interface ApiProduct {
  product_data: Array<{
    id: number;
    sku: string;
    barcode: string;
    name: string;
    name_en: string;
    spec_name: string;
    is_rx: number;
    is_promotion: number;
    is_bestseller: number;
    hashtags: string[];
    product_sub_type_lists?: string;
  }>;
  product_price: Array<{
    product_price: Array<{
      id?: number;
      price_level_id?: number;
      product_unit_id?: number;
      price: string;
      promotion_price: string;
      buy_max?: number;
      buy_min?: number;
    }>;
  }>;
  product_stock: Array<{
    productLotId?: number;
    stock_num: string;
    expiry_date?: string | null;
    unit_name?: string;
  }>;
  product_photo: Array<{
    photo_path: string;
  }>;
  product_unit: Array<{
    id: number;
    target_id?: number;
    unit: string;
    unit_num: number | string;
    contain: number | string;
  }>;
  related_products: Array<{
    id: number;
    name: string;
  }>;
  product_hashtag?: Array<{
    hashtag?: string;
    meta_title?: string;
  }>;
  product_hashtag_new?: Array<{
    hashtag?: string;
    meta_title?: string;
  }>;
  product_is_flashSale: number;
  product_is_recommend: number;
  product_flasSale?: Array<Record<string, unknown>>;
  customer_buyed: number;
  product_wishlists?: number;
}

type NormalizedUnit = {
  id?: number;
  targetId?: number;
  unit: string;
  unitNum?: number;
  contain?: number;
};

type NormalizedPrice = {
  productUnitId?: number;
  price?: number;
  promotionPrice?: number;
  buyMin?: number;
  buyMax?: number;
  priceLevelId?: number;
};

type NormalizedStock = {
  productLotId?: number;
  stockNum?: number;
  expiryDate?: string | null;
  unitName?: string | null;
};

function toNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeHashtags(...sources: Array<unknown>): string[] {
  const result = new Set<string>();

  const pushTag = (value: unknown) => {
    if (typeof value !== 'string') return;
    const cleaned = value.trim().replace(/^#+/, '');
    if (cleaned) result.add(cleaned);
  };

  const visit = (input: unknown) => {
    if (!input) return;

    if (Array.isArray(input)) {
      input.forEach(visit);
      return;
    }

    if (typeof input === 'string') {
      const trimmed = input.trim();
      if (!trimmed) return;

      if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
        try {
          visit(JSON.parse(trimmed));
          return;
        } catch {
          pushTag(trimmed);
          return;
        }
      }

      pushTag(trimmed);
      return;
    }

    if (typeof input === 'object') {
      const record = input as Record<string, unknown>;
      if ('hashtag' in record) visit(record.hashtag);
    }
  };

  sources.forEach(visit);
  return Array.from(result);
}

function normalizeUnits(units: ApiProduct['product_unit'] = []): NormalizedUnit[] {
  return units
    .map((unit) => ({
      id: unit.id,
      targetId: unit.target_id,
      unit: unit.unit,
      unitNum: toNumber(unit.unit_num),
      contain: toNumber(unit.contain),
    }))
    .filter((unit) => !!unit.unit);
}

function normalizePrices(priceGroups: ApiProduct['product_price'] = []): NormalizedPrice[] {
  return priceGroups.flatMap((group) =>
    (group.product_price || []).map((price) => ({
      productUnitId: price.product_unit_id,
      price: toNumber(price.price),
      promotionPrice: toNumber(price.promotion_price),
      buyMin: toNumber(price.buy_min),
      buyMax: toNumber(price.buy_max),
      priceLevelId: price.price_level_id,
    }))
  );
}

function getPrimaryPrices(prices: NormalizedPrice[]) {
  const firstValid = prices.find((price) => typeof price.price === 'number') || prices[0];
  const basePrice = firstValid?.price ?? 0;
  const promotionPrice =
    typeof firstValid?.promotionPrice === 'number' && firstValid.promotionPrice !== basePrice
      ? firstValid.promotionPrice
      : null;

  return {
    basePrice,
    promotionPrice,
  };
}

function normalizeStockDetails(stock: ApiProduct['product_stock'] = []): NormalizedStock[] {
  return stock.map((item) => ({
    productLotId: item.productLotId,
    stockNum: toNumber(item.stock_num),
    expiryDate: item.expiry_date ?? null,
    unitName: item.unit_name ?? null,
  }));
}

function getTotalStock(stockDetails: NormalizedStock[]): number {
  return Math.round(
    stockDetails.reduce((sum, item) => sum + (typeof item.stockNum === 'number' ? item.stockNum : 0), 0)
  );
}

function normalizeFlashSaleInfo(source: ApiProduct['product_flasSale'] = []) {
  if (!Array.isArray(source)) return [] as string[];
  return source.filter(Boolean).map((item) => JSON.stringify(item));
}

// STEP-BY-STEP SYNC with PAGE RANGE support
export async function POST(request: NextRequest) {
  const MAX_TIME_MS = 20000;
  const startTime = Date.now();

  try {
    const body = await request.json().catch(() => ({}));
    const {
      startPage = 1,
      endPage = null,
      maxPages = 2,
      clearExisting = false,
    } = body;

    if (endPage && endPage < startPage) {
      return NextResponse.json(
        {
          success: false,
          error: 'endPage must be greater than or equal to startPage',
        },
        { status: 400 }
      );
    }

    if (clearExisting && startPage === 1) {
      console.log('Clearing existing products...');
      await prisma.product.deleteMany({});
    }

    let currentPage = startPage;
    let processedCount = 0;
    let errorCount = 0;
    let hasMore = true;
    let stoppedByLimit = false;

    const actualMaxPages = endPage ? Math.min(maxPages, endPage - startPage + 1) : maxPages;

    for (let pageCount = 0; pageCount < actualMaxPages; pageCount++) {
      if (Date.now() - startTime > MAX_TIME_MS) {
        console.log('Time limit reached');
        stoppedByLimit = true;
        break;
      }

      if (endPage && currentPage > endPage) {
        console.log(`Reached endPage ${endPage}`);
        hasMore = false;
        break;
      }

      console.log(`Fetching page ${currentPage}...`);

      const response = await fetch(
        `https://www.cnypharmacy.com/api/getDataProductIsGroup?page=${currentPage}&sort_product_name=asc&isPageGroup=8&paginate_num=25`,
        {
          next: { revalidate: 0 },
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        }
      );

      if (!response.ok) {
        return NextResponse.json({
          success: false,
          error: `API error: ${response.status}`,
          currentPage,
          processed: processedCount,
          status: 'error',
        });
      }

      const data = await response.json();
      const products: ApiProduct[] = data.product || [];

      if (products.length === 0) {
        hasMore = false;
        break;
      }

      for (const item of products) {
        try {
          const productData = item.product_data?.[0];
          if (!productData) continue;

          const normalizedHashtags = normalizeHashtags(
            productData.hashtags,
            item.product_hashtag,
            item.product_hashtag_new
          );
          const normalizedUnits = normalizeUnits(item.product_unit || []);
          const normalizedPrices = normalizePrices(item.product_price || []);
          const normalizedStockDetails = normalizeStockDetails(item.product_stock || []);
          const normalizedFlashSaleInfo = normalizeFlashSaleInfo(item.product_flasSale || []);
          const { basePrice, promotionPrice } = getPrimaryPrices(normalizedPrices);
          const totalStock = getTotalStock(normalizedStockDetails);
          const primaryStockUnit = normalizedUnits[0]?.unit || item.product_stock?.[0]?.unit_name || null;

          await prisma.product.upsert({
            where: { productId: productData.id },
            update: {
              sku: productData.sku,
              barcode: productData.barcode || null,
              name: productData.name,
              nameEn: productData.name_en || null,
              specName: productData.spec_name || null,
              basePrice,
              promotionPrice,
              stockQuantity: totalStock,
              stockUnit: primaryStockUnit,
              isRx: productData.is_rx === 1,
              isPromotion: productData.is_promotion === 1,
              isFlashsale: item.product_is_flashSale === 1,
              isBestseller: productData.is_bestseller === 1,
              isRecommend: item.product_is_recommend === 1,
              images: item.product_photo || [],
              hashtags: normalizedHashtags,
              units: normalizedUnits,
              prices: normalizedPrices,
              stockDetails: normalizedStockDetails,
              relatedProducts: item.related_products || [],
              flashSaleInfo: normalizedFlashSaleInfo,
            },
            create: {
              productId: productData.id,
              sku: productData.sku,
              barcode: productData.barcode || null,
              name: productData.name,
              nameEn: productData.name_en || null,
              specName: productData.spec_name || null,
              basePrice,
              promotionPrice,
              stockQuantity: totalStock,
              stockUnit: primaryStockUnit,
              isRx: productData.is_rx === 1,
              isPromotion: productData.is_promotion === 1,
              isFlashsale: item.product_is_flashSale === 1,
              isBestseller: productData.is_bestseller === 1,
              isRecommend: item.product_is_recommend === 1,
              images: item.product_photo || [],
              hashtags: normalizedHashtags,
              units: normalizedUnits,
              prices: normalizedPrices,
              stockDetails: normalizedStockDetails,
              relatedProducts: item.related_products || [],
              flashSaleInfo: normalizedFlashSaleInfo,
            },
          });

          processedCount++;
        } catch (err) {
          console.error(`Error saving product ${item.product_data?.[0]?.id}:`, err);
          errorCount++;
        }
      }

      currentPage++;
    }

    const isComplete = endPage ? currentPage > endPage || (!hasMore && !stoppedByLimit) : !hasMore;
    const totalInDb = await prisma.product.count();

    return NextResponse.json({
      success: true,
      processed: processedCount,
      errors: errorCount,
      startPage,
      endPage,
      currentPage: currentPage - 1,
      nextPage: isComplete ? null : currentPage,
      hasMore: !isComplete,
      totalInDb,
      status: isComplete ? 'complete' : 'partial',
      duration: `${(Date.now() - startTime) / 1000}s`,
    });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message,
      status: 'error',
    });
  }
}

export async function GET() {
  const totalProducts = await prisma.product.count();
  const latestSync = await prisma.syncLog.findFirst({
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({
    totalProducts,
    latestSync,
  });
}
