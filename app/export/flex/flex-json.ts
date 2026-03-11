import type { ExportPreviewDocument, ExportPreviewProduct } from './export-types';
import { getProductBadgeTokens, getProductUrlFromSku } from './export-helpers';

function formatPrice(value: number | null | undefined) {
  return Number(value || 0).toLocaleString();
}

function buildProductCell(product: ExportPreviewProduct | null) {
  if (!product) {
    return {
      type: 'box',
      layout: 'vertical',
      flex: 1,
      cornerRadius: '12px',
      backgroundColor: '#F8FAFC',
      contents: [{ type: 'text', text: ' ', size: 'xs', color: '#FFFFFF' }],
      paddingAll: '6px',
    };
  }

  const badges = getProductBadgeTokens(product).slice(0, 2);
  const productUrl = getProductUrlFromSku(product.sku);
  const darkPriceValue = product.flashDarkPrice ?? product.flashPrice ?? product.promotionPrice ?? product.basePrice;
  const redPriceValue = product.flashRedPrice ?? product.basePrice;
  const oldPrice = redPriceValue > darkPriceValue ? formatPrice(redPriceValue) : null;
  const newPrice = formatPrice(darkPriceValue);

  return {
    type: 'box',
    layout: 'vertical',
    flex: 1,
    spacing: '4px',
    cornerRadius: '12px',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderWidth: '1px',
    paddingAll: '6px',
    action: {
      type: 'uri',
      uri: productUrl,
    },
    contents: [
      {
        type: 'image',
        url: product.imageUrl || 'https://manager.cnypharmacy.com/uploads/product_photo/placeholder.jpg',
        size: 'full',
        aspectMode: 'cover',
        aspectRatio: '1:1',
        gravity: 'center',
        action: {
          type: 'uri',
          uri: productUrl,
        },
      },
      ...(badges.length
        ? [
            {
              type: 'box',
              layout: 'horizontal',
              spacing: '4px',
              contents: badges.map((badge) => ({
                type: 'box',
                layout: 'vertical',
                flex: 0,
                backgroundColor: '#EF4444',
                cornerRadius: '8px',
                paddingStart: '4px',
                paddingEnd: '4px',
                paddingTop: '2px',
                paddingBottom: '2px',
                contents: [
                  {
                    type: 'text',
                    text: badge === 'Flash' ? 'FLASH' : badge,
                    size: 'xxs',
                    color: '#FFFFFF',
                    weight: 'bold',
                    flex: 0,
                  },
                ],
              })),
            },
          ]
        : []),
      {
        type: 'text',
        text: product.name,
        size: 'xs',
        weight: 'bold',
        color: '#0F172A',
        wrap: true,
        maxLines: 2,
      },
      {
        type: 'box',
        layout: 'baseline',
        spacing: '6px',
        contents: [
          ...(oldPrice
            ? [
                {
                  type: 'text',
                  text: oldPrice,
                  size: 'xxs',
                  color: '#94A3B8',
                  decoration: 'line-through',
                  flex: 0,
                },
              ]
            : []),
          {
            type: 'text',
            text: newPrice || '0',
            size: 'xs',
            weight: 'bold',
            color: '#DC2626',
            flex: 0,
          },
        ],
      },
      ...(product.isFlashsale && (product.flashMinQty || product.flashMaxQty)
        ? [
            {
              type: 'text',
              text: `ขั้นต่ำ ${product.flashMinQty ?? '-'} ชิ้น${product.flashMaxQty ? ` • สูงสุด ${product.flashMaxQty} ชิ้น` : ''}`,
              size: 'xxs',
              color: '#B45309',
              wrap: true,
            },
          ]
        : []),
    ],
  };
}

export function buildFlexPayload(document: ExportPreviewDocument) {
  const hasAnyFlash = document.bubbles.some((bubble) => bubble.products.some((product) => product.isFlashsale));
  const isFlashStyle = document.config.template === 'flashsale' || hasAnyFlash;

  return {
    type: 'carousel',
    contents: document.bubbles.map((bubble) => {
      const flashMetaProduct = bubble.products.find((product) => product.flashSaleName);

      return {
        type: 'bubble',
        size: 'giga',
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: '12px',
          paddingAll: '0px',
          contents: [
            {
              type: 'box',
              layout: 'vertical',
              spacing: '4px',
              paddingAll: '16px',
              background: {
                type: 'linearGradient',
                angle: '0deg',
                startColor: isFlashStyle ? '#111827' : '#6D28D9',
                endColor: isFlashStyle ? '#FACC15' : '#8B5CF6',
              },
              contents: [
                {
                  type: 'text',
                  text: document.config.title,
                  size: 'xl',
                  weight: 'bold',
                  color: '#FFFFFF',
                  wrap: true,
                },
                {
                  type: 'text',
                  text: flashMetaProduct?.flashSaleName || document.config.intro,
                  size: 'sm',
                  color: '#F8FAFC',
                  wrap: true,
                },
                {
                  type: 'box',
                  layout: 'horizontal',
                  contents: [
                    {
                      type: 'box',
                      layout: 'vertical',
                      flex: 0,
                      backgroundColor: '#EF4444',
                      paddingAll: '4px',
                      cornerRadius: '8px',
                      contents: [
                        {
                          type: 'text',
                          text: isFlashStyle ? 'FLASH' : `${bubble.products.length}/9 ITEMS`,
                          size: 'xxs',
                          weight: 'bold',
                          color: '#FFFFFF',
                          flex: 0,
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              type: 'box',
              layout: 'vertical',
              spacing: '8px',
              paddingAll: '16px',
              contents: bubble.grid.map((row) => ({
                type: 'box',
                layout: 'horizontal',
                spacing: '8px',
                contents: row.map((product) => buildProductCell(product)),
              })),
            },
            {
              type: 'box',
              layout: 'vertical',
              paddingStart: '16px',
              paddingEnd: '16px',
              paddingBottom: '16px',
              contents: [
                {
                  type: 'text',
                  text: document.config.footerText,
                  size: 'xs',
                  color: '#6B7280',
                  wrap: true,
                },
              ],
            },
          ],
        },
      };
    }),
  };
}

export function buildSingleBubbleFlexPayload(document: ExportPreviewDocument, bubbleIndex: number) {
  const bubble = document.bubbles[bubbleIndex];
  if (!bubble) return null;

  return {
    type: 'carousel',
    contents: [buildFlexPayload({ ...document, bubbles: [bubble] }).contents[0]],
  };
}
