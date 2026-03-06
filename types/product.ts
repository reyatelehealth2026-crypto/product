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

// Generate Flex Message bubble for a product
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

// Generate Flex Message carousel
export function generateFlexMessage(products: SelectedProduct[], filterType: string = 'all'): object {
  const items = products.map(p => generateProductBubble(p.product, p.quantity, p.selectedUnit || undefined));
  
  // Header based on filter type
  let headerText = '📋 แคตตาล็อคสินค้า';
  let headerColor = '#15803D';
  let textColor = '#FFFFFF';
  
  switch (filterType) {
    case 'flashsale':
      headerText = '⚡ FLASH SALE ล้อดูร้อน ⚡';
      headerColor = '#FFD600';
      textColor = '#1e3a8a';
      break;
    case 'promotion':
      headerText = '🔥 โปรโมชั่นพิเศษ';
      headerColor = '#EA580C';
      break;
    case 'new':
      headerText = '✨ สินค้าใหม่';
      headerColor = '#7C3AED';
      break;
    case 'bestseller':
      headerText = '🏆 สินค้าขายดี';
      headerColor = '#CA8A04';
      break;
  }

  return {
    type: 'bubble',
    size: 'mega',
    header: {
      type: 'box',
      layout: 'vertical',
      backgroundColor: headerColor,
      paddingAll: '12px',
      alignItems: 'center',
      contents: [{
        type: 'text',
        text: headerText,
        color: textColor,
        weight: 'bold',
        size: 'md'
      }]
    },
    body: {
      type: 'box',
      layout: 'vertical',
      paddingAll: '12px',
      spacing: 'md',
      contents: [
        {
          type: 'carousel',
          contents: items
        }
      ]
    }
  };
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
