# CNY Product Selector - Complete Enhancement Plan

> **Goal:** Sync 250 pages (6,250 products) + Display all API fields + Flex Message with 9 items/bubble

---

## 📊 Phase 1: Database Schema Update

### 1.1 Update Prisma Schema - Add Missing Fields

```prisma
model Product {
  id                Int       @id @default(autoincrement())
  productId         Int       @unique @map("product_id")
  sku               String    @unique
  barcode           String?
  name              String
  nameEn            String?   @map("name_en")
  specName          String?   @map("spec_name")
  
  // Pricing with level support
  basePrice         Decimal   @map("base_price") @db.Decimal(10, 2)
  salePrice         Decimal?  @map("sale_price") @db.Decimal(10, 2)
  promotionPrice    Decimal?  @map("promotion_price") @db.Decimal(10, 2)
  
  // Stock with expiry
  stockQuantity     Int       @default(0) @map("stock_quantity")
  stockUnit         String?   @map("stock_unit")
  expiryDate        DateTime? @map("expiry_date")
  
  // Status flags
  isRx              Boolean   @default(false) @map("is_rx")
  isPromotion       Boolean   @default(false) @map("is_promotion")
  isFlashsale       Boolean   @default(false) @map("is_flashsale")
  isBestseller      Boolean   @default(false) @map("is_bestseller")
  isRecommend       Boolean   @default(false) @map("is_recommend")
  isActive          Boolean   @default(true) @map("is_active")
  
  // JSON fields - Enhanced
  images            Json?     // product_photo array
  hashtags          Json?     // hashtags array
  units             Json?     // product_unit with contain
  prices            Json?     // product_price with levels
  stockDetails      Json?     // product_stock with expiry
  relatedProducts   Json?     @map("related_products")
  flashSaleInfo     Json?     @map("flash_sale_info") // For flash sale timing
  
  // Relations
  promotions        Promotion[]
  
  // Metadata
  productSubType    String?   @map("product_sub_type")
  customerBuyed     Int       @default(0) @map("customer_buyed")
  wishlists         Int       @default(0)
  
  // Timestamps
  createdAt         DateTime  @default(now()) @map("created_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")
  
  @@map("products")
}
```

### 1.2 Migration Steps

```bash
npx prisma migrate dev --name add_enhanced_fields
npx prisma generate
```

---

## 🔄 Phase 2: Enhanced Sync for Pages 1-250

### 2.1 Update Sync API to Store All Fields

**File:** `app/api/sync/route.ts`

```typescript
// Enhanced product upsert with all fields
await prisma.product.upsert({
  where: { productId: productData.id },
  update: {
    // Basic info
    sku: productData.sku,
    barcode: productData.barcode,
    name: productData.name,
    nameEn: productData.name_en,
    specName: productData.spec_name,
    
    // Enhanced pricing - store all price levels
    prices: item.product_price || [],
    basePrice: parseFloat(mainPrice?.price || '0'),
    promotionPrice: mainPrice?.promotion_price !== '0.00' 
      ? parseFloat(mainPrice.promotion_price) 
      : null,
    
    // Enhanced stock with expiry
    stockDetails: item.product_stock || [],
    stockQuantity: totalStock,
    expiryDate: earliestExpiry,
    
    // Status flags
    isRx: productData.is_rx === 1,
    isPromotion: productData.is_promotion === 1,
    isFlashsale: item.product_is_flashSale === 1,
    isBestseller: productData.is_bestseller === 1,
    isRecommend: item.product_is_recommend === 1,
    
    // Enhanced JSON fields
    images: item.product_photo || [],
    hashtags: this.parseHashtags(productData.hashtags, item.product_hashtag),
    units: item.product_unit || [],
    relatedProducts: item.related_products || [],
    flashSaleInfo: item.product_flasSale || [],
    
    // Metadata
    productSubType: productData.product_sub_type_lists,
    customerBuyed: item.customer_buyed || 0,
    wishlists: item.product_wishlists || 0,
  },
  create: { /* same fields */ }
});
```

### 2.2 Helper Functions

