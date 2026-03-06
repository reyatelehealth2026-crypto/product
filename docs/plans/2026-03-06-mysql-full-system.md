# CNY Product Selector - MySQL Database + Full System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** สร้างระบบบันทึกข้อมูลสินค้าจาก API ลง MySQL พร้อมแสดงผลแบบละเอียดและ Generate Flex Message

**Architecture:** 
- MySQL Database เก็บข้อมูลสินค้าและโปรโมชั่น (แก้ปัญหา API ช้า)
- Prisma ORM สำหรับ Type-safe queries
- API Routes สำหรับ Sync, Query, และ Generate Flex
- UI Components แสดงผลแบบ Grid พร้อมรายละเอียดครบถ้วน

**Tech Stack:** Next.js 15 + Prisma + MySQL + Tailwind + shadcn/ui

**Database Connection:** `mysql://zrismpsz_item:zrismpsz_item@118.27.146.16:3306/zrismpsz_item`

---

## Task 1: Setup Prisma + MySQL Connection

**Files:**
- Create: `prisma/schema.prisma`
- Modify: `package.json`
- Create: `.env.local`

**Step 1: Install dependencies**

```bash
cd /root/.openclaw/workspace/cny-product-selector
npm install prisma @prisma/client
npm install -D prisma
```

**Step 2: Initialize Prisma**

```bash
npx prisma init
```

**Step 3: Create schema.prisma**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model Product {
  id                Int       @id @default(autoincrement())
  productId         Int       @unique @map("product_id")
  sku               String    @unique
  barcode           String?
  name              String
  nameEn            String?   @map("name_en")
  specName          String?   @map("spec_name")
  basePrice         Decimal   @map("base_price") @db.Decimal(10, 2)
  salePrice         Decimal?  @map("sale_price") @db.Decimal(10, 2)
  promotionPrice    Decimal?  @map("promotion_price") @db.Decimal(10, 2)
  stockQuantity     Int       @default(0) @map("stock_quantity")
  stockUnit         String?   @map("stock_unit")
  
  // Status flags
  isRx              Boolean   @default(false) @map("is_rx")
  isPromotion       Boolean   @default(false) @map("is_promotion")
  isFlashsale       Boolean   @default(false) @map("is_flashsale")
  isBestseller      Boolean   @default(false) @map("is_bestseller")
  isRecommend       Boolean   @default(false) @map("is_recommend")
  isActive          Boolean   @default(true) @map("is_active")
  
  // JSON fields
  images            Json?
  hashtags          Json?
  units             Json?
  relatedProducts   Json?     @map("related_products")
  
  // Relations
  promotions        Promotion[]
  
  // Timestamps
  createdAt         DateTime  @default(now()) @map("created_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")
  
  @@map("products")
}

model Promotion {
  id              Int       @id @default(autoincrement())
  productId       Int       @map("product_id")
  type            String    // 'flashsale', 'percent_off', 'bundle', 'buy_x_get_y'
  
  // Display
  badgeText       String?   @map("badge_text")
  badgeColor      String?   @map("badge_color")
  
  // Pricing Rules
  discountPercent Int?      @map("discount_percent")
  discountAmount  Decimal?  @map("discount_amount") @db.Decimal(10, 2)
  minQuantity     Int       @default(1) @map("min_quantity")
  
  // Bundle Rules (JSON)
  bundleRules     Json?     @map("bundle_rules")
  
  // Duration
  startDate       DateTime? @map("start_date")
  endDate         DateTime? @map("end_date")
  
  // Status
  isActive        Boolean   @default(true) @map("is_active")
  
  // Relations
  product         Product   @relation(fields: [productId], references: [productId], onDelete: Cascade)
  
  @@map("promotions")
}

