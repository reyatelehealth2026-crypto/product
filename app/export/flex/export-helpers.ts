import type { Product } from '@prisma/client';
import type { CsvProduct } from '@/lib/csv-product';
import type {
  ExportBubbleConfig,
  ExportGlobalConfig,
  ExportPreviewBubble,
  ExportPreviewDocument,
  ExportPreviewProduct,
} from './export-types';

const PUBLIC_IMAGE_HOST = 'https://manager.cnypharmacy.com';

type FlashSaleMeta = {
  name?: string;
  min_item?: number | string;
  max_item?: number | string;
  discount?: number | string;
  discount_type?: string;
  dark_price?: number | string;
  red_price?: number | string;
  quota?: number | string;
  usage?: number | string;
};

export function getResolvedExportImageUrl(product: Pick<Product, 'images'>): string | null {
  const images = Array.isArray(product.images) ? (product.images as Array<{ photo_path?: string | null }>) : [];
  const photoPath = images[0]?.photo_path;
  if (!photoPath) return null;
  return photoPath.startsWith('http') ? photoPath : `${PUBLIC_IMAGE_HOST}${photoPath.startsWith('/') ? '' : '/'}${photoPath}`;
}

export function chunkProductsIntoBubbles<T>(products: T[], bubbleSize = 9): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < products.length; index += bubbleSize) {
    result.push(products.slice(index, index + bubbleSize));
  }
  return result;
}

export function build3x3Grid(products: ExportPreviewProduct[]): Array<Array<ExportPreviewProduct | null>> {
  const cells = [...products];
  while (cells.length < 9) cells.push(null as never);
  return [cells.slice(0, 3), cells.slice(3, 6), cells.slice(6, 9)];
}

export function toPreviewProduct(product: Product): ExportPreviewProduct {
  const hashtags = Array.isArray(product.hashtags)
    ? (product.hashtags as Array<{ hashtag?: string } | string>)
        .map((item) => (typeof item === 'string' ? item : item?.hashtag || ''))
        .filter(Boolean)
    : [];

  const basePrice = Number(product.basePrice || 0);
  const promotionPrice = product.promotionPrice != null ? Number(product.promotionPrice) : null;
  const flashMeta = Array.isArray(product.flashSaleInfo)
    ? parseFlashSaleMeta(product.flashSaleInfo[0])
    : parseFlashSaleMeta(product.flashSaleInfo);
  const flashDarkPrice = toNumber(flashMeta?.dark_price);
  const flashRedPrice = toNumber(flashMeta?.red_price);
  const flashPrice = flashDarkPrice ?? getFlashSaleDerivedPrice(basePrice, flashMeta);

  return {
    productId: product.productId,
    sku: product.sku,
    name: product.name,
    imageUrl: getResolvedExportImageUrl(product),
    basePrice,
    promotionPrice,
    flashPrice,
    flashDarkPrice,
    flashRedPrice,
    flashSaleName: flashMeta?.name || null,
    flashMinQty: toNumber(flashMeta?.min_item),
    flashMaxQty: toNumber(flashMeta?.max_item),
    stockQuantity: product.stockQuantity,
    isRx: product.isRx,
    isPromotion: product.isPromotion,
    isFlashsale: product.isFlashsale,
    hashtags,
  };
}

export function getProductBadgeTokens(product: ExportPreviewProduct): string[] {
  return [
    product.isRx ? 'RX' : null,
    product.isPromotion ? 'โปร' : null,
    product.isFlashsale ? 'Flash' : null,
  ].filter(Boolean) as string[];
}

export function buildPreviewDocument(
  products: Product[],
  config: ExportGlobalConfig,
  bubbleOverrides: Partial<ExportBubbleConfig>[] = []
): ExportPreviewDocument {
  const previewProducts = products.map(toPreviewProduct);
  const groups = chunkProductsIntoBubbles(previewProducts, 9);

  const bubbles: ExportPreviewBubble[] = groups.map((group, index) => {
    const override = bubbleOverrides[index] || {};
    return {
      bubbleIndex: index + 1,
      subtitle: override.subtitle || config.intro,
      label: override.label || config.title,
      note: override.note || config.footerText,
      products: group,
      grid: build3x3Grid(group),
    };
  });

  return {
    config,
    bubbles,
  };
}


export function getProductUrlFromSku(sku: string): string {
  const numeric = (sku || '').replace(/\D+/g, '');
  const padded = numeric.padStart(4, '0');
  return `https://www.cnypharmacy.com/product/${padded}`;
}

export function csvProductToPreviewProduct(p: CsvProduct): ExportPreviewProduct {
  const rawPrice = parseFloat((p.pricePerUnit || '').replace(/[^\d.]/g, '')) || 0;
  const rawAfter = parseFloat((p.priceAfterDiscount || '').replace(/[^\d.]/g, '')) || 0;
  const promoPrice = rawAfter > 0 && rawAfter < rawPrice ? rawAfter : null;

  return {
    productId: parseInt((p.sku || '0').replace(/\D/g, ''), 10) || 0,
    sku: p.sku,
    name: p.productName,
    imageUrl: p.imageUrl || null,
    basePrice: rawPrice,
    promotionPrice: promoPrice,
    flashPrice: null,
    flashDarkPrice: null,
    flashRedPrice: null,
    flashSaleName: p.offerHeader || null,
    flashMinQty: null,
    flashMaxQty: null,
    stockQuantity: 999,
    isRx: false,
    isPromotion: !!(p.promoCond1 || p.promoCond2),
    isFlashsale: false,
    hashtags: [],
    promoLine1: p.promoCond1 || '',
    promoLine2: p.promoCond2 || '',
    offerStart: p.offerStart || '',
    offerEnd: p.offerEnd || '',
    productUrl: p.productUrl || '',
  };
}

export function buildPreviewDocumentFromCsv(
  products: CsvProduct[],
  config: ExportGlobalConfig,
  bubbleOverrides: Partial<ExportBubbleConfig>[] = []
): ExportPreviewDocument {
  const previewProducts = products.map(csvProductToPreviewProduct);
  const groups = chunkProductsIntoBubbles(previewProducts, 9);

  const bubbles: ExportPreviewBubble[] = groups.map((group, index) => {
    const override = bubbleOverrides[index] || {};
    return {
      bubbleIndex: index + 1,
      subtitle: override.subtitle || config.intro,
      label: override.label || config.title,
      note: override.note || config.footerText,
      products: group,
      grid: build3x3Grid(group),
    };
  });

  return { config, bubbles };
}


function parseFlashSaleMeta(value: unknown): FlashSaleMeta | null {
  if (!value) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as FlashSaleMeta;
    } catch {
      return null;
    }
  }
  if (typeof value === 'object') return value as FlashSaleMeta;
  return null;
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getFlashSaleDerivedPrice(basePrice: number, flash: FlashSaleMeta | null): number | null {
  if (!flash) return null;
  const discount = toNumber(flash.discount);
  if (discount == null) return null;
  const discountType = String(flash.discount_type || '').toLowerCase();

  if (discountType === 'baht') {
    return Math.max(basePrice - discount, 0);
  }

  if (discountType === 'percent' || discountType === 'percentage') {
    return Math.max(basePrice - (basePrice * discount) / 100, 0);
  }

  return null;
}
