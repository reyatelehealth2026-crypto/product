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