model SyncLog {
  id            Int      @id @default(autoincrement())
  syncType      String   @map("sync_type")
  itemsCount    Int      @map("items_count")
  status        String
  errorMessage  String?  @map("error_message")
  createdAt     DateTime @default(now()) @map("created_at")
  
  @@map("sync_logs")
}
```

**Step 4: Update .env.local**

```env
DATABASE_URL="mysql://zrismpsz_item:zrismpsz_item@118.27.146.16:3306/zrismpsz_item"
```

**Step 5: Push schema to database**

```bash
npx prisma db push
```

Expected: Tables created in MySQL

**Step 6: Generate Prisma Client**

```bash
npx prisma generate
```

**Step 7: Commit**

```bash
git add prisma/ .env.local package*.json
git commit -m "feat: setup Prisma with MySQL schema"
```

---

## Task 2: Create Database Client Singleton

**Files:**
- Create: `lib/db.ts`

**Step 1: Create database client**

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

**Step 2: Commit**

```bash
git add lib/db.ts
git commit -m "feat: add Prisma client singleton"
```

---

## Task 3: Create Sync API (Fetch API → Save DB)

**Files:**
- Create: `app/api/sync/route.ts`

**Step 1: Create sync API route**

```typescript
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
  }>;
  product_price: Array<{
    product_price: Array<{
      price: string;
      promotion_price: string;
    }>;
  }>;
  product_stock: Array<{
    stock_num: string;
    unit_name: string;
  }>;
  product_photo: Array<{
    photo_path: string;
  }>;
  product_unit: Array<{
    id: number;
    unit: string;
    unit_num: number;
    contain: number;
  }>;
  related_products: Array<{
    id: number;
    name: string;
  }>;
  product_is_flashSale: number;
  product_is_recommend: number;
  customer_buyed: number;
}

