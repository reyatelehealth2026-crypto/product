'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  Package,
  Check,
  Zap,
  Tag,
  Sparkles,
  TrendingUp,
  X,
  Share2,
  Copy,
  Download,
  RefreshCw,
  Database
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import ProductCard from './components/ProductCard';
import type { Product, Promotion } from '@prisma/client';

type FilterType = 'all' | 'flashsale' | 'promotion' | 'new' | 'bestseller' | 'rx';

interface ProductWithPromotions extends Product {
  promotions: Promotion[];
}

const FILTERS: { key: FilterType; label: string; icon: React.ElementType; color: string }[] = [
  { key: 'all', label: 'ทั้งหมด', icon: Package, color: 'text-gray-700' },
  { key: 'flashsale', label: 'Flash Sale', icon: Zap, color: 'text-red-600' },
  { key: 'promotion', label: 'โปรโมชั่น', icon: Tag, color: 'text-orange-600' },
  { key: 'new', label: 'สินค้าใหม่', icon: Sparkles, color: 'text-purple-600' },
  { key: 'bestseller', label: 'ขายดี', icon: TrendingUp, color: 'text-green-600' },
  { key: 'rx', label: 'ยาตามใบสั่ง', icon: Package, color: 'text-red-600' },
];

export default function ProductSelector() {
  const [products, setProducts] = useState<ProductWithPromotions[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [showFlexDialog, setShowFlexDialog] = useState(false);
  const [copied, setCopied] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 24,
    total: 0,
    totalPages: 1,
  });

  // Fetch products from API
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search: searchQuery,
        filter: activeFilter,
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      
      const response = await fetch(`/api/products?${params}`);
      const data = await response.json();
      
      setProducts(data.products);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, activeFilter, pagination.page, pagination.limit]);

  // Sync products from external API
  const syncProducts = async () => {
    setSyncing(true);
    setSyncStatus(null);
    try {
      const response = await fetch('/api/sync', { method: 'POST' });
      const data = await response.json();
      
      if (data.success) {
        setSyncStatus(`Sync สำเร็จ: ${data.message}`);
        fetchProducts(); // Refresh list
      } else {
        setSyncStatus(`Sync ล้มเหลว: ${data.error}`);
      }
    } catch (error) {
      setSyncStatus('Sync ล้มเหลว: Network error');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Toggle selection
  const toggleSelection = useCallback((productId: number) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  }, []);

  const clearSelections = useCallback(() => {
    setSelectedItems(new Set());
  }, []);

  // Generate Flex Message
  const generateFlexMessage = () => {
    const selectedProducts = products.filter(p => selectedItems.has(p.productId));
    
    const bubbles = selectedProducts.map(product => {
      const images = (product.images as Array<{ photo_path: string }>) || [];
      const displayPrice = product.promotionPrice || product.salePrice || product.basePrice;
      
      return {
        type: 'bubble',
        hero: images[0]?.photo_path ? {
          type: 'image',
          url: `https://www.cnypharmacy.com/${images[0].photo_path}`,
          size: 'full',
          aspectRatio: '1:1',
        } : undefined,
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: product.name,
              weight: 'bold',
              size: 'md',
              wrap: true,
            },
            {
              type: 'text',
              text: `รหัส: ${product.sku}`,
              size: 'xs',
              color: '#888888',
              margin: 'sm',
            },
            {
              type: 'box',
              layout: 'horizontal',
              margin: 'md',
              contents: [
                {
                  type: 'text',
                  text: `฿${Number(displayPrice).toLocaleString()}`,
                  weight: 'bold',
                  size: 'lg',
                  color: '#FF6B6B',
                },
              ],
            },
          ],
        },
      };
    });

    return {
      type: 'carousel',
      contents: bubbles,
    };
  };

  const flexMessageJson = JSON.stringify(generateFlexMessage(), null, 2);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(flexMessageJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadJSON = () => {
    const blob = new Blob([flexMessageJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flex-message-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const selectedCount = selectedItems.size;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex flex-col gap-3">
            {/* Top Row: Search + Actions */}
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="🔍 ค้นหาสินค้า (ชื่อ, SKU, Barcode...)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 border-gray-200 focus:border-green-500 focus:ring-green-500"
                />
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={syncProducts}
                  disabled={syncing}
                  className="whitespace-nowrap"
                >
                  <RefreshCw className={cn("w-4 h-4 mr-2", syncing && "animate-spin")} />
                  {syncing ? 'กำลัง Sync...' : 'Sync ข้อมูล'}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={fetchProducts}
                  className="whitespace-nowrap"
                >
                  <Database className="w-4 h-4 mr-2" />
                  โหลดจาก DB
                </Button>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {FILTERS.map(({ key, label, icon: Icon, color }) => (
                <button
                  key={key}
                  onClick={() => setActiveFilter(key)}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                    activeFilter === key
                      ? cn(color, "bg-gray-100 ring-2 ring-offset-1 ring-current")
                      : "text-gray-600 hover:bg-gray-100"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Sync Status */}
        {syncStatus && (
          <Alert className={cn(
            "mb-4",
            syncStatus.includes('สำเร็จ') ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
          )}>
            <AlertDescription>{syncStatus}</AlertDescription>
          </Alert>
        )}

        {/* Stats Bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              พบ <span className="font-semibold text-gray-900">{pagination.total}</span> รายการ
            </span>
            {selectedCount > 0 && (
              <span className="ml-2 text-green-600">
                | เลือกแล้ว <span className="font-semibold">{selectedCount}</span> รายการ
              </span>
            )}
          </div>
          
          {selectedCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelections}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <X className="w-4 h-4 mr-1" />
              ล้างการเลือก
            </Button>
          )}
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="text-center py-16">
            <RefreshCw className="w-10 h-10 mx-auto text-gray-400 animate-spin" />
            <p className="text-gray-500 mt-4">กำลังโหลด...</p>
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                selected={selectedItems.has(product.productId)}
                onToggle={() => toggleSelection(product.productId)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Package className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">ไม่พบสินค้า</h3>
            <p className="text-sm text-gray-500 mt-1">
              ลองค้นหาด้วยคำค้นอื่น หรือกด Sync เพื่อโหลดข้อมูลใหม่
            </p>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === 1}
              onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
            >
              ก่อนหน้า
            </Button>
            <span className="px-4 py-2 text-sm text-gray-600">
              หน้า {pagination.page} / {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === pagination.totalPages}
              onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
            >
              ถัดไป
            </Button>
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      {selectedCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3">
          <div className="bg-white rounded-full shadow-lg border px-4 py-2 flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold text-sm">
              {selectedCount}
            </div>
            <span className="text-sm font-medium text-gray-700">รายการที่เลือก</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 rounded-full hover:bg-red-50 hover:text-red-600"
              onClick={clearSelections}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <Button
            size="lg"
            className="bg-green-600 hover:bg-green-700 text-white shadow-lg rounded-full px-6"
            onClick={() => setShowFlexDialog(true)}
          >
            <Share2 className="w-5 h-5 mr-2" />
            สร้าง Flex Message
          </Button>
        </div>
      )}

      {/* Flex Message Dialog */}
      <Dialog open={showFlexDialog} onOpenChange={setShowFlexDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b bg-gray-50">
            <DialogTitle className="flex items-center gap-2 text-gray-900">
              <Zap className="w-5 h-5 text-yellow-500" />
              LINE Flex Message Preview
            </DialogTitle>
          </DialogHeader>

          <div className="p-6 space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                สินค้าที่เลือก ({selectedCount} รายการ)
              </h4>
              <ScrollArea className="h-32">
                <div className="space-y-2">
                  {products
                    .filter(p => selectedItems.has(p.productId))
                    .map((product, idx) => (
                      <div key={product.id} className="flex items-center justify-between text-sm bg-white p-2 rounded border">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold">
                            {idx + 1}
                          </span>
                          <span className="truncate max-w-[200px]">{product.name}</span>
                        </div>
                        <span className="font-medium text-red-600">
                          ฿{Number(product.promotionPrice || product.basePrice).toLocaleString()}
                        </span>
                      </div>
                    ))}
                </div>
              </ScrollArea>
            </div>

            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-700">JSON Output</h4>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={copyToClipboard}
                    className={cn(
                      "transition-colors",
                      copied && "bg-green-50 text-green-600 border-green-200"
                    )}
                  >
                    {copied ? <><Check className="w-4 h-4 mr-1" />คัดลอกแล้ว</> : <><Copy className="w-4 h-4 mr-1" />คัดลอก</>}
                  </Button>
                  <Button size="sm" variant="outline" onClick={downloadJSON}>
                    <Download className="w-4 h-4 mr-1" />ดาวน์โหลด
                  </Button>
                </div>
              </div>
              
              <ScrollArea className="h-64 bg-gray-900 rounded-lg">
                <pre className="p-4 text-xs font-mono text-green-400 whitespace-pre-wrap">{flexMessageJson}</pre>
              </ScrollArea>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
              <strong>💡 วิธีใช้:</strong> คัดลอก JSON ด้านบน แล้วนำไปใช้ใน LINE Messaging API หรือ Broadcast System
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
