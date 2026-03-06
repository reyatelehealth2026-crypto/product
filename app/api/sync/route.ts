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

// Resume sync from last synced product ID
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { 
      resume = false,           // true = resume from last position
      batchSize = 50,           // items per batch
      page = 1,                 // start page
      updateExisting = false,   // true = update even if exists
      force = false             // true = clear all and resync
    } = body;
    
    let startPage = page;
    let lastSyncedId = 0;
    
    // If force mode, clear all products
    if (force) {
      console.log('Force resync: clearing all products...');
      await prisma.product.deleteMany({});
      await prisma.syncLog.create({
        data: {
          syncType: 'force-clear',
          itemsCount: 0,
          status: 'success',
          errorMessage: 'Cleared all products for force resync',
        },
      });
    }
    
    // If resume mode, find last synced product
    if (resume) {
      const lastSync = await prisma.syncLog.findFirst({
        where: { status: { in: ['success', 'partial'] } },
        orderBy: { createdAt: 'desc' },
      });
      
      if (lastSync?.errorMessage?.includes('lastId:')) {
        const match = lastSync.errorMessage.match(/lastId:(\d+)/);
        if (match) {
          lastSyncedId = parseInt(match[1]);
        }
      }
      
      // Calculate approximate page from synced count
      if (lastSync?.itemsCount) {
        startPage = Math.floor(lastSync.itemsCount / 25) + 1;
      }
    }
    
    let totalSuccess = 0;
    let totalError = 0;
    let currentPage = startPage;
    let hasMore = true;
    let lastProcessedId = lastSyncedId;
    
    // Process in batches until complete or timeout
    const startTime = Date.now();
    const maxDuration = 250 * 1000; // 250 seconds (before Vercel 300s timeout)
    
    while (hasMore && (Date.now() - startTime) < maxDuration) {
      console.log(`Syncing page ${currentPage}...`);
      
      // Fetch from API with pagination
      const response = await fetch(
        `https://www.cnypharmacy.com/api/getDataProductIsGroup?page=${currentPage}&sort_product_name=asc&isPageGroup=8&paginate_num=${batchSize}`,
        { 
          next: { revalidate: 0 },
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      const products: ApiProduct[] = data.product || [];
      
      if (products.length === 0) {
        hasMore = false;
        break;
      }
      
      // Process each product in batch
      for (const item of products) {
        try {
          const productData = item.product_data?.[0];
          const productPrice = item.product_price?.[0]?.product_price?.[0];
          const productStock = item.product_stock?.[0];
          
          if (!productData) continue;
          
          // Skip if already exists and not update mode
          if (!updateExisting && !resume) {
            const existing = await prisma.product.findUnique({
              where: { productId: productData.id },
              select: { id: true }
            });
            if (existing) {
              lastProcessedId = productData.id;
              continue;
            }
          }
          
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
          
          totalSuccess++;
          lastProcessedId = productData.id;
        } catch (err) {
          console.error(`Error processing product ${item.product_data?.[0]?.id}:`, err);
          totalError++;
        }
      }
      
      currentPage++;
      
      // Save progress every 5 pages
      if (currentPage % 5 === 0) {
        await prisma.syncLog.create({
          data: {
            syncType: 'progress',
            itemsCount: totalSuccess,
            status: 'partial',
            errorMessage: `lastId:${lastProcessedId}, page:${currentPage}`,
          },
        });
      }
    }
    
    // Final log
    const status = hasMore ? 'partial' : 'success';
    await prisma.syncLog.create({
      data: {
        syncType: force ? 'force-resync' : (resume ? 'resume' : 'full'),
        itemsCount: totalSuccess,
        status,
        errorMessage: status === 'partial' 
          ? `lastId:${lastProcessedId}, page:${currentPage}, incomplete:timeout` 
          : null,
      },
    });
    
    return NextResponse.json({
      success: true,
      message: `Synced ${totalSuccess} products (${totalError} errors)`,
      status,
      lastId: lastProcessedId,
      nextPage: hasMore ? currentPage : null,
      canResume: hasMore,
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
  
  // Check if can resume
  const canResume = latestSync?.status === 'partial' && 
    latestSync?.errorMessage?.includes('lastId:');
  
  return NextResponse.json({
    lastSync: latestSync,
    totalProducts: productCount,
    canResume,
    resumeInfo: canResume ? {
      lastId: parseInt(latestSync.errorMessage?.match(/lastId:(\d+)/)?.[1] || '0'),
      nextPage: parseInt(latestSync.errorMessage?.match(/page:(\d+)/)?.[1] || '1'),
    } : null,
  });
}