export async function POST(request: NextRequest) {
  try {
    // Fetch from API
    const response = await fetch(
      'https://www.cnypharmacy.com/api/getDataProductIsGroup?page=1&sort_product_name=asc&isPageGroup=8&paginate_num=1000',
      { next: { revalidate: 0 } }
    );
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    const products: ApiProduct[] = data.product || [];
    
    let successCount = 0;
    let errorCount = 0;
    
    // Process each product
    for (const item of products) {
      try {
        const productData = item.product_data?.[0];
        const productPrice = item.product_price?.[0]?.product_price?.[0];
        const productStock = item.product_stock?.[0];
        
        if (!productData) continue;
        
        // Upsert product
        await prisma.product.upsert({
          where: { productId: productData.id },
          update: {
            sku: productData.sku,
            barcode: productData.barcode || null,
            name: productData.name,
            nameEn: productData.name_en || null,
            specName: productData.spec_name || null,
            basePrice: parseFloat(productPrice?.price || '0'),
            promotionPrice: productPrice?.promotion_price !== '0.00' 
              ? parseFloat(productPrice.promotion_price) 
              : null,
            stockQuantity: parseInt(productStock?.stock_num || '0'),
            stockUnit: productStock?.unit_name || null,
            isRx: productData.is_rx === 1,
            isPromotion: productData.is_promotion === 1,
            isFlashsale: item.product_is_flashSale === 1,
            isBestseller: productData.is_bestseller === 1,
            isRecommend: item.product_is_recommend === 1,
            images: item.product_photo || [],
            hashtags: productData.hashtags || [],
            units: item.product_unit || [],
            relatedProducts: item.related_products || [],
          },
          create: {
            productId: productData.id,
            sku: productData.sku,
            barcode: productData.barcode || null,
            name: productData.name,
            nameEn: productData.name_en || null,
            specName: productData.spec_name || null,
            basePrice: parseFloat(productPrice?.price || '0'),
            promotionPrice: productPrice?.promotion_price !== '0.00' 
              ? parseFloat(productPrice.promotion_price) 
              : null,
            stockQuantity: parseInt(productStock?.stock_num || '0'),
            stockUnit: productStock?.unit_name || null,
            isRx: productData.is_rx === 1,
            isPromotion: productData.is_promotion === 1,
            isFlashsale: item.product_is_flashSale === 1,
            isBestseller: productData.is_bestseller === 1,
            isRecommend: item.product_is_recommend === 1,
            images: item.product_photo || [],
            hashtags: productData.hashtags || [],
            units: item.product_unit || [],
            relatedProducts: item.related_products || [],
          },
        });
        
        successCount++;
      } catch (err) {
        console.error(`Error processing product:`, err);
        errorCount++;
      }
    }
    
    // Log sync
    await prisma.syncLog.create({
      data: {
        syncType: 'full',
        itemsCount: successCount,
        status: errorCount === 0 ? 'success' : 'partial',
        errorMessage: errorCount > 0 ? `${errorCount} items failed` : null,
      },
    });
    
    return NextResponse.json({
      success: true,
      message: `Synced ${successCount} products (${errorCount} errors)`,
      total: products.length,
    });
    
  } catch (error) {
    console.error('Sync error:', error);
    
    await prisma.syncLog.create({
      data: {
        syncType: 'full',
        itemsCount: 0,
        status: 'error',
        errorMessage: (error as Error).message,
      },
    });
    
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

// Get sync status
export async function GET() {
  const latestSync = await prisma.syncLog.findFirst({
    orderBy: { createdAt: 'desc' },
  });
  
  const productCount = await prisma.product.count();
  
  return NextResponse.json({
    lastSync: latestSync,
    totalProducts: productCount,
  });
}
```

**Step 2: Commit**

```bash
git add app/api/sync/route.ts
git commit -m "feat: add sync API to fetch and save products to MySQL"
```

---

## Task 4: Create Products Query API

**Files:**
- Create: `app/api/products/route.ts`

**Step 1: Create products API with filtering**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Query params
    const search = searchParams.get('search') || '';
    const filter = searchParams.get('filter') || 'all';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '24');
    const sortBy = searchParams.get('sortBy') || 'name';
    const sortOrder = searchParams.get('sortOrder') || 'asc';
    
    // Build where clause
    const where: Prisma.ProductWhereInput = {
      isActive: true,
    };
    
    // Search
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { nameEn: { contains: search } },
        { sku: { contains: search } },
        { barcode: { contains: search } },
      ];
    }
    
    // Filter
    switch (filter) {
      case 'flashsale':
        where.isFlashsale = true;
        break;
      case 'promotion':
        where.isPromotion = true;
        break;
      case 'new':
        where.isRecommend = true;
        break;
      case 'bestseller':
        where.isBestseller = true;
        break;
      case 'rx':
        where.isRx = true;
        break;
    }
    
    // Build orderBy
    const orderBy: Prisma.ProductOrderByWithRelationInput = {};
    if (sortBy === 'price') {
      orderBy.basePrice = sortOrder as Prisma.SortOrder;
    } else if (sortBy === 'stock') {
      orderBy.stockQuantity = sortOrder as Prisma.SortOrder;
    } else {
      orderBy.name = sortOrder as Prisma.SortOrder;
    }
    
    // Query with pagination
    const skip = (page - 1) * limit;
    
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          promotions: {
            where: { isActive: true },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);
    
    return NextResponse.json({
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
    
  } catch (error) {
    console.error('Products API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}
```

**Step 2: Commit**

```bash
git add app/api/products/route.ts
git commit -m "feat: add products query API with filtering and pagination"
```

---

## Task 5: Create Product Detail Card Component

**Files:**
- Create: `app/components/ProductCard.tsx`

**Step 1: Create detailed product card**

```tsx
'use client';

import React from 'react';
import { Check, Package } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Product, Promotion } from '@prisma/client';

interface ProductWithPromotions extends Product {
  promotions: Promotion[];
}

interface ProductCardProps {
  product: ProductWithPromotions;
  selected: boolean;
  onToggle: () => void;
}

export default function ProductCard({ product, selected, onToggle }: ProductCardProps) {
  const images = (product.images as Array<{ photo_path: string }>) || [];
  const hashtags = (product.hashtags as string[]) || [];
  const units = (product.units as Array<{ unit: string; contain: number }>) || [];
  
  const displayPrice = product.promotionPrice || product.salePrice || product.basePrice;
  const hasDiscount = product.promotionPrice && product.promotionPrice < product.basePrice;
  const discountPercent = hasDiscount
    ? Math.round(((Number(product.basePrice) - Number(product.promotionPrice!)) / Number(product.basePrice)) * 100)
    : 0;
  
  const activePromotion = product.promotions[0];

  return (
    <Card
      className={cn(
        "group relative overflow-hidden cursor-pointer transition-all duration-200",
        "hover:shadow-lg hover:-translate-y-1",
        selected
          ? "ring-2 ring-green-500 ring-offset-2 bg-green-50/50"
          : "border-gray-200 hover:border-green-300"
      )}
      onClick={onToggle}
    >
      {/* Selection Indicator */}
      {selected && (
        <div className="absolute top-2 right-2 z-20 w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center shadow-md">
          <Check className="w-4 h-4" />
        </div>
      )}

      {/* Badges */}
      <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
        {product.isFlashsale && (
          <Badge className="bg-red-500 text-white text-xs">Flash Sale</Badge>
        )}
        {product.isPromotion && !product.isFlashsale && (
          <Badge className="bg-orange-500 text-white text-xs">โปรโมชั่น</Badge>
        )}
        {product.isBestseller && (
          <Badge className="bg-green-500 text-white text-xs">ขายดี</Badge>
        )}
        {product.isRecommend && (
          <Badge className="bg-purple-500 text-white text-xs">แนะนำ</Badge>
        )}
        {product.isRx && (
          <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 text-xs">
            ยาตามใบสั่ง
          </Badge>
        )}
      </div>

      {/* Image */}
      <div className="aspect-square bg-gray-100 relative overflow-hidden">
        {images[0]?.photo_path ? (
          <img
            src={`https://www.cnypharmacy.com/${images[0].photo_path}`}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : null}
        <div className={cn(
          "w-full h-full flex items-center justify-center bg-gray-100",
          images[0]?.photo_path && "absolute inset-0 -z-10"
        )}>
          <Package className="w-10 h-10 text-gray-300" />
        </div>
      </div>

      {/* Content */}
      <CardContent className="p-3 space-y-2">
        {/* SKU */}
        <p className="text-[10px] text-gray-400 font-mono">{product.sku}</p>
        
        {/* Name */}
        <h3 className="font-medium text-sm text-gray-900 line-clamp-2 min-h-[2.5rem] leading-tight">
          {product.name}
        </h3>
        
        {/* Spec */}
        {product.specName && (
          <p className="text-xs text-gray-500 line-clamp-1">{product.specName}</p>
        )}
        
        {/* Promotion Details */}
        {activePromotion && (
          <div className="bg-orange-50 border border-orange-200 rounded-md p-2 text-xs">
            <p className="font-medium text-orange-700">
              {activePromotion.badgeText || 'โปรโมชั่นพิเศษ'}
            </p>
            {activePromotion.startDate && activePromotion.endDate && (
              <p className="text-orange-600 mt-0.5">
                {new Date(activePromotion.startDate).toLocaleDateString('th-TH')} - {new Date(activePromotion.endDate).toLocaleDateString('th-TH')}
              </p>
            )}
            {activePromotion.discountPercent && (
              <p className="text-red-600 font-bold mt-0.5">
                ลด {activePromotion.discountPercent}%
              </p>
            )}
          </div>
        )}
        
        {/* Hashtags */}
        {hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {hashtags.slice(0, 3).map((tag, i) => (
              <span key={i} className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                #{tag}
              </span>
            ))}
            {hashtags.length > 3 && (
              <span className="text-[10px] text-gray-400">+{hashtags.length - 3}</span>
            )}
          </div>
        )}
        
        {/* Units */}
        {units.length > 0 && (
          <p className="text-xs text-gray-500">
            {units.map(u => `${u.contain} ${u.unit}`).join(', ')}
          </p>
        )}
        
        {/* Price */}
        <div className="flex items-baseline gap-2 pt-1">
          <span className="text-lg font-bold text-red-600">
            ฿{Number(displayPrice).toLocaleString()}
          </span>
          {hasDiscount && (
            <>
              <span className="text-xs text-gray-400 line-through">
                ฿{Number(product.basePrice).toLocaleString()}
              </span>
              <Badge className="bg-red-100 text-red-600 text-xs">
                -{discountPercent}%
              </Badge>
            </>
          )}
        </div>
        
        {/* Stock */}
        <p className={cn(
          "text-xs",
          product.stockQuantity < 10 ? "text-red-500" : "text-green-600"
        )}>
          คงเหลือ: {product.stockQuantity} {product.stockUnit || 'ชิ้น'}
        </p>
      </CardContent>
    </Card>
  );
}
```

**Step 2: Commit**

```bash
git add app/components/ProductCard.tsx
git commit -m "feat: add detailed ProductCard component with promotions"
```

---

## Task 6: Update Main ProductSelector with Database Integration

**Files:**
- Modify: `app/ProductSelector.tsx`

**Step 1: Replace with database-powered version**

```tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  Package,
  Check,
  Zap,
  Tag,
  Sparkles,
  TrendingUp,
  X,
  Share2,
  Copy,
  Download,
  RefreshCw,
  Database
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import ProductCard from './components/ProductCard';
import type { Product, Promotion } from '@prisma/client';

