// Types for Product Catalog
export interface ProductData {
  id: number;
  sku: string;
  barcode: string;
  name_en: string;
  name: string;
  spec_name: string;
  is_recommend: number;
  is_promotion: number;
  is_bestseller: number;
  is_rx: number;
}

export interface ProductPhoto {
  photo_path: string;
}

export interface ProductUnit {
  id: number;
  target_id: number;
  unit: string;
  unit_num: string;
  contain: string;
}

export interface ProductPriceItem {
  id: number;
  price_level_id: number;
  product_unit_id: number;
  price: string;
  promotion_price: string;
  buy_max: number;
  buy_min: number;
}

export interface ProductPrice {
  product_price: ProductPriceItem[];
}

export interface ProductStock {
  productLotId: number;
  stock_num: string;
  expiry_date: string | null;
}

export interface Product {
  product_data: ProductData[];
  product_photo: ProductPhoto[];
  product_unit: ProductUnit[];
  product_price: ProductPrice[];
  product_stock: ProductStock[];
  product_wishlists: number;
  product_related_lists: any[];
  product_hashtag: any[];
  product_hashtag_new: any[];
  customer_buyed: number;
  product_is_flashSale: number;
  product_is_recommend: number;
  product_flasSale: any[];
  is_rx: number;
}

export interface SelectedProduct {
  product: Product;
  quantity: number;
  selectedUnit: ProductUnit | null;
}

// Flash Sale types from /api/flashsale/{id}
export interface FlashSaleInfo {
  flashsale_id: number;
  start_pro: string;
  end_pro: string;
  quota: number;
  usage: number;
  usage_show: number;
}

export interface FlashSaleProduct {
  id: number;
  productMasterID: number | null;
  sku: string;
  barcode: string;
  name_en: string;
  name: string;
  init_name: string;
  spec_name: string;
  photo_path: string;
  red_price: string;
  dark_price: string;
  discount: string;
  discount_type: string;
  min_item: number;
  max_item: number;
  unit: string;
  start_pro: number;
  end_pro: number;
  is_recommend: number;
  is_promotion: number;
  is_bestseller: number;
  product_is_flashSale: number;
  product_is_category: string | null;
  flasSale: FlashSaleInfo[];
  quota: number;
  usage: number;
  usage_show: number;
  ck_day: number;
  text_count: string;
  debug_end_pro: string;
}

export interface FlashSaleResponse {
  flashsale: FlashSaleProduct[][];
  flasSale_menu: { id: number; name: string; start_pro: string; end_pro: string; text: string }[];
  today: string;
  x: string;
}

// Unified item for broadcast flex message generation
export interface BroadcastItem {
  sku: string;
  name: string;
  photoUrl: string;
  salePrice: number;
  originalPrice: number;
  soldPercent: number;
  badge: string;
}

// Generate Flex Message bubble for a product (legacy micro bubble)
export function generateProductBubble(product: Product, quantity: number = 1, unit?: ProductUnit): object {
  const data = product.product_data[0];
  const price = product.product_price[0]?.product_price[0];
  const photo = product.product_photo[0];
  
  const displayPrice = price?.promotion_price !== '0.00' 
    ? parseFloat(price.promotion_price) 
    : parseFloat(price?.price || '0');
  const originalPrice = parseFloat(price?.price || '0');
  const hasDiscount = displayPrice < originalPrice && originalPrice > 0;

  return {
    type: 'bubble',
    size: 'micro',
    hero: photo ? {
      type: 'image',
      url: `https://www.cnypharmacy.com/${photo.photo_path}`,
      size: 'full',
      aspectRatio: '1:1',
      aspectMode: 'cover'
    } : undefined,
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      contents: [
        {
          type: 'text',
          text: data.name.substring(0, 35) + (data.name.length > 35 ? '...' : ''),
          weight: 'bold',
          size: 'sm',
          wrap: true,
          color: '#1a1a1a'
        },
        {
          type: 'box',
          layout: 'horizontal',
          spacing: 'sm',
          contents: [
            {
              type: 'text',
              text: `฿${displayPrice.toLocaleString()}`,
              weight: 'bold',
              size: 'lg',
              color: '#DC2626',
              flex: 0
            },
            ...(hasDiscount ? [{
              type: 'text',
              text: `฿${originalPrice.toLocaleString()}`,
              decoration: 'line-through',
              size: 'xs',
              color: '#9CA3AF',
              align: 'end' as const,
              flex: 1
            }] : [])
          ]
        },
        {
          type: 'text',
          text: unit ? `${quantity} ${unit.unit}` : `${quantity} ชิ้น`,
          size: 'xs',
          color: '#6B7280'
        }
      ]
    },
    footer: data.is_rx === 1 ? {
      type: 'box',
      layout: 'vertical',
      backgroundColor: '#FEF2F2',
      paddingAll: '8px',
      contents: [{
        type: 'text',
        text: '⚠️ ยาตามใบสั่งแพทย์',
        size: 'xs',
        color: '#DC2626',
        align: 'center',
        weight: 'bold'
      }]
    } : undefined
  };
}

