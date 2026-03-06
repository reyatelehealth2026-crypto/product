'use client';

import React from 'react';
import { Check, Package } from 'lucide-react';
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