```typescript
// Parse hashtags from multiple sources
parseHashtags(hashtags: string[], hashtagObj: any[]): string[] {
  const result: string[] = [];
  
  // From hashtags array
  if (Array.isArray(hashtags)) {
    result.push(...hashtags.filter(h => h));
  }
  
  // From product_hashtag object
  if (Array.isArray(hashtagObj)) {
    hashtagObj.forEach(h => {
      if (h.hashtag) {
        try {
          const parsed = JSON.parse(h.hashtag);
          if (Array.isArray(parsed)) {
            result.push(...parsed);
          }
        } catch {
          // If not JSON, use as-is
          if (h.hashtag !== '[]') {
            result.push(h.hashtag);
          }
        }
      }
    });
  }
  
  return [...new Set(result)]; // Remove duplicates
}

// Calculate total stock
calculateTotalStock(stockArray: any[]): number {
  if (!Array.isArray(stockArray)) return 0;
  return stockArray.reduce((sum, s) => {
    return sum + parseFloat(s.stock_num || '0');
  }, 0);
}

// Find earliest expiry date
findEarliestExpiry(stockArray: any[]): Date | null {
  if (!Array.isArray(stockArray)) return null;
  const dates = stockArray
    .map(s => s.expiry_date)
    .filter(d => d)
    .map(d => new Date(d));
  return dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : null;
}
```

---

## 🎨 Phase 3: Enhanced ProductCard UI

### 3.1 Complete Product Display

**File:** `app/components/ProductCard.tsx`