// Convert Product to BroadcastItem
export function productToBroadcastItem(product: Product): BroadcastItem {
  const data = product.product_data[0];
  const price = product.product_price[0]?.product_price[0];
  const photo = product.product_photo[0];
  const stock = product.product_stock[0];

  const salePrice = price?.promotion_price !== '0.00'
    ? parseFloat(price.promotion_price)
    : parseFloat(price?.price || '0');
  const originalPrice = parseFloat(price?.price || '0');

  const stockNum = parseFloat(stock?.stock_num || '0');
  let soldPercent = 50;
  if (isNaN(stockNum) || stockNum <= 0) soldPercent = 100;
  else if (stockNum > 50) soldPercent = 20;
  else if (stockNum > 20) soldPercent = 50;
  else if (stockNum > 10) soldPercent = 75;
  else soldPercent = 90;

  let badge = 'โปรโมชั่น';
  if (product.product_is_flashSale === 1) badge = 'FlashSale';
  else if (data.is_promotion === 1) badge = 'โปรโมชั่น';
  else if (data.is_bestseller === 1) badge = 'ขายดี';
  else if (product.product_is_recommend === 1 || data.is_recommend === 1) badge = 'แนะนำ';

  return {
    sku: data.sku,
    name: data.name,
    photoUrl: photo ? `https://manager.cnypharmacy.com/${photo.photo_path}` : '',
    salePrice,
    originalPrice,
    soldPercent,
    badge,
  };
}

// Convert FlashSaleProduct to BroadcastItem
export function flashSaleToBroadcastItem(item: FlashSaleProduct): BroadcastItem {
  const salePrice = parseFloat(item.dark_price) || 0;
  const originalPrice = parseFloat(item.red_price) || 0;
  const quota = item.flasSale?.[0]?.quota || item.quota || 100;
  const usage = item.flasSale?.[0]?.usage || item.usage || 0;
  const soldPercent = quota > 0 ? Math.round((usage / quota) * 100) : 50;

  return {
    sku: item.sku,
    name: item.name,
    photoUrl: item.photo_path ? `https://manager.cnypharmacy.com/${item.photo_path}` : '',
    salePrice,
    originalPrice,
    soldPercent: Math.min(soldPercent, 99),
    badge: 'FlashSale',
  };
}

// Build a single product card for the mega grid
function buildProductCard(item: BroadcastItem): object {
  const hasDiscount = item.salePrice < item.originalPrice && item.originalPrice > 0;
  const badgeColor = item.badge === 'FlashSale' ? '#ef4444'
    : item.badge === 'โปรโมชั่น' ? '#f97316'
    : item.badge === 'แนะนำ' ? '#7c3aed'
    : item.badge === 'ขายดี' ? '#15803d'
    : '#6b7280';

  return {
    type: 'box',
    layout: 'vertical',
    flex: 1,
    borderWidth: '1px',
    borderColor: '#e5e7eb',
    cornerRadius: 'md',
    action: {
      type: 'uri',
      uri: `https://www.cnypharmacy.com/product/${item.sku}`,
    },
    contents: [
      {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'image',
            url: item.photoUrl || 'https://manager.cnypharmacy.com/uploads/product_photo/default.jpg',
            size: 'full',
            aspectMode: 'cover',
            aspectRatio: '1:1',
          },
          {
            type: 'box',
            layout: 'vertical',
            position: 'absolute',
            offsetTop: '4px',
            offsetStart: '4px',
            backgroundColor: badgeColor,
            cornerRadius: '100px',
            paddingStart: '4px',
            paddingEnd: '4px',
            contents: [
              {
                type: 'text',
                text: item.badge,
                color: '#ffffff',
                size: '8px',
                weight: 'bold',
              },
            ],
          },
        ],
      },
      {
        type: 'box',
        layout: 'vertical',
        paddingAll: '6px',
        spacing: 'xs',
        contents: [
          {
            type: 'text',
            text: item.name.length > 20 ? item.name.substring(0, 20) + '...' : item.name,
            size: '10px',
            weight: 'bold',
            color: '#1e3a8a',
            maxLines: 2,
            wrap: true,
          },
          {
            type: 'text',
            text: `฿${item.salePrice.toLocaleString()}`,
            size: 'xs',
            color: '#ef4444',
            weight: 'bold',
          },
          ...(hasDiscount
            ? [
                {
                  type: 'text',
                  text: `${item.originalPrice.toLocaleString()}`,
                  size: '10px',
                  color: '#9ca3af',
                  decoration: 'line-through',
                },
              ]
            : []),
          {
            type: 'box',
            layout: 'horizontal',
            backgroundColor: '#f97316',
            height: '4px',
            cornerRadius: '100px',
            margin: 'xs',
            contents: [
              {
                type: 'box',
                layout: 'vertical',
                backgroundColor: '#ef4444',
                width: `${Math.max(item.soldPercent, 5)}%`,
                cornerRadius: '100px',
                contents: [{ type: 'filler' }],
              },
            ],
          },
        ],
      },
    ],
  };
}

