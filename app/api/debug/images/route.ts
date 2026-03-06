import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (id) {
      // Get specific product
      const product = await prisma.product.findUnique({
        where: { productId: parseInt(id) },
        select: { 
          productId: true, 
          name: true, 
          images: true,
          sku: true
        }
      });
      
      if (!product) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }
      
      const images = product.images as Array<{ photo_path: string }> | null;
      
      return NextResponse.json({
        productId: product.productId,
        name: product.name,
        sku: product.sku,
        images: images,
        imageCount: images?.length || 0,
        firstImagePath: images?.[0]?.photo_path || null,
        fullUrl: images?.[0]?.photo_path 
          ? `https://manager.cnypharmacy.com/${images[0].photo_path}`
          : null,
      });
    }
    
    // Get sample of products
    const products = await prisma.product.findMany({
      take: 5,
      select: { 
        productId: true, 
        name: true, 
        images: true 
      }
    });
    
    // Count products with non-null images manually
    const allProducts = await prisma.product.findMany({
      select: { images: true }
    });
    const productsWithImagesCount = allProducts.filter(p => p.images !== null).length;
    
    return NextResponse.json({
      totalProducts: await prisma.product.count(),
      productsWithImages: productsWithImagesCount,
      sample: products.map(p => ({
        productId: p.productId,
        name: p.name,
        images: p.images,
        firstImagePath: (p.images as Array<{ photo_path: string }>)?.[0]?.photo_path
      }))
    });
    
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch debug info' },
      { status: 500 }
    );
  }
}
