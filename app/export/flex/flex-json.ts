import type { ExportPreviewDocument, ExportPreviewProduct } from './export-types';
import { getProductBadgeTokens } from './export-helpers';

function formatPrice(product: ExportPreviewProduct) {
  const price = product.promotionPrice ?? product.basePrice;
  return `฿${Number(price || 0).toLocaleString()}`;
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
    contents: [
      {
        type: 'image',
        url: product.imageUrl || 'https://manager.cnypharmacy.com/uploads/product_photo/placeholder.jpg',
        size: 'full',
        aspectMode: 'cover',
        aspectRatio: '1:1',
        gravity: 'center',
      },
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
        type: 'text',
        text: formatPrice(product),
        size: 'xs',
        weight: 'bold',
        color: '#E11D48',
      },
      ...(badges.length
        ? [{
            type: 'box',
            layout: 'horizontal',
            spacing: '4px',
            contents: badges.map((badge) => ({
              type: 'box',
              layout: 'vertical',
              flex: 0,
              backgroundColor: '#0F172A',
              cornerRadius: '8px',
              paddingStart: '4px',
              paddingEnd: '4px',
              paddingTop: '2px',
              paddingBottom: '2px',
              contents: [{
                type: 'text',
                text: badge,
                size: 'xxs',
                color: '#FFFFFF',
                weight: 'bold',
                flex: 0,
              }],
            })),
          }]
        : []),
    ],
  };
}

export function buildFlexPayload(document: ExportPreviewDocument) {
  return {
    type: 'carousel',
    contents: document.bubbles.map((bubble) => ({
      type: 'bubble',
      size: 'giga',
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: '12px',
        paddingAll: '16px',
        contents: [
          {
            type: 'box',
            layout: 'vertical',
            spacing: '4px',
            contents: [
              {
                type: 'text',
                text: document.config.title,
                size: 'lg',
                weight: 'bold',
                color: '#111827',
                wrap: true,
              },
              {
                type: 'text',
                text: document.config.intro,
                size: 'sm',
                color: '#6B7280',
                wrap: true,
              },
            ],
          },
          ...bubble.grid.map((row) => ({
            type: 'box',
            layout: 'horizontal',
            spacing: '8px',
            contents: row.map((product) => buildProductCell(product)),
          })),
          {
            type: 'separator',
            margin: 'md',
          },
          {
            type: 'box',
            layout: 'vertical',
            spacing: '8px',
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
    })),
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