// Build a row of 3 product cards
function buildProductRow(items: BroadcastItem[]): object {
  const cards = items.map(buildProductCard);
  // Pad to 3 columns if needed
  while (cards.length < 3) {
    cards.push({ type: 'box', layout: 'vertical', flex: 1, contents: [{ type: 'filler' }] });
  }
  return {
    type: 'box',
    layout: 'horizontal',
    spacing: 'sm',
    contents: cards,
  };
}

export type BroadcastCategory = 'flashsale' | 'promotion' | 'new' | 'bestseller' | 'recommend' | 'all';

function getCategoryHeader(category: BroadcastCategory, bubbleIndex: number): { text: string; bgColor: string; textColor: string } {
  switch (category) {
    case 'flashsale':
      return { text: `⚡ FLASH SALE ล้อดูร้อน ⚡`, bgColor: '#ffd600', textColor: '#1e3a8a' };
    case 'promotion':
      return { text: `🔥 โปรโมชั่นพิเศษ`, bgColor: '#EA580C', textColor: '#ffffff' };
    case 'new':
      return { text: `✨ สินค้าใหม่`, bgColor: '#7C3AED', textColor: '#ffffff' };
    case 'bestseller':
      return { text: `🏆 สินค้าขายดี`, bgColor: '#CA8A04', textColor: '#ffffff' };
    case 'recommend':
      return { text: `💚 สินค้าแนะนำ`, bgColor: '#15803D', textColor: '#ffffff' };
    default:
      return { text: `📋 แคตตาล็อคสินค้า`, bgColor: '#1e3a8a', textColor: '#ffffff' };
  }
}

// Generate a single mega bubble with 9 products (3x3 grid)
export function generateMegaGridBubble(items: BroadcastItem[], category: BroadcastCategory, bubbleIndex: number = 0): object {
  const header = getCategoryHeader(category, bubbleIndex);
  const rows: object[] = [];

  for (let i = 0; i < items.length; i += 3) {
    rows.push(buildProductRow(items.slice(i, i + 3)));
  }

  // Pad to 3 rows if less
  while (rows.length < 3) {
    rows.push({
      type: 'box',
      layout: 'horizontal',
      spacing: 'sm',
      contents: [
        { type: 'box', layout: 'vertical', flex: 1, contents: [{ type: 'filler' }] },
        { type: 'box', layout: 'vertical', flex: 1, contents: [{ type: 'filler' }] },
        { type: 'box', layout: 'vertical', flex: 1, contents: [{ type: 'filler' }] },
      ],
    });
  }

  return {
    type: 'bubble',
    size: 'mega',
    header: {
      type: 'box',
      layout: 'vertical',
      backgroundColor: header.bgColor,
      paddingAll: '12px',
      alignItems: 'center',
      contents: [
        {
          type: 'text',
          text: header.text,
          color: header.textColor,
          weight: 'bold',
          size: 'md',
        },
      ],
    },
    body: {
      type: 'box',
      layout: 'vertical',
      paddingAll: '12px',
      spacing: 'md',
      contents: rows,
    },
  };
}

// Generate carousel with multiple mega bubbles (9 products each)
export function generateBroadcastCarousel(
  items: BroadcastItem[],
  category: BroadcastCategory,
  bubbleCount: number = 6
): object {
  const maxBubbles = Math.min(bubbleCount, 7);
  const productsPerBubble = 9;
  const bubbles: object[] = [];

  for (let i = 0; i < maxBubbles; i++) {
    const start = i * productsPerBubble;
    const end = start + productsPerBubble;
    const bubbleItems = items.slice(start, end);

    if (bubbleItems.length === 0) break;

    bubbles.push(generateMegaGridBubble(bubbleItems, category, i));
  }

  if (bubbles.length === 0) {
    return { type: 'carousel', contents: [] };
  }

  if (bubbles.length === 1) {
    return bubbles[0];
  }

  return {
    type: 'carousel',
    contents: bubbles,
  };
}

// Generate Flex Message (legacy - wraps selected products into broadcast carousel)
export function generateFlexMessage(products: SelectedProduct[], filterType: string = 'all'): object {
  const broadcastItems = products.map(p => productToBroadcastItem(p.product));
  const category = (filterType === 'all' ? 'all' : filterType) as BroadcastCategory;
  return generateBroadcastCarousel(broadcastItems, category, 6);
}

// Format helpers
export function formatPrice(price: string): string {
  const num = parseFloat(price);
  if (isNaN(num)) return '-';
  return `฿${num.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function getStockStatus(stockNum: string): { status: 'in_stock' | 'low_stock' | 'out_of_stock'; label: string; color: string } {
  const num = parseFloat(stockNum);
  if (isNaN(num) || num <= 0) {
    return { status: 'out_of_stock', label: 'สินค้าหมด', color: '#DC2626' };
  }
  if (num <= 10) {
    return { status: 'low_stock', label: 'ใกล้หมด', color: '#D97706' };
  }
  return { status: 'in_stock', label: 'มีสินค้า', color: '#15803D' };
}
