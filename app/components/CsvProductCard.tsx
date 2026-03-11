'use client';

import React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CsvProduct } from '@/lib/csv-product';

interface CsvProductCardProps {
  product: CsvProduct;
  selected: boolean;
  onToggle: () => void;
}

export default function CsvProductCard({ product, selected, onToggle }: CsvProductCardProps) {
  const hasPromo = product.promoCond1.trim() !== '' || product.promoCond2.trim() !== '';
  const hasOfferDates = product.offerStart.trim() !== '' || product.offerEnd.trim() !== '';

  return (
    <div
      className={cn(
        'relative rounded-2xl border bg-white shadow-sm cursor-pointer transition-all duration-200 select-none',
        'hover:shadow-md hover:-translate-y-0.5',
        selected
          ? 'ring-2 ring-green-500 ring-offset-2'
          : 'border-gray-200 hover:border-green-300'
      )}
      onClick={onToggle}
    >
      {/* Deselect X button */}
      {selected && (
        <button
          type="button"
          className="absolute top-2 right-2 z-20 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow"
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Product Image */}
      <div className="rounded-t-2xl overflow-hidden bg-gray-50 aspect-square">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.productName}
            className="w-full h-full object-contain"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">
            {product.sku}
          </div>
        )}
      </div>

      <div className="p-3 space-y-2">
        {/* Min/Max pills */}
        {(product.minQtyLabel || product.maxQtyLabel) && (
          <div className="flex gap-1 justify-center flex-wrap">
            {product.minQtyLabel && (
              <span className="px-2 py-0.5 bg-cyan-100 text-cyan-700 text-[10px] rounded-full font-medium">
                {product.minQtyLabel}
              </span>
            )}
            {product.maxQtyLabel && (
              <span className="px-2 py-0.5 bg-cyan-100 text-cyan-700 text-[10px] rounded-full font-medium">
                {product.maxQtyLabel}
              </span>
            )}
          </div>
        )}

        {/* SPECIAL OFFER banner */}
        {product.offerHeader && (
          <div className="bg-red-500 text-white text-center py-0.5 px-2 rounded-sm text-[11px] font-bold tracking-wide">
            {product.offerHeader}
          </div>
        )}

        {/* Offer date range */}
        {hasOfferDates && (
          <div className="border border-red-300 rounded-sm px-2 py-1 text-center text-[10px] text-red-600 leading-snug">
            {product.offerStart && <div>{product.offerStart}</div>}
            {product.offerEnd && <div>{product.offerEnd}</div>}
          </div>
        )}

        {/* Deselect X icon (center, shown when not selected too — as per screenshot) */}
        <div className="flex justify-center">
          <div
            className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center border-2',
              selected
                ? 'bg-green-500 border-green-500 text-white'
                : 'border-gray-300 text-gray-300'
            )}
          >
            <X className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* SKU */}
        <p className="text-[10px] text-gray-500 text-center font-medium">
          {product.skuLabel} {product.sku}
        </p>

        {/* Product name */}
        <a
          href={product.productUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-xs font-semibold text-blue-600 hover:underline line-clamp-3 text-center leading-snug"
          onClick={(e) => e.stopPropagation()}
        >
          {product.productName}
        </a>

        {/* Spec / ingredient */}
        {product.specName && (
          <p className="text-[10px] text-gray-400 text-center line-clamp-1">
            {product.specName}
          </p>
        )}

        {/* Promo condition box */}
        {hasPromo && (
          <div className="border border-red-200 rounded-md px-2 py-1.5 text-[10px] text-red-600 bg-red-50 text-center leading-snug">
            {product.promoCond1 && <p>{product.promoCond1}</p>}
            {product.promoCond2 && <p>{product.promoCond2}</p>}
          </div>
        )}

        {/* Price */}
        <div className="text-center pt-1">
          <p className="text-sm font-bold text-red-600 leading-tight">
            {product.pricePerUnit}
          </p>
          {product.priceAfterDiscount && (
            <p className="text-[10px] text-green-600 font-medium mt-0.5">
              {product.priceAfterDiscount}
            </p>
          )}
          {product.bulkPrice && product.bulkUnit && (
            <p className="text-[10px] text-gray-500 mt-0.5">
              {product.bulkPrice} {product.bulkUnit}
            </p>
          )}
        </div>

        {/* Buy button */}
        <a
          href={product.productUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center bg-red-500 hover:bg-red-600 text-white text-xs font-bold py-2 rounded-full transition-colors mt-1"
          onClick={(e) => e.stopPropagation()}
        >
          {product.btnLabel || 'ซื้อเลย'}
        </a>
      </div>
    </div>
  );
}