```tsx
interface ProductCardProps {
  product: ProductWithRelations;
  selected: boolean;
  onToggle: () => void;
}

export default function ProductCard({ product, selected, onToggle }: ProductCardProps) {
  // Parse all JSON fields
  const images = product.images as Photo[] || [];
  const units = product.units as Unit[] || [];
  const prices = product.prices as PriceLevel[] || [];
  const hashtags = product.hashtags as string[] || [];
  const flashSale = product.flashSaleInfo as FlashSale[] || [];
  const stockDetails = product.stockDetails as StockDetail[] || [];
  
  // Find main display price
  const mainUnit = units[0];
  const mainPrice = prices[0]?.product_price?.[0];
  const displayPrice = product.promotionPrice || product.basePrice;
  const hasDiscount = product.promotionPrice && product.promotionPrice < product.basePrice;
  const discountPercent = hasDiscount
    ? Math.round(((Number(product.basePrice) - Number(product.promotionPrice)) / Number(product.basePrice)) * 100)
    : 0;
  
  return (
    <Card
      className={cn(
        "group relative overflow-hidden cursor-pointer transition-all duration-200",
        "hover:shadow-xl hover:-translate-y-1",
        selected ? "ring-2 ring-green-500 ring-offset-2 bg-green-50/50" : "border-gray-200"
      )}
      onClick={onToggle}
    >
      {/* Status Badges */}
      <div className="absolute top-2 left-2 z-10 flex flex-wrap gap-1 max-w-[80%]">
        {product.isFlashsale && (
          <Badge className="bg-red-500 text-white text-xs animate-pulse">
            ⚡ Flash Sale
          </Badge>
        )}
        {product.isBestseller && (
          <Badge className="bg-yellow-500 text-white text-xs">
            🔥 ขายดี
          </Badge>
        )}
        {product.isPromotion && (
          <Badge className="bg-orange-500 text-white text-xs">
            🏷️ โปรโมชั่น
          </Badge>
        )}
        {product.isRecommend && (
          <Badge className="bg-purple-500 text-white text-xs"
          
            ⭐ แนะนำ
          </Badge>
        )}
        {product.isRx && (
          <Badge variant="outline" className="bg-red-50 text-red-600 border-red-300 text-xs"
          
            💊 ยาตามใบสั่ง
          </Badge>
        )}
        {hasDiscount && discountPercent > 0 && (
          <Badge className="bg-green-500 text-white text-xs"
          
            -{discountPercent}%
          </Badge>
        )}
      </div>

      {/* Selection Indicator */}
      {selected && (
        <div className="absolute top-2 right-2 z-20 w-8 h-8 rounded-full bg-green-500 text-white 
                         flex items-center justify-center shadow-lg border-2 border-white">
          <Check className="w-5 h-5" />
        </div>
      )}

      {/* Image Section */}
      <div className="aspect-square bg-gray-100 relative overflow-hidden">
        {images[0]?.photo_path ? (
          <img
            src={`/api/image?path=${encodeURIComponent(images[0].photo_path)}`}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : null}
        <div className={cn(
          "w-full h-full flex flex-col items-center justify-center bg-gray-100",
          images[0]?.photo_path ? "absolute inset-0" : ""
        )}>
          <Package className="w-12 h-12 text-gray-300 mb-2" />
          <span className="text-xs text-gray-400 font-mono">{product.sku}</span>
        </div>
      </div>

      {/* Content */}
      <CardContent className="p-3 space-y-2">
        
        {/* Flash Sale Timer (if active) */}
        {flashSale.length > 0 && flashSale[0]?.end_time && (
          <div className="bg-red-500 text-white text-center py-1 px-2 rounded text-xs font-bold">
            ⏰ สิ้นสุด {new Date(flashSale[0].end_time).toLocaleDateString('th-TH')}
          </div>
        )}
        
        {/* Product Name - EN & TH */}
        <div className="space-y-1">
          {product.nameEn && (
            <p className="text-[10px] text-gray-400 uppercase tracking-wide truncate">
              {product.nameEn}
            </p>
          )}
          <h3 className="font-semibold text-sm text-gray-900 line-clamp-2 leading-tight">
            {product.name}
          </h3>
        </div>
        
        {/* Spec */}
        {product.specName && (
          <p className="text-xs text-gray-500 line-clamp-1 bg-gray-50 px-2 py-1 rounded">
            {product.specName}
          </p>
        )}
        
        {/* Promotion Badge */}
        {hasDiscount && (
          <div className="flex gap-1">
            <span className="px-2 py-0.5 bg-cyan-100 text-cyan-700 text-[10px] rounded">
              เริ่ม 0 ชิ้น
            </span>
            <span className="px-2 py-0.5 bg-cyan-100 text-cyan-700 text-[10px] rounded"
            
              ขั้นต่ำ 0 ชิ้น
            </span>
          </div>
        )}
        
        {/* SPECIAL OFFER Banner */}
        {hasDiscount && (
          <div className="bg-gradient-to-r from-red-500 to-pink-500 text-white 
                           text-center py-1.5 px-2 rounded-md text-xs font-bold shadow-sm"
          
            SPECIAL OFFER -{discountPercent}%
          </div>
        )}
        
        {/* Stock Status */}
        <div className="flex items-center justify-center gap-2 py-1">
          <div className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center",
            product.stockQuantity > 0 
              ? "bg-green-500 text-white" 
              : "bg-red-500 text-white"
          )}>
            {product.stockQuantity > 0 ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
          </div>
          <span className={cn(
            "text-xs font-medium",
            product.stockQuantity > 0 ? "text-green-600" : "text-red-500"
          )}>
            {product.stockQuantity > 0 
              ? `คงเหลือ ${product.stockQuantity.toLocaleString()} ${product.stockUnit || 'ชิ้น'}`
              : 'สินค้าหมด'}
          </span>
        </div>

        {/* SKU */}
        <p className="text-[10px] text-gray-400 text-center font-mono"
        
          รหัส: {product.sku} | บาร์โค้ด: {product.barcode || '-'}
        </p>
        
        {/* Promotion Condition */}
        {hasDiscount && (
          <div className="border border-red-200 bg-red-50 rounded-md p-2 text-center"
          
            <p className="text-xs text-red-600">
              💰 ซื้อ 2 กล่อง(50ชิ้น) ขึ้นไป ลดต่อชิ้นละ 4.00 บาท
            </p>
          </div>
        )}
        
        {/* Price Display */}
        <div className="text-center pt-1">
          <div className="flex items-baseline justify-center gap-2">
            {hasDiscount && (
              <span className="text-sm text-gray-400 line-through"
              
                ฿{Number(product.basePrice).toLocaleString()}
              </span>
            )}
            <span className="text-xl font-bold text-red-600"
            
              ฿{Number(displayPrice).toLocaleString()}
            </span>
          </div>
          
          {mainUnit && (
            <p className="text-xs text-gray-500"
            
              ต่อ {mainUnit.unit} (บรรจุ {mainUnit.contain})
            </p>
          )}
        </div>
        
        {/* Units List */}
        {units.length > 1 && (
          <div className="flex flex-wrap gap-1 justify-center"
          
            {units.slice(1).map((u, i) => (
              <span key={i} className="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded"
              
                {u.unit}
              </span>
            ))}
          </div>
        )}
        
        {/* Hashtags */}
        {hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1 justify-center pt-1"
          
            {hashtags.slice(0, 4).map((tag, i) => (
              <span 
                key={i} 
                className="px-2 py-0.5 bg-yellow-300 text-yellow-800 text-[10px] rounded font-medium"
              
                #{tag}
              </span>
            ))}
            {hashtags.length > 4 && (
              <span className="text-[10px] text-gray-400"
              
                +{hashtags.length - 4}
              </span>
            )}
          </div>
        )}
        
        {/* Additional Stats */}
        <div className="flex justify-between text-[10px] text-gray-400 pt-1 border-t"
        
          <span>👁 {product.customerBuyed} ซื้อแล้ว</span>
          <span>❤️ {product.wishlists} ถูกใจ</span>
        </div>
        
      </CardContent>
    </Card>
  );
}
```

