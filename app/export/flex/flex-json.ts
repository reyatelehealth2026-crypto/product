import type { ExportPreviewDocument, ExportPreviewProduct } from './export-types';
import { getProductUrlFromSku } from './export-helpers';

function formatPrice(value: number | null | undefined) {
  return Number(value || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function buildProductCard(product: ExportPreviewProduct | null): object {
  if (!product) {
    return {
      type: 'box',
      layout: 'vertical',
      flex: 1,
      backgroundColor: '#F8FAFC',
      cornerRadius: '16px',
      contents: [{ type: 'filler' }],
      height: '200px',
    };
  }

  const productUrl = product.productUrl || getProductUrlFromSku(product.sku);

  const salePrice = product.flashDarkPrice ?? product.flashPrice ?? product.promotionPrice ?? product.basePrice;
  const originalPrice = product.flashRedPrice ?? product.basePrice;
  const hasDiscount = originalPrice > salePrice;

  const minQty = product.flashMinQty ?? 0;
  const maxQty = product.flashMaxQty ?? 0;

  const dateStart = formatDate(product.offerStart);
  const dateEnd = formatDate(product.offerEnd);
  const hasDate = !!(dateStart || dateEnd);

  const promoLine1 = product.promoLine1 || '';
  const promoLine2 = product.promoLine2 || '';
  const hasPromo = !!(promoLine1 || promoLine2);

  const offerHeader = product.flashSaleName || 'SPECIAL OFFER';

  const unitLabel = (() => {
    const match = (product.name || '').match(/\[([^\]]+)\]/);
    return match ? match[1] : '';
  })();

  const salePriceText = unitLabel
    ? `${formatPrice(salePrice)} -/ ${unitLabel}`
    : `${formatPrice(salePrice)}`;

  const discountedText = unitLabel
    ? `ลดเหลือ ${formatPrice(originalPrice)} / ${unitLabel}`
    : `ลดเหลือ ${formatPrice(originalPrice)}`;

  return {
    type: 'bubble',
    size: 'nano',
    styles: {
      body: { backgroundColor: '#FFFFFF' },
    },
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'none',
      paddingTop: '0px',
      paddingBottom: '0px',
      borderColor: '#E53E3E',
      borderWidth: '2px',
      cornerRadius: '16px',
      contents: [
        // SPECIAL OFFER ribbon at top (overlapping border)
        {
          type: 'box',
          layout: 'horizontal',
          paddingTop: '0px',
          paddingBottom: '0px',
          contents: [
            {
              type: 'filler',
            },
            {
              type: 'box',
              layout: 'vertical',
              flex: 0,
              backgroundColor: '#C53030',
              cornerRadius: '12px',
              paddingTop: '6px',
              paddingBottom: '6px',
              paddingStart: '14px',
              paddingEnd: '14px',
              contents: [
                {
                  type: 'text',
                  text: offerHeader,
                  size: 'xxs',
                  weight: 'bold',
                  color: '#FFFFFF',
                },
              ],
            },
            {
              type: 'filler',
            },
          ],
        },

        // Product image
        {
          type: 'image',
          url: product.imageUrl || 'https://manager.cnypharmacy.com/uploads/product_photo/placeholder.jpg',
          size: 'full',
          aspectMode: 'fit',
          aspectRatio: '4:3',
          gravity: 'center',
          margin: '8px',
          action: { type: 'uri', uri: productUrl },
        },

        // Min/Max qty pills
        ...(minQty > 0 || maxQty > 0
          ? [
              {
                type: 'box',
                layout: 'horizontal',
                spacing: '4px',
                paddingStart: '8px',
                paddingEnd: '8px',
                paddingBottom: '4px',
                contents: [
                  ...(minQty > 0
                    ? [
                        {
                          type: 'box',
                          layout: 'vertical',
                          flex: 0,
                          backgroundColor: '#EBF8FF',
                          cornerRadius: '999px',
                          paddingStart: '8px',
                          paddingEnd: '8px',
                          paddingTop: '3px',
                          paddingBottom: '3px',
                          contents: [
                            {
                              type: 'text',
                              text: `ขั้นต่ำ ${minQty} ชิ้น`,
                              size: 'xxs',
                              color: '#2B6CB0',
                              flex: 0,
                            },
                          ],
                        },
                      ]
                    : []),
                  ...(maxQty > 0
                    ? [
                        {
                          type: 'box',
                          layout: 'vertical',
                          flex: 0,
                          backgroundColor: '#EBF8FF',
                          cornerRadius: '999px',
                          paddingStart: '8px',
                          paddingEnd: '8px',
                          paddingTop: '3px',
                          paddingBottom: '3px',
                          contents: [
                            {
                              type: 'text',
                              text: `จำกัด ${maxQty} ชิ้น`,
                              size: 'xxs',
                              color: '#2B6CB0',
                              flex: 0,
                            },
                          ],
                        },
                      ]
                    : []),
                ],
              },
            ]
          : []),

        // Date range box
        ...(hasDate
          ? [
              {
                type: 'box',
                layout: 'vertical',
                margin: '4px',
                borderColor: '#FC8181',
                borderWidth: '1px',
                cornerRadius: '6px',
                paddingStart: '5px',
                paddingEnd: '5px',
                paddingTop: '5px',
                paddingBottom: '5px',
                contents: [
                  ...(dateStart
                    ? [
                        {
                          type: 'box',
                          layout: 'horizontal',
                          contents: [
                            {
                              type: 'text',
                              text: 'เริ่ม ',
                              size: 'xxs',
                              color: '#E53E3E',
                              flex: 0,
                            },
                            {
                              type: 'text',
                              text: dateStart,
                              size: 'xxs',
                              color: '#E53E3E',
                              flex: 0,
                            },
                          ],
                        },
                      ]
                    : []),
                  ...(dateEnd
                    ? [
                        {
                          type: 'box',
                          layout: 'horizontal',
                          contents: [
                            {
                              type: 'text',
                              text: 'ถึง ',
                              size: 'xxs',
                              color: '#E53E3E',
                              flex: 0,
                            },
                            {
                              type: 'text',
                              text: dateEnd,
                              size: 'xxs',
                              color: '#E53E3E',
                              flex: 0,
                            },
                          ],
                        },
                      ]
                    : []),
                ],
              },
            ]
          : []),

        // Product name
        {
          type: 'box',
          layout: 'vertical',
          margin: '6px',
          paddingStart: '8px',
          paddingEnd: '8px',
          action: { type: 'uri', uri: productUrl },
          contents: [
            {
              type: 'text',
              text: product.name,
              size: 'xxs',
              color: '#1A5276',
              wrap: true,
              maxLines: 3,
              decoration: 'underline',
            },
          ],
        },

        // Promo conditions
        ...(hasPromo
          ? [
              {
                type: 'box',
                layout: 'vertical',
                margin: '4px',
                paddingStart: '8px',
                paddingEnd: '8px',
                contents: [
                  ...(promoLine1
                    ? [
                        {
                          type: 'text',
                          text: promoLine1,
                          size: 'xxs',
                          color: '#555555',
                          wrap: true,
                          maxLines: 2,
                        },
                      ]
                    : []),
                  ...(promoLine2
                    ? [
                        {
                          type: 'text',
                          text: promoLine2,
                          size: 'xxs',
                          color: '#555555',
                          wrap: true,
                          maxLines: 2,
                        },
                      ]
                    : []),
                ],
              },
            ]
          : []),

        // Sale price
        {
          type: 'box',
          layout: 'vertical',
          margin: '6px',
          paddingStart: '8px',
          paddingEnd: '8px',
          contents: [
            {
              type: 'text',
              text: salePriceText,
              size: 'sm',
              weight: 'bold',
              color: '#C53030',
              wrap: true,
            },
          ],
        },

        // Original price (if discounted)
        ...(hasDiscount
          ? [
              {
                type: 'box',
                layout: 'vertical',
                paddingStart: '8px',
                paddingEnd: '8px',
                contents: [
                  {
                    type: 'text',
                    text: discountedText,
                    size: 'xxs',
                    color: '#718096',
                  },
                ],
              },
            ]
          : []),

        // Buy button
        {
          type: 'button',
          style: 'primary',
          color: '#E53E3E',
          margin: '8px',
          height: 'sm',
          action: {
            type: 'uri',
            label: 'ซื้อเลย',
            uri: productUrl,
          },
        },
      ],
    },
  };
}

export function buildFlexPayload(document: ExportPreviewDocument) {
  // Each product becomes its own bubble in a carousel
  const allProducts = document.bubbles.flatMap((b) => b.products);

  return {
    type: 'carousel',
    contents: allProducts.map((product) => buildProductCard(product)),
  };
}

export function buildSingleBubbleFlexPayload(document: ExportPreviewDocument, bubbleIndex: number) {
  const bubble = document.bubbles[bubbleIndex];
  if (!bubble) return null;

  return {
    type: 'carousel',
    contents: bubble.products.map((product) => buildProductCard(product)),
  };
}
