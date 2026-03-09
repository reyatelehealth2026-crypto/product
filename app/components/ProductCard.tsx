'use client';

import React from 'react';
import { Check, Eye, Package, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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
  onViewDetails?: () => void;
}

export default function ProductCard({ product, selected, onToggle, onViewDetails }: ProductCardProps) {
  const images = Array.isArray(product.images) ? (product.images as Array<{ photo_path: string }>) : [];
  const hashtags = Array.isArray(product.hashtags) ? (product.hashtags as string[]) : [];
  const units = Array.isArray(product.units) ? (product.units as Array<{ unit: string; contain?: number; unitNum?: number }>) : [];
  const prices = Array.isArray(product.prices) ? (product.prices as Array<{ price?: number; promotionPrice?: number; buyMin?: number; buyMax?: number }>) : [];
  const stockDetails = Array.isArray(product.stockDetails) ? (product.stockDetails as Array<{ stockNum?: number; expiryDate?: string | null }>) : [];
  
  const primaryPrice = prices.find((price) => typeof price.price === 'number');
  const displayPrice = product.promotionPrice || product.salePrice || primaryPrice?.promotionPrice || primaryPrice?.price || product.basePrice;
  const hasDiscount = product.promotionPrice && product.promotionPrice < product.basePrice;
  const discountPercent = hasDiscount
    ? Math.round(((Number(product.basePrice) - Number(product.promotionPrice!)) / Number(product.basePrice)) * 100)
    : 0;
  
  // Stock status
  const isInStock = product.stockQuantity > 0;
  
  // Filter valid hashtags
  const validHashtags = hashtags.filter(tag => tag && tag.trim() !== '');

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
      </div>

      {/* Image */}
      <div className="aspect-square bg-gray-100 relative overflow-hidden">
        {images[0]?.photo_path ? (
          <img
            src={`/api/image?path=${encodeURIComponent(images[0].photo_path)}`}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            onError={(e) => {
              console.error(`Image failed to load: ${images[0].photo_path}`);
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : null}
        
        {/* Fallback placeholder */}
        <div className={cn(
          "w-full h-full flex flex-col items-center justify-center bg-gray-100",
          images[0]?.photo_path ? "absolute inset-0 -z-10" : ""
        )}>
          <Package className="w-10 h-10 text-gray-300 mb-2" />
          <span className="text-[10px] text-gray-400">{product.sku}</span>
        </div>
      </div>

      {/* Content */}
      <CardContent className="p-3 space-y-2">
        {/* Promotion Badge - Special Offer Style */}
        {hasDiscount && (
          <div className="flex flex-wrap gap-1 mb-2 justify-center">
            <span className="px-2 py-0.5 bg-cyan-100 text-cyan-700 text-[10px] rounded">
              เริ่ม {primaryPrice?.buyMin ?? 0} ชิ้น
            </span>
            <span className="px-2 py-0.5 bg-cyan-100 text-cyan-700 text-[10px] rounded">
              สูงสุด {primaryPrice?.buyMax ?? 0} ชิ้น
            </span>
          </div>
        )}
        
        {/* Special Offer Badge */}
        {hasDiscount && (
          <div className="bg-red-500 text-white text-center py-1 px-2 rounded-md text-xs font-bold mb-2">
            SPECIAL OFFER
          </div>
        )}
        
        {/* Stock Status */}
        <div className="flex items-center justify-center gap-4 mb-2">
          <div className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center",
            isInStock ? "bg-green-500 text-white" : "bg-red-500 text-white"
          )}>
            {isInStock ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
          </div>
        </div>

        {/* SKU & Name */}
        <p className="text-xs text-gray-500 text-center">รหัสสินค้า {product.sku}</p>
        
        <h3 className="font-medium text-sm text-gray-900 line-clamp-2 min-h-[2.5rem] leading-tight text-center">
          {product.name}
        </h3>
        
        {/* Spec */}
        {product.specName && (
          <p className="text-xs text-gray-500 line-clamp-1 text-center">{product.specName}</p>
        )}
        
        {/* Promotion Condition Box */}
        {hasDiscount && (
          <div className="border border-red-200 rounded-md p-2 text-center text-xs text-red-600 bg-red-50">
            <p>
              ราคาโปร{typeof primaryPrice?.buyMin === 'number' ? ` • ขั้นต่ำ ${primaryPrice.buyMin}` : ''}
              {typeof primaryPrice?.buyMax === 'number' ? ` • สูงสุด ${primaryPrice.buyMax}` : ''}
            </p>
          </div>
        )}
        
        {/* Price Section */}
        <div className="text-center pt-2">
          {hasDiscount ? (
            <>
              <p className="text-sm text-gray-400 line-through">
                ฿{Number(product.basePrice).toLocaleString()} / {units[0]?.unit || 'ชิ้น'}
              </p>
              <p className="text-lg font-bold text-red-600">
                ฿{Number(displayPrice).toLocaleString()} / {units[0]?.unit || 'ชิ้น'}
              </p>
            </>
          ) : (
            <p className="text-lg font-bold text-red-600">
              ฿{Number(displayPrice).toLocaleString()} / {units[0]?.unit || 'ชิ้น'}
            </p>
          )}
        </div>
        
        {/* Hashtags - Yellow Style */}
        {validHashtags.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1 pt-2">
            {validHashtags.slice(0, 3).map((tag, i) => (
              <span 
                key={i} 
                className="px-2 py-0.5 bg-yellow-300 text-yellow-800 text-[10px] rounded font-medium"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
        
        {/* Stock Text */}
        <p className={cn(
          "text-xs text-center",
          isInStock ? "text-green-600" : "text-red-500"
        )}>
          {isInStock ? `คงเหลือ: ${product.stockQuantity} ${product.stockUnit || 'ชิ้น'}` : 'สินค้าหมด'}
        </p>
        {stockDetails.length > 0 && (
          <p className="text-[10px] text-center text-gray-400">
            {stockDetails.length} lot / expiry tracked
          </p>
        )}

        {onViewDetails && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails();
            }}
            className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            <Eye className="w-4 h-4" />
            ดูรายละเอียด
          </button>
        )}
      </CardContent>
    </Card>
  );
}