---

## 🎯 Phase 4: Flex Message with 9 Items/Bubble

### 4.1 Enhanced Flex Generator

**File:** `app/api/flex-message/route.ts` or `lib/flex-generator.ts`

```typescript
interface FlexMessageConfig {
  products: Product[];
  template: 'flashsale' | 'promotion' | 'bestseller' | 'default';
  itemsPerBubble?: number; // Default: 9
}

export function generateFlexMessage(config: FlexMessageConfig) {
  const { products, template = 'default', itemsPerBubble = 9 } = config;
  
  // Group products into bubbles (9 items per bubble)
  const bubbles: any[] = [];
  
  for (let i = 0; i < products.length; i += itemsPerBubble) {
    const group = products.slice(i, i + itemsPerBubble);
    
    const bubble = {
      type: 'bubble',
      size: 'giga', // Large bubble for 9 items
      header: generateHeader(template, i / itemsPerBubble + 1),
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: group.map((product, index) => 
          generateProductRow(product, index + 1)
        )
      },
      footer: generateFooter(i / itemsPerBubble + 1, Math.ceil(products.length / itemsPerBubble))
    };
    
    bubbles.push(bubble);
  }
  
  return {
    type: 'carousel',
    contents: bubbles
  };
}

function generateProductRow(product: Product, index: number) {
  const images = product.images as any[] || [];
  const hasDiscount = product.promotionPrice && product.promotionPrice < product.basePrice;
  const displayPrice = product.promotionPrice || product.basePrice;
  
  return {
    type: 'box',
    layout: 'horizontal',
    spacing: 'sm',
    paddingAll: 'sm',
    backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8f9fa',
    contents: [
      // Image
      {
        type: 'image',
        url: images[0]?.photo_path 
          ? `https://www.cnypharmacy.com/${images[0].photo_path}`
          : 'https://via.placeholder.com/80',
        size: 'xs',
        aspectRatio: '1:1',
        flex: 1
      },
      // Info
      {
        type: 'box',
        layout: 'vertical',
        flex: 4,
        spacing: 'xs',
        contents: [
          // Name
          {
            type: 'text',
            text: `${index}. ${product.name}`.substring(0, 40),
            size: 'sm',
            weight: 'bold',
            wrap: true,
            maxLines: 2
          },
          // SKU + Status
          {
            type: 'box',
            layout: 'horizontal',
            spacing: 'xs',
            contents: [
              {
                type: 'text',
                text: `SKU: ${product.sku}`,
                size: 'xs',
                color: '#888888',
                flex: 2
              },
              ...(product.isRx ? [{
                type: 'text',
                text: '💊 RX',
                size: 'xs',
                color: '#dc2626',
                weight: 'bold'
              }] : []),
              ...(product.isBestseller ? [{
                type: 'text',
                text: '🔥 ขายดี',
                size: 'xs',
                color: '#ea580c',
                weight: 'bold'
              }] : [])
            ]
          },
          // Price
          {
            type: 'box',
            layout: 'horizontal',
            spacing: 'sm',
            alignItems: 'center',
            contents: [
              ...(hasDiscount ? [{
                type: 'text',
                text: `฿${Number(product.basePrice).toLocaleString()}`,
                size: 'xs',
                color: '#9ca3af',
                decoration: 'line-through'
              }] : []),
              {
                type: 'text',
                text: `฿${Number(displayPrice).toLocaleString()}`,
                size: 'lg',
                color: '#dc2626',
                weight: 'bold'
              },
              ...(hasDiscount ? [{
                type: 'box',
                layout: 'vertical',
                backgroundColor: '#dc2626',
                paddingAll: 'xs',
                cornerRadius: 'sm',
                contents: [{
                  type: 'text',
                  text: `-${Math.round(((Number(product.basePrice) - Number(displayPrice)) / Number(product.basePrice)) * 100)}%`,
                  size: 'xxs',
                  color: '#ffffff',
                  weight: 'bold'
                }]
              }] : [])
            ]
          },
          // Stock
          {
            type: 'text',
            text: product.stockQuantity > 0 
              ? `✅ คงเหลือ: ${product.stockQuantity} ${product.stockUnit || 'ชิ้น'}`
              : '❌ สินค้าหมด',
            size: 'xs',
            color: product.stockQuantity > 0 ? '#16a34a' : '#dc2626'
          }
        ]
      }
    ]
  };
}