type FilterType = 'all' | 'flashsale' | 'promotion' | 'new' | 'bestseller' | 'rx';

interface ProductWithPromotions extends Product {
  promotions: Promotion[];
}

const FILTERS: { key: FilterType; label: string; icon: React.ElementType; color: string }[] = [
  { key: 'all', label: 'ทั้งหมด', icon: Package, color: 'text-gray-700' },
  { key: 'flashsale', label: 'Flash Sale', icon: Zap, color: 'text-red-600' },
  { key: 'promotion', label: 'โปรโมชั่น', icon: Tag, color: 'text-orange-600' },
  { key: 'new', label: 'สินค้าใหม่', icon: Sparkles, color: 'text-purple-600' },
  { key: 'bestseller', label: 'ขายดี', icon: TrendingUp, color: 'text-green-600' },
  { key: 'rx', label: 'ยาตามใบสั่ง', icon: Package, color: 'text-red-600' },
];

export default function ProductSelector() {
  const [products, setProducts] = useState<ProductWithPromotions[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [showFlexDialog, setShowFlexDialog] = useState(false);
  const [copied, setCopied] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 24,
    total: 0,
    totalPages: 1,
  });

  // Fetch products from API
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search: searchQuery,
        filter: activeFilter,
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      
      const response = await fetch(`/api/products?${params}`);
      const data = await response.json();
      
      setProducts(data.products);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, activeFilter, pagination.page, pagination.limit]);

  // Sync products from external API
  const syncProducts = async () => {
    setSyncing(true);
    setSyncStatus(null);
    try {
      const response = await fetch('/api/sync', { method: 'POST' });
      const data = await response.json();
      
      if (data.success) {
        setSyncStatus(`Sync สำเร็จ: ${data.message}`);
        fetchProducts(); // Refresh list
      } else {
        setSyncStatus(`Sync ล้มเหลว: ${data.error}`);
      }
    } catch (error) {
      setSyncStatus('Sync ล้มเหลว: Network error');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Toggle selection
  const toggleSelection = useCallback((productId: number) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  }, []);

  const clearSelections = useCallback(() => {
    setSelectedItems(new Set());
  }, []);

  // Generate Flex Message
  const generateFlexMessage = () => {
    const selectedProducts = products.filter(p => selectedItems.has(p.productId));
    
    const bubbles = selectedProducts.map(product => {
      const images = (product.images as Array<{ photo_path: string }>) || [];
      const displayPrice = product.promotionPrice || product.salePrice || product.basePrice;
      
      return {
        type: 'bubble',
        hero: images[0]?.photo_path ? {
          type: 'image',
          url: `https://www.cnypharmacy.com/${images[0].photo_path}`,
          size: 'full',
          aspectRatio: '1:1',
        } : undefined,
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: product.name,
              weight: 'bold',
              size: 'md',
              wrap: true,
            },
            {
              type: 'text',
              text: `รหัส: ${product.sku}`,
              size: 'xs',
              color: '#888888',
              margin: 'sm',
            },
            {
              type: 'box',
              layout: 'horizontal',
              margin: 'md',
              contents: [
                {
                  type: 'text',
                  text: `฿${Number(displayPrice).toLocaleString()}`,
                  weight: 'bold',
                  size: 'lg',
                  color: '#FF6B6B',
                },
              ],
            },
          ],
        },
      };
    });

    return {
      type: 'carousel',
      contents: bubbles,
    };
  };

  const flexMessageJson = JSON.stringify(generateFlexMessage(), null, 2);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(flexMessageJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadJSON = () => {
    const blob = new Blob([flexMessageJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flex-message-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const selectedCount = selectedItems.size;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex flex-col gap-3">
            {/* Top Row: Search + Actions */}
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="🔍 ค้นหาสินค้า (ชื่อ, SKU, Barcode...)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 border-gray-200 focus:border-green-500 focus:ring-green-500"
                />
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={syncProducts}
                  disabled={syncing}
                  className="whitespace-nowrap"
                >
                  <RefreshCw className={cn("w-4 h-4 mr-2", syncing && "animate-spin")} />
                  {syncing ? 'กำลัง Sync...' : 'Sync ข้อมูล'}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={fetchProducts}
                  className="whitespace-nowrap"
                >
                  <Database className="w-4 h-4 mr-2" />
                  โหลดจาก DB
                </Button>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {FILTERS.map(({ key, label, icon: Icon, color }) => (
                <button
                  key={key}
                  onClick={() => setActiveFilter(key)}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                    activeFilter === key
                      ? cn(color, "bg-gray-100 ring-2 ring-offset-1 ring-current")
                      : "text-gray-600 hover:bg-gray-100"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Sync Status */}
        {syncStatus && (
          <Alert className={cn(
            "mb-4",
            syncStatus.includes('สำเร็จ') ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
          )}>
            <AlertDescription>{syncStatus}</AlertDescription>
          </Alert>
        )}

        {/* Stats Bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              พบ <span className="font-semibold text-gray-900">{pagination.total}</span> รายการ
            </span>
            {selectedCount > 0 && (
              <span className="ml-2 text-green-600">
                | เลือกแล้ว <span className="font-semibold">{selectedCount}</span> รายการ
              </span>
            )}
          </div>
          
          {selectedCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelections}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <X className="w-4 h-4 mr-1" />
              ล้างการเลือก
            </Button>
          )}
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="text-center py-16">
            <RefreshCw className="w-10 h-10 mx-auto text-gray-400 animate-spin" />
            <p className="text-gray-500 mt-4">กำลังโหลด...</p>
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                selected={selectedItems.has(product.productId)}
                onToggle={() => toggleSelection(product.productId)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Package className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">ไม่พบสินค้า</h3>
            <p className="text-sm text-gray-500 mt-1">
              ลองค้นหาด้วยคำค้นอื่น หรือกด Sync เพื่อโหลดข้อมูลใหม่
            </p>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === 1}
              onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
            >
              ก่อนหน้า
            </Button>
            <span className="px-4 py-2 text-sm text-gray-600">
              หน้า {pagination.page} / {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === pagination.totalPages}
              onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
            >
              ถัดไป
            </Button>
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      {selectedCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3">
          <div className="bg-white rounded-full shadow-lg border px-4 py-2 flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold text-sm">
              {selectedCount}
            </div>
            <span className="text-sm font-medium text-gray-700">รายการที่เลือก</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 rounded-full hover:bg-red-50 hover:text-red-600"
              onClick={clearSelections}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <Button
            size="lg"
            className="bg-green-600 hover:bg-green-700 text-white shadow-lg rounded-full px-6"
            onClick={() => setShowFlexDialog(true)}
          >
            <Share2 className="w-5 h-5 mr-2" />
            สร้าง Flex Message
          </Button>
        </div>
      )}

      {/* Flex Message Dialog */}
      <Dialog open={showFlexDialog} onOpenChange={setShowFlexDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b bg-gray-50">
            <DialogTitle className="flex items-center gap-2 text-gray-900">
              <Zap className="w-5 h-5 text-yellow-500" />
              LINE Flex Message Preview
            </DialogTitle>
          </DialogHeader>

          <div className="p-6 space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                สินค้าที่เลือก ({selectedCount} รายการ)
              </h4>
              <ScrollArea className="h-32">
                <div className="space-y-2">
                  {products
                    .filter(p => selectedItems.has(p.productId))
                    .map((product, idx) => (
                      <div key={product.id} className="flex items-center justify-between text-sm bg-white p-2 rounded border">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold">
                            {idx + 1}
                          </span>
                          <span className="truncate max-w-[200px]">{product.name}</span>
                        </div>
                        <span className="font-medium text-red-600">
                          ฿{Number(product.promotionPrice || product.basePrice).toLocaleString()}
                        </span>
                      </div>
                    ))}
                </div>
              </ScrollArea>
            </div>

            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-700">JSON Output</h4>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={copyToClipboard}
                    className={cn(
                      "transition-colors",
                      copied && "bg-green-50 text-green-600 border-green-200"
                    )}
                  >
                    {copied ? <><Check className="w-4 h-4 mr-1" />คัดลอกแล้ว</> : <><Copy className="w-4 h-4 mr-1" />คัดลอก</>}
                  </Button>
                  <Button size="sm" variant="outline" onClick={downloadJSON}>
                    <Download className="w-4 h-4 mr-1" />ดาวน์โหลด
                  </Button>
                </div>
              </div>
              
              <ScrollArea className="h-64 bg-gray-900 rounded-lg">
                <pre className="p-4 text-xs font-mono text-green-400 whitespace-pre-wrap">{flexMessageJson}</pre>
              </ScrollArea>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
              <strong>💡 วิธีใช้:</strong> คัดลอก JSON ด้านบน แล้วนำไปใช้ใน LINE Messaging API หรือ Broadcast System
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add app/ProductSelector.tsx app/components/
git commit -m "feat: update ProductSelector with database integration and sync"
```

---

## Task 7: Run Database Migration and Test

**Step 1: Push schema to MySQL**

```bash
cd /root/.openclaw/workspace/cny-product-selector
npx prisma db push
```

Expected: Database tables created successfully

**Step 2: Run sync to populate data**

```bash
curl -X POST http://localhost:3000/api/sync
```

Expected: Products synced to database

**Step 3: Build project**

```bash
npm run build
```

Expected: Build successful

**Step 4: Commit all changes**

```bash
git add .
git commit -m "feat: complete MySQL integration with sync, query, and UI"
git push origin main
```

---

**Plan complete! 🎉**

**Two execution options:**

**1. Subagent-Driven (this session)** - ดำเนินการทีละ Task ใน session นี้

**2. Parallel Session (separate)** - เปิด session ใหม่พร้อม executing-plans

**เลือกแบบไหนครับ?**