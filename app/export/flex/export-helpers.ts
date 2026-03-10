import type { Product } from '@prisma/client';
import type {
  ExportBubbleConfig,
  ExportGlobalConfig,
  ExportPreviewBubble,
  ExportPreviewDocument,
  ExportPreviewProduct,
} from './export-types';

const PUBLIC_IMAGE_HOST = 'https://manager.cnypharmacy.com';

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

  return {
    productId: product.productId,
    name: product.name,
    imageUrl: getResolvedExportImageUrl(product),
    basePrice: Number(product.basePrice || 0),
    promotionPrice: product.promotionPrice != null ? Number(product.promotionPrice) : null,
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
      subtitle: override.subtitle || `ชุดสินค้า ${index + 1}`,
      label: override.label || `Bubble ${index + 1}`,
      note: override.note || '',
      products: group,
      grid: build3x3Grid(group),
    };
  });

  return {
    config,
    bubbles,
  };
}
