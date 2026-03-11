'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Package, X, Share2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import CsvProductCard from './components/CsvProductCard';
import { parseCsvProducts } from '@/lib/csv-product';
import type { CsvProduct } from '@/lib/csv-product';

export default function ProductSelector() {
  const router = useRouter();
  const [allProducts, setAllProducts] = useState<CsvProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSkus, setSelectedSkus] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadCsv = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/data/cnypharmacyz.csv');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        const products = parseCsvProducts(text);
        setAllProducts(products);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'โหลดข้อมูลล้มเหลว');
      } finally {
        setLoading(false);
      }
    };
    loadCsv();
  }, []);

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return allProducts;
    const q = searchQuery.toLowerCase();
    return allProducts.filter(
      (p) =>
        p.sku.toLowerCase().includes(q) ||
        p.productName.toLowerCase().includes(q) ||
        p.specName.toLowerCase().includes(q)
    );
  }, [allProducts, searchQuery]);

  const toggleSelection = useCallback((sku: string) => {
    setSelectedSkus((prev) => {
      const next = new Set(prev);
      if (next.has(sku)) {
        next.delete(sku);
      } else {
        next.add(sku);
      }
      return next;
    });
  }, []);

  const clearSelections = useCallback(() => setSelectedSkus(new Set()), []);

  const selectedCount = selectedSkus.size;

  const goToFlexExport = () => {
    const skus = Array.from(selectedSkus).join(',');
    router.push(`/export/flex?skus=${encodeURIComponent(skus)}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="ค้นหาสินค้า (ชื่อ, SKU, สารออกฤทธิ์...)"
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                  className="pl-10 border-gray-200 focus:border-green-500 focus:ring-green-500"
                />
              </div>
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchQuery('')}
                  className="text-gray-500"
                >
                  <X className="w-4 h-4 mr-1" />
                  ล้างคำค้น
                </Button>
              )}
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>
                สินค้าทั้งหมด{' '}
                <span className="font-semibold text-gray-900">{allProducts.length}</span> รายการ
              </span>
              {searchQuery && (
                <span>
                  ผลค้นหา{' '}
                  <span className="font-semibold text-green-700">{filteredProducts.length}</span> รายการ
                </span>
              )}
              {selectedCount > 0 && (
                <span className="text-green-600">
                  เลือกแล้ว{' '}
                  <span className="font-semibold">{selectedCount}</span> รายการ
                </span>
              )}
              {selectedCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelections}
                  className={cn('h-6 text-red-500 hover:text-red-700 hover:bg-red-50 px-2')}
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  ล้างการเลือก
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <RefreshCw className="w-10 h-10 text-gray-400 animate-spin" />
            <p className="text-gray-500 text-sm">กำลังโหลดข้อมูลสินค้า...</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
            <p className="font-semibold">โหลดข้อมูลล้มเหลว</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Package className="w-12 h-12 text-gray-300" />
            <p className="text-gray-500">ไม่พบสินค้าที่ค้นหา</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {filteredProducts.map((product) => (
              <CsvProductCard
                key={product.sku}
                product={product}
                selected={selectedSkus.has(product.sku)}
                onToggle={() => toggleSelection(product.sku)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Floating Export Button */}
      {selectedCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3">
          <div className="bg-white rounded-full shadow-lg border px-4 py-2 flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold text-sm">
              {selectedCount}
            </div>
            <span className="text-sm font-medium text-gray-700">รายการที่เลือก</span>
            <button
              type="button"
              className="w-6 h-6 rounded-full hover:bg-red-50 hover:text-red-600 flex items-center justify-center text-gray-400"
              onClick={clearSelections}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <Button
            size="lg"
            className="bg-green-600 hover:bg-green-700 text-white shadow-lg rounded-full px-6"
            onClick={goToFlexExport}
          >
            <Share2 className="w-5 h-5 mr-2" />
            สร้าง Flex Message
          </Button>
        </div>
      )}
    </div>
  );
}
