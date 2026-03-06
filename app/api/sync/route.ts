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

// STEP-BY-STEP SYNC - Each call processes only ONE page
// Frontend calls this repeatedly until complete
export async function POST(request: NextRequest) {
  const MAX_TIME_MS = 20000; // 20 seconds max per call (safe limit)
  const startTime = Date.now();
  
  try {
    const body = await request.json().catch(() => ({}));
    const { 
      startPage = 1,        // Page to start from
      maxPages = 2,         // Pages per batch (keep small!)
      clearExisting = false
    } = body;
    
    // Clear if requested
    if (clearExisting && startPage === 1) {
      console.log('Clearing existing products...');
      await prisma.product.deleteMany({});
    }
    
    let currentPage = startPage;
    let processedCount = 0;
    let errorCount = 0;
    let hasMore = true;
    let lastProcessedId = 0;
    
    // Process pages until time limit or no more data
    for (let pageCount = 0; pageCount < maxPages; pageCount++) {
      // Check time limit
      if (Date.now() - startTime > MAX_TIME_MS) {
        console.log('Time limit reached, returning for next batch');
        break;
      }
      
      console.log(`Fetching page ${currentPage}...`);
      
      // Fetch ONE page at a time
      const response = await fetch(
        `https://www.cnypharmacy.com/api/getDataProductIsGroup?page=${currentPage}&sort_product_name=asc&isPageGroup=8&paginate_num=25`,
        { 
          next: { revalidate: 0 },
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        }
      );
      
      if (!response.ok) {
        return NextResponse.json({
          success: false,
          error: `API error: ${response.status}`,
          nextPage: currentPage,
          processed: processedCount,
          status: 'error'
        });
      }
      
      const data = await response.json();
      const products: ApiProduct[] = data.product || [];
      
      if (products.length === 0) {
        hasMore = false;
        break;
      }
      
      // Save products for this page
      for (const item of products) {
        try {
          const productData = item.product_data?.[0];
          const productPrice = item.product_price?.[0]?.product_price?.[0];
          const productStock = item.product_stock?.[0];
          
          if (!productData) continue;
          
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
          
          processedCount++;
          lastProcessedId = productData.id;
        } catch (err) {
          console.error(`Error saving product ${item.product_data?.[0]?.id}:`, err);
          errorCount++;
        }
      }
      
      currentPage++;
    }
    
    // Return status with next page info
    const totalInDb = await prisma.product.count();
    
    return NextResponse.json({
      success: true,
      processed: processedCount,
      errors: errorCount,
      startPage,
      currentPage,
      nextPage: hasMore ? currentPage : null,
      hasMore,
      totalInDb,
      status: hasMore ? 'partial' : 'complete',
      duration: `${(Date.now() - startTime) / 1000}s`
    });
    
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message,
      status: 'error'
    });
  }
}

// Get status
export async function GET() {
  const totalProducts = await prisma.product.count();
  const latestSync = await prisma.syncLog.findFirst({
    orderBy: { createdAt: 'desc' },
  });
  
  return NextResponse.json({
    totalProducts,
    latestSync,
  });
}
