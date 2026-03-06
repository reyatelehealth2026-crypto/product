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

// Safe JSON parse with error handling
function safeJsonParse(content: string) {
  try {
    // Remove BOM if present
    if (content.charCodeAt(0) === 0xFEFF) {
      content = content.slice(1);
    }
    return JSON.parse(content);
  } catch (e) {
    console.error('JSON parse error:', e);
    // Try to fix common issues
    content = content.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
    return JSON.parse(content);
  }
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
    
    const stats = fs.statSync(filePath);
    console.log(`File size: ${(stats.size / 1024).toFixed(2)} KB`);
    
    const fileContent = fs.readFileSync(filePath, 'utf8');
    console.log(`File read complete, parsing JSON...`);
    
    const data = safeJsonParse(fileContent);
    const products: JsonProduct[] = data.product || [];
    
    console.log(`Found ${products.length} products in JSON file`);
    
    if (products.length === 0) {
      return NextResponse.json(
        { error: 'No products found in JSON file. Check file format.' },
        { status: 400 }
      );
    }
    
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
    
    // Process sequentially instead of parallel (safer for large batches)
    console.log(`Processing ${products.length} products...`);
    
    for (let i = 0; i < products.length; i++) {
      const item = products[i];
      
      // Log progress every 100 items
      if (i % 100 === 0) {
        console.log(`Processing ${i + 1}/${products.length}...`);
      }
      
      try {
        const productData = item.product_data?.[0];
        const productPrice = item.product_price?.[0]?.product_price?.[0];
        const productStock = item.product_stock?.[0];
        
        if (!productData) {
          console.log(`Skipping item ${i}: no product_data`);
          errorCount++;
          continue;
        }
        
        // Skip if already exists
        if (!clearExisting && existingIds.has(productData.id)) {
          skippedCount++;
          continue;
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
        console.error(`Error importing product ${item.product_data?.[0]?.id || i}:`, err);
        errorCount++;
      }
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
  let productCountInFile = 0;
  
  if (fileExists) {
    const stats = fs.statSync(filePath);
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const data = safeJsonParse(content);
      productCountInFile = data.product?.length || 0;
      fileStats = {
        size: `${(stats.size / 1024).toFixed(2)} MB`,
        products: productCountInFile,
        modified: stats.mtime,
      };
    } catch (e) {
      fileStats = {
        size: `${(stats.size / 1024).toFixed(2)} MB`,
        error: 'Failed to parse JSON',
        modified: stats.mtime,
      };
    }
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