function generateHeader(template: string, bubbleNumber: number) {
  const colors = {
    flashsale: '#dc2626',
    promotion: '#ea580c',
    bestseller: '#16a34a',
    default: '#2563eb'
  };
  
  const titles = {
    flashsale: '⚡ FLASH SALE',
    promotion: '🏷️ โปรโมชั่นพิเศษ',
    bestseller: '🔥 สินค้าขายดี',
    default: '📦 สินค้าแนะนำ'
  };
  
  return {
    type: 'box',
    layout: 'vertical',
    backgroundColor: colors[template] || colors.default,
    paddingAll: 'md',
    contents: [
      {
        type: 'text',
        text: `${titles[template] || titles.default} (หน้า ${bubbleNumber})`,
        color: '#ffffff',
        weight: 'bold',
        size: 'lg',
        align: 'center'
      }
    ]
  };
}

function generateFooter(currentPage: number, totalPages: number) {
  return {
    type: 'box',
    layout: 'vertical',
    backgroundColor: '#f3f4f6',
    paddingAll: 'sm',
    contents: [
      {
        type: 'text',
        text: `หน้า ${currentPage} จาก ${totalPages} | สนใจสั่งซื้อทักแชทได้เลยค่ะ 💬`,
        size: 'xs',
        color: '#6b7280',
        align: 'center'
      }
    ]
  };
}
```

---

## 📱 Phase 5: UI Enhancements

### 5.1 Add Bulk Select for Flex Generation

```tsx
// In ProductSelector.tsx
const [flexItemsPerBubble, setFlexItemsPerBubble] = useState(9);

// Generate Flex with custom items per bubble
const generateFlexMessage = () => {
  const selectedProducts = products.filter(p => selectedItems.has(p.productId));
  
  const flexMessage = generateFlexMessageLib({
    products: selectedProducts,
    template: activeFilter === 'flashsale' ? 'flashsale' : 
              activeFilter === 'promotion' ? 'promotion' :
              activeFilter === 'bestseller' ? 'bestseller' : 'default',
    itemsPerBubble: flexItemsPerBubble
  });
  
  return flexMessage;
};
```

### 5.2 Add Page Range Sync UI

```tsx
<div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg"
  <span className="text-sm text-gray-600">Sync หน้า:</span>
  <Input 
    type="number" 
    value={syncStartPage} 
    onChange={(e) => setSyncStartPage(Number(e.target.value))}
    className="w-20"
    min={1}
  />
  <span>ถึง</span>
  <Input 
    type="number" 
    value={syncEndPage} 
    onChange={(e) => setSyncEndPage(Number(e.target.value))}
    className="w-20"
    min={1}
    max={250}
    placeholder="250"
  />
  <Button onClick={() => syncProducts(syncStartPage, syncEndPage)}
    Sync ข้อมูล
  </Button>
</div>
```

---

## 🚀 Implementation Order

### Priority 1 (Critical)
1. ✅ Update Database Schema
2. ✅ Enhanced Sync API (store all fields)
3. ✅ Sync pages 1-250

### Priority 2 (UI)
4. Enhanced ProductCard with all fields
5. Flex Message generator (9 items/bubble)
6. Page range sync UI

### Priority 3 (Polish)
7. Flash sale timer
8. Auto-resume sync
9. Bulk operations

---

## 📊 Expected Results

| Metric | Value |
|--------|-------|
| Total Products | ~6,250 (250 pages × 25 items) |
| Flex Message Bubbles | 694 bubbles for 6,250 items |
| Items per Bubble | 9 |
| Sync Time | ~30-45 minutes (step-by-step) |

**Ready to implement?** เริ่มจาก Phase 1 หรือ Phase ไหนก่อนครับ?