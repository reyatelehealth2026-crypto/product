import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import fs from 'fs';
import path from 'path';

interface JsonProduct {
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

// Bulk import from JSON file - FAST!
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { clearExisting = false, batchSize = 100 } = await request.json().catch(() => ({}));
    
    // Optional: Clear existing data
    if (clearExisting) {
      console.log('Clearing existing products...');
      await prisma.product.deleteMany({});
      await prisma.syncLog.create({
        data: {
          syncType: 'json-import-clear',
          itemsCount: 0,
          status: 'success',
          errorMessage: 'Cleared existing products before JSON import',
        },
      });
    }
    
    // Read JSON file
    const filePath = path.join(process.cwd(), 'getDataProductIsGroup.json');
    console.log(`Reading JSON file: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: 'JSON file not found. Please upload getDataProductIsGroup.json to project root.' },
        { status: 404 }
      );
    }
    
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(fileContent);
    const products: JsonProduct[] = data.product || [];
    
    console.log(`Found ${products.length} products in JSON file`);
    
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    
    // Get existing product IDs to skip (if not clearing)
    let existingIds: Set<number> = new Set();
    if (!clearExisting) {
      const existing = await prisma.product.findMany({
        select: { productId: true }
      });
      existingIds = new Set(existing.map(p => p.productId));
      console.log(`Found ${existingIds.size} existing products, will skip duplicates`);
    }
    
    // Process in batches
    const batches = [];
    for (let i = 0; i < products.length; i += batchSize) {
      batches.push(products.slice(i, i + batchSize));
    }
    
    console.log(`Processing ${batches.length} batches of ${batchSize}...`);
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`Processing batch ${batchIndex + 1}/${batches.length}...`);
      
      // Process batch with Promise.all for speed
      await Promise.all(
        batch.map(async (item) => {
          try {
            const productData = item.product_data?.[0];
            const productPrice = item.product_price?.[0]?.product_price?.[0];
            const productStock = item.product_stock?.[0];
            
            if (!productData) {
              errorCount++;
              return;
            }
            
            // Skip if already exists
            if (!clearExisting && existingIds.has(productData.id)) {
              skippedCount++;
              return;
            }
            
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
            console.error(`Error importing product ${item.product_data?.[0]?.id}:`, err);
            errorCount++;
          }
        })
      );
    }
    
    const duration = (Date.now() - startTime) / 1000;
    
    // Log import
    await prisma.syncLog.create({
      data: {
        syncType: 'json-import',
        itemsCount: successCount,
        status: errorCount === 0 ? 'success' : 'partial',
        errorMessage: `Duration: ${duration}s, Skipped: ${skippedCount}, Errors: ${errorCount}`,
      },
    });
    
    return NextResponse.json({
      success: true,
      message: `Imported ${successCount} products from JSON`,
      duration: `${duration}s`,
      totalInFile: products.length,
      imported: successCount,
      skipped: skippedCount,
      errors: errorCount,
    });
    
  } catch (error) {
    console.error('JSON import error:', error);
    
    await prisma.syncLog.create({
      data: {
        syncType: 'json-import',
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

// Get status
export async function GET() {
  const filePath = path.join(process.cwd(), 'getDataProductIsGroup.json');
  const fileExists = fs.existsSync(filePath);
  
  let fileStats = null;
  if (fileExists) {
    const stats = fs.statSync(filePath);
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    fileStats = {
      size: `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
      products: data.product?.length || 0,
      modified: stats.mtime,
    };
  }
  
  const productCount = await prisma.product.count();
  const lastImport = await prisma.syncLog.findFirst({
    where: { syncType: { contains: 'json-import' } },
    orderBy: { createdAt: 'desc' },
  });
  
  return NextResponse.json({
    fileExists,
    fileStats,
    totalProducts: productCount,
    lastImport,
  });
}
