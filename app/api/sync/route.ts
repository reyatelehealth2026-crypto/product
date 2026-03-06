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
