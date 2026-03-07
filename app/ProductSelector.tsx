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
  Hash,
  ArrowUpDown,
  X,
  Share2,
  Copy,
  Download,
  RefreshCw,
  Database,
  Play,
  AlertTriangle,
  FileJson
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import ProductCard from './components/ProductCard';
import type { Product, Promotion } from '@prisma/client';

type FilterType =
  | 'all'
  | 'flashsale'
  | 'promotion'
  | 'new'
  | 'recommend'
  | 'bestseller'
  | 'rx'
  | 'discount'
  | 'hashtag'
  | 'in_stock'
  | 'out_of_stock';

interface ProductWithPromotions extends Product {
  promotions: Promotion[];
}

const FILTERS: { key: FilterType; label: string; icon: React.ElementType; color: string }[] = [
  { key: 'all', label: 'ทั้งหมด', icon: Package, color: 'text-gray-700' },
  { key: 'flashsale', label: 'Flash Sale', icon: Zap, color: 'text-red-600' },
  { key: 'promotion', label: 'โปรโมชั่น', icon: Tag, color: 'text-orange-600' },
  { key: 'new', label: 'สินค้าใหม่', icon: Sparkles, color: 'text-purple-600' },
  { key: 'recommend', label: 'แนะนำ', icon: Sparkles, color: 'text-fuchsia-600' },
  { key: 'bestseller', label: 'ขายดี', icon: TrendingUp, color: 'text-green-600' },
  { key: 'rx', label: 'ยาตามใบสั่ง', icon: Package, color: 'text-rose-600' },
  { key: 'discount', label: 'มีส่วนลด', icon: Tag, color: 'text-emerald-600' },
  { key: 'hashtag', label: 'มี Hashtag', icon: Hash, color: 'text-yellow-600' },
  { key: 'in_stock', label: 'พร้อมขาย', icon: Check, color: 'text-green-700' },
  { key: 'out_of_stock', label: 'สินค้าหมด', icon: X, color: 'text-red-700' },
];

export default function ProductSelector() {
  const [products, setProducts] = useState<ProductWithPromotions[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [selectedProduct, setSelectedProduct] = useState<ProductWithPromotions | null>(null);
  const [showFlexDialog, setShowFlexDialog] = useState(false);
  const [copied, setCopied] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [canResume, setCanResume] = useState(false);
  const [syncStats, setSyncStats] = useState<{totalProducts: number; lastSync: any} | null>(null);
  const [syncStartPage, setSyncStartPage] = useState(1);
  const [syncEndPage, setSyncEndPage] = useState<number | ''>(100);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
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
        sortBy,
        sortOrder,
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
  }, [searchQuery, activeFilter, pagination.page, pagination.limit, sortBy, sortOrder]);

  // Check sync status on mount
  useEffect(() => {
    const checkSyncStatus = async () => {
      try {
        const response = await fetch('/api/sync');
        const data = await response.json();
        setCanResume(data.canResume);
        setSyncStats({
          totalProducts: data.totalProducts,
          lastSync: data.lastSync,
        });
      } catch (error) {
        console.error('Failed to check sync status:', error);
      }
    };
    checkSyncStatus();
  }, []);

  // Import from JSON file - FAST!
  const importFromJSON = async (clearExisting = false) => {
    if (clearExisting && !confirm('⚠️ นี่จะลบข้อมูลทั้งหมดแล้ว import ใหม่จาก JSON! ต้องการดำเนินการต่อหรือไม่?')) {
      return;
    }
    
    setSyncing(true);
    setSyncStatus(null);
    try {
      const response = await fetch('/api/import-json', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearExisting, batchSize: 100 }),
      });
      const data = await response.json();
      
      if (data.success) {
        setSyncStatus(`Import สำเร็จ: ${data.imported} รายการ ใช้เวลา ${data.duration}`);
        fetchProducts(); // Refresh list
      } else {
        setSyncStatus(`Import ล้มเหลว: ${data.error}`);
      }
    } catch (error) {
      setSyncStatus('Import ล้มเหลว: Network error');
    } finally {
      setSyncing(false);
    }
  };

  // Step-by-step sync with page range support
  const runStepSync = async (startPage = 1, endPage: number | null = null, accumulated = 0) => {
    setSyncing(true);
    
    try {
      const response = await fetch('/api/sync', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startPage, endPage, maxPages: 2 }),
      });
      const data = await response.json();
      
      if (!data.success) {
        setSyncStatus(`Sync ล้มเหลว: ${data.error}`);
        setSyncing(false);
        return;
      }
      
      const newTotal = accumulated + data.processed;
      const rangeText = endPage ? `(${startPage}-${endPage})` : '';
      setSyncStatus(`กำลังซิงค์${rangeText}... หน้า ${data.currentPage} เสร็จแล้ว ${newTotal} รายการ`);
      
      // If more pages, continue automatically
      if (data.hasMore && data.nextPage) {
        await new Promise(r => setTimeout(r, 500));
        await runStepSync(data.nextPage, endPage, newTotal);
      } else {
        setSyncStatus(`ซิงค์เสร็จสมบูรณ์! ทั้งหมด ${newTotal} รายการ`);
        setCanResume(false);
        fetchProducts();
      }
    } catch (error) {
      setSyncStatus('Sync ล้มเหลว: Network error');
    } finally {
      setSyncing(false);
    }
  };

  // Sync products (now auto-continues with page range)
  const syncProducts = async (resume = false, force = false) => {
    if (force && !confirm('⚠️ นี่จะลบข้อมูลสินค้าทั้งหมดและซิงค์ใหม่! ต้องการดำเนินการต่อหรือไม่?')) {
      return;
    }
    
    // Use page range from state
    const startPage = syncStartPage;
    const endPage = syncEndPage || null;
    
    // Clear if force
    if (force) {
      await fetch('/api/sync', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearExisting: true }),
      });
    }
    
    // Start step-by-step sync with page range
    await runStepSync(startPage, endPage, 0);
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

  const getPublicImageUrl = (photoPath?: string | null) => {
    if (!photoPath) return null;
    const normalized = photoPath.startsWith('/') ? photoPath.slice(1) : photoPath;
    return `https://manager.cnypharmacy.com/${normalized}`;
  };

  // Generate Flex Message (9 items per bubble)
  const generateFlexMessage = () => {
    const selectedProducts = products.filter(p => selectedItems.has(p.productId));
    const groups: ProductWithPromotions[][] = [];

    for (let i = 0; i < selectedProducts.length; i += 9) {
      groups.push(selectedProducts.slice(i, i + 9));
    }

    const bubbles = groups.map((group, groupIndex) => ({
      type: 'bubble',
      size: 'giga',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#16a34a',
        paddingAll: '12px',
        contents: [
          {
            type: 'text',
            text: `รายการสินค้า ${groupIndex + 1}`,
            color: '#ffffff',
            weight: 'bold',
            size: 'lg',
            align: 'center',
          },
          {
            type: 'text',
            text: `${group.length} สินค้าใน bubble นี้`,
            color: '#dcfce7',
            size: 'xs',
            align: 'center',
            margin: 'sm',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        paddingAll: '12px',
        contents: group.flatMap((product, index) => {
          const displayPrice = product.promotionPrice || product.salePrice || product.basePrice;
          const hasDiscount = product.promotionPrice && Number(product.promotionPrice) < Number(product.basePrice);
          const hashtags = (product.hashtags as string[]) || [];
          const images = (product.images as Array<{ photo_path: string }>) || [];
          const imageUrl = getPublicImageUrl(images[0]?.photo_path);

          const itemRow = {
            type: 'box',
            layout: 'horizontal',
            spacing: 'sm',
            paddingAll: '8px',
            backgroundColor: index % 2 === 0 ? '#f9fafb' : '#ffffff',
            cornerRadius: '8px',
            contents: [
              {
                type: 'box',
                layout: 'vertical',
                width: '26px',
                justifyContent: 'center',
                contents: [
                  {
                    type: 'text',
                    text: `${groupIndex * 9 + index + 1}`,
                    size: 'xs',
                    weight: 'bold',
                    color: '#16a34a',
                    align: 'center',
                  },
                ],
              },
              ...(imageUrl ? [{
                type: 'image',
                url: imageUrl,
                size: 'xxs',
                aspectMode: 'cover',
                aspectRatio: '1:1',
                flex: 0,
              }] : []),
              {
                type: 'box',
                layout: 'vertical',
                flex: 1,
                spacing: 'xs',
                contents: [
                  {
                    type: 'text',
                    text: product.name,
                    weight: 'bold',
                    size: 'sm',
                    wrap: true,
                    maxLines: 2,
                    color: '#111827',
                  },
                  {
                    type: 'text',
                    text: `SKU: ${product.sku}${product.isRx ? ' | RX' : ''}${product.isBestseller ? ' | ขายดี' : ''}`,
                    size: 'xs',
                    color: '#6b7280',
                    wrap: true,
                  },
                  {
                    type: 'box',
                    layout: 'baseline',
                    spacing: 'sm',
                    contents: [
                      ...(hasDiscount ? [{
                        type: 'text',
                        text: `฿${Number(product.basePrice).toLocaleString()}`,
                        size: 'xs',
                        color: '#9ca3af',
                        decoration: 'line-through',
                      }] : []),
                      {
                        type: 'text',
                        text: `฿${Number(displayPrice).toLocaleString()}`,
                        size: 'md',
                        weight: 'bold',
                        color: '#dc2626',
                      },
                    ],
                  },
                  {
                    type: 'text',
                    text: product.stockQuantity > 0
                      ? `คงเหลือ ${product.stockQuantity.toLocaleString()} ${product.stockUnit || 'ชิ้น'}`
                      : 'สินค้าหมด',
                    size: 'xs',
                    color: product.stockQuantity > 0 ? '#16a34a' : '#dc2626',
                  },
                  ...(hashtags.length > 0 ? [{
                    type: 'text',
                    text: hashtags.slice(0, 2).map((tag) => `#${tag}`).join(' '),
                    size: 'xs',
                    color: '#a16207',
                    wrap: true,
                  }] : []),
                ],
              },
            ],
          };

          return index < group.length - 1
            ? [itemRow, { type: 'separator', margin: 'sm', color: '#e5e7eb' }]
            : [itemRow];
        }),
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '10px',
        backgroundColor: '#f3f4f6',
        contents: [
          {
            type: 'text',
            text: `Bubble ${groupIndex + 1} • แสดงสูงสุด 9 สินค้า`,
            size: 'xs',
            color: '#6b7280',
            align: 'center',
          },
        ],
      },
    }));

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

  const pageStats = {
    total: products.length,
    promotion: products.filter((p) => p.isPromotion).length,
    flashsale: products.filter((p) => p.isFlashsale).length,
    rx: products.filter((p) => p.isRx).length,
    bestseller: products.filter((p) => p.isBestseller).length,
    outOfStock: products.filter((p) => p.stockQuantity <= 0).length,
    withHashtag: products.filter((p) => Array.isArray(p.hashtags) ? p.hashtags.length > 0 : false).length,
  };

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
              
              {/* Page Range Inputs */}
              <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border">
                <span className="text-xs text-gray-500 whitespace-nowrap">หน้า:</span>
                <Input
                  type="number"
                  min={1}
                  value={syncStartPage}
                  onChange={(e) => setSyncStartPage(parseInt(e.target.value) || 1)}
                  className="w-16 h-8 text-center text-sm"
                />
                <span className="text-gray-400">-</span>
                <Input
                  type="number"
                  min={1}
                  value={syncEndPage}
                  onChange={(e) => setSyncEndPage(e.target.value ? parseInt(e.target.value) : '')}
                  placeholder="สุดท้าย"
                  className="w-20 h-8 text-center text-sm"
                />
              </div>

              <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border">
                <ArrowUpDown className="w-4 h-4 text-gray-500" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-transparent text-sm outline-none"
                >
                  <option value="name">เรียงตามชื่อ</option>
                  <option value="price">เรียงตามราคา</option>
                  <option value="promotionPrice">เรียงตามราคาโปร</option>
                  <option value="stock">เรียงตามสต็อก</option>
                  <option value="bestseller">เรียงตามขายดี</option>
                  <option value="flashsale">เรียงตามแฟลชเซล</option>
                </select>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                >
                  {sortOrder === 'asc' ? 'ASC' : 'DESC'}
                </Button>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => syncProducts(false)}
                  disabled={syncing}
                  className="whitespace-nowrap"
                >
                  <RefreshCw className={cn("w-4 h-4 mr-2", syncing && "animate-spin")} />
                  {syncing ? 'กำลัง Sync...' : 'Sync ข้อมูล'}
                </Button>
                
                {canResume && (
                  <Button
                    variant="outline"
                    onClick={() => syncProducts(true)}
                    disabled={syncing}
                    className="whitespace-nowrap bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    ซิงค์ต่อ
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  onClick={() => syncProducts(false, true)}
                  disabled={syncing}
                  className="whitespace-nowrap bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                  title="ลบข้อมูลทั้งหมดและซิงค์ใหม่"
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Force Resync
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => importFromJSON(false)}
                  disabled={syncing}
                  className="whitespace-nowrap bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                  title="Import จากไฟล์ JSON (เร็วมาก!)"
                >
                  <FileJson className="w-4 h-4 mr-2" />
                  Import JSON
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
        <div className="flex flex-col gap-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-gray-600">
                พบ <span className="font-semibold text-gray-900">{pagination.total}</span> รายการ
              </span>
              {syncStats && (
                <span className="text-xs text-gray-400">
                  (ในฐานข้อมูล: {syncStats.totalProducts} รายการ)
                </span>
              )}
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

          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
            <div className="rounded-xl border bg-white p-3">
              <p className="text-xs text-gray-500">สินค้าหน้านี้</p>
              <p className="text-xl font-bold text-gray-900">{pageStats.total}</p>
            </div>
            <div className="rounded-xl border bg-white p-3">
              <p className="text-xs text-gray-500">โปรโมชั่น</p>
              <p className="text-xl font-bold text-orange-600">{pageStats.promotion}</p>
            </div>
            <div className="rounded-xl border bg-white p-3">
              <p className="text-xs text-gray-500">Flash Sale</p>
              <p className="text-xl font-bold text-red-600">{pageStats.flashsale}</p>
            </div>
            <div className="rounded-xl border bg-white p-3">
              <p className="text-xs text-gray-500">RX</p>
              <p className="text-xl font-bold text-rose-600">{pageStats.rx}</p>
            </div>
            <div className="rounded-xl border bg-white p-3">
              <p className="text-xs text-gray-500">ขายดี</p>
              <p className="text-xl font-bold text-green-600">{pageStats.bestseller}</p>
            </div>
            <div className="rounded-xl border bg-white p-3">
              <p className="text-xs text-gray-500">มี Hashtag</p>
              <p className="text-xl font-bold text-yellow-600">{pageStats.withHashtag}</p>
            </div>
            <div className="rounded-xl border bg-white p-3">
              <p className="text-xs text-gray-500">สินค้าหมด</p>
              <p className="text-xl font-bold text-red-500">{pageStats.outOfStock}</p>
            </div>
          </div>
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
                onViewDetails={() => setSelectedProduct(product)}
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

      {/* Product Detail Dialog */}
      <Dialog open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
          <DialogHeader className="px-6 py-4 border-b bg-gray-50">
            <DialogTitle className="text-gray-900">รายละเอียดสินค้า</DialogTitle>
          </DialogHeader>

          {selectedProduct && (
            <ScrollArea className="max-h-[calc(90vh-80px)]">
              <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="aspect-square rounded-2xl border bg-gray-50 overflow-hidden flex items-center justify-center">
                    {((selectedProduct.images as Array<{ photo_path: string }>) || [])[0]?.photo_path ? (
                      <img
                        src={`/api/image?path=${encodeURIComponent((((selectedProduct.images as Array<{ photo_path: string }>) || [])[0]).photo_path)}`}
                        alt={selectedProduct.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center text-gray-400">
                        <Package className="w-12 h-12 mx-auto mb-2" />
                        <p>ไม่มีรูปสินค้า</p>
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border bg-white p-4 space-y-2">
                    <h3 className="font-semibold text-gray-900">สถานะสินค้า</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedProduct.isFlashsale && <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-medium">Flash Sale</span>}
                      {selectedProduct.isPromotion && <span className="px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-medium">Promotion</span>}
                      {selectedProduct.isBestseller && <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">ขายดี</span>}
                      {selectedProduct.isRecommend && <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-medium">แนะนำ</span>}
                      {selectedProduct.isRx && <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-700 text-xs font-medium">RX</span>}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border bg-white p-4 space-y-3">
                    <div>
                      <p className="text-xs text-gray-500">ชื่อสินค้า</p>
                      <h2 className="text-xl font-bold text-gray-900">{selectedProduct.name}</h2>
                      {selectedProduct.nameEn && <p className="text-sm text-gray-500 mt-1">{selectedProduct.nameEn}</p>}
                    </div>
                    {selectedProduct.specName && (
                      <div>
                        <p className="text-xs text-gray-500">ตัวยา / สเปค</p>
                        <p className="text-sm text-gray-800">{selectedProduct.specName}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-gray-500">SKU</p>
                        <p className="font-medium text-gray-900">{selectedProduct.sku}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Barcode</p>
                        <p className="font-medium text-gray-900">{selectedProduct.barcode || '-'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border bg-white p-4 space-y-3">
                    <h3 className="font-semibold text-gray-900">ราคาและสต็อก</h3>
                    <div className="flex items-end gap-3">
                      {selectedProduct.promotionPrice && Number(selectedProduct.promotionPrice) < Number(selectedProduct.basePrice) && (
                        <span className="text-sm text-gray-400 line-through">฿{Number(selectedProduct.basePrice).toLocaleString()}</span>
                      )}
                      <span className="text-2xl font-bold text-red-600">฿{Number(selectedProduct.promotionPrice || selectedProduct.salePrice || selectedProduct.basePrice).toLocaleString()}</span>
                    </div>
                    <p className={cn('text-sm font-medium', selectedProduct.stockQuantity > 0 ? 'text-green-600' : 'text-red-500')}>
                      {selectedProduct.stockQuantity > 0 ? `คงเหลือ ${selectedProduct.stockQuantity.toLocaleString()} ${selectedProduct.stockUnit || 'ชิ้น'}` : 'สินค้าหมด'}
                    </p>
                  </div>

                  <div className="rounded-2xl border bg-white p-4 space-y-3">
                    <h3 className="font-semibold text-gray-900">หน่วยขาย</h3>
                    <div className="flex flex-wrap gap-2">
                      {(((selectedProduct.units as Array<{ unit: string; contain?: number; unitNum?: number }>) || []).length > 0)
                        ? ((selectedProduct.units as Array<{ unit: string; contain?: number; unitNum?: number }>) || []).map((unit, index) => (
                            <div key={index} className="rounded-lg border bg-gray-50 px-3 py-2 text-sm text-gray-700">
                              {unit.unit}
                              {typeof unit.contain === 'number' ? ` • contain ${unit.contain}` : ''}
                              {typeof unit.unitNum === 'number' ? ` • unit ${unit.unitNum}` : ''}
                            </div>
                          ))
                        : <p className="text-sm text-gray-500">ไม่มีข้อมูลหน่วยขาย</p>}
                    </div>
                  </div>

                  <div className="rounded-2xl border bg-white p-4 space-y-3">
                    <h3 className="font-semibold text-gray-900">ราคาแบบ normalized</h3>
                    {(((selectedProduct.prices as Array<{ price?: number; promotionPrice?: number; buyMin?: number; buyMax?: number; productUnitId?: number }>) || []).length > 0)
                      ? <div className="space-y-2">
                          {((selectedProduct.prices as Array<{ price?: number; promotionPrice?: number; buyMin?: number; buyMax?: number; productUnitId?: number }>) || []).map((price, index) => (
                            <div key={index} className="rounded-lg border bg-gray-50 px-3 py-2 text-sm text-gray-700">
                              unitId: {price.productUnitId || '-'} • price: {price.price ?? '-'} • promo: {price.promotionPrice ?? '-'} • min: {price.buyMin ?? 0} • max: {price.buyMax ?? 0}
                            </div>
                          ))}
                        </div>
                      : <p className="text-sm text-gray-500">ไม่มีข้อมูลราคาแบบละเอียด</p>}
                  </div>

                  <div className="rounded-2xl border bg-white p-4 space-y-3">
                    <h3 className="font-semibold text-gray-900">Stock details</h3>
                    {(((selectedProduct.stockDetails as Array<{ productLotId?: number; stockNum?: number; expiryDate?: string | null }>) || []).length > 0)
                      ? <div className="space-y-2">
                          {((selectedProduct.stockDetails as Array<{ productLotId?: number; stockNum?: number; expiryDate?: string | null }>) || []).map((stock, index) => (
                            <div key={index} className="rounded-lg border bg-gray-50 px-3 py-2 text-sm text-gray-700">
                              lot: {stock.productLotId || '-'} • qty: {stock.stockNum ?? 0} • expiry: {stock.expiryDate || '-'}
                            </div>
                          ))}
                        </div>
                      : <p className="text-sm text-gray-500">ไม่มีข้อมูล stock detail</p>}
                  </div>

                  <div className="rounded-2xl border bg-white p-4 space-y-3">
                    <h3 className="font-semibold text-gray-900">Hashtags / Related</h3>
                    <div className="flex flex-wrap gap-2">
                      {(((selectedProduct.hashtags as string[]) || []).length > 0)
                        ? ((selectedProduct.hashtags as string[]) || []).map((tag, index) => (
                            <span key={index} className="px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-medium">#{tag}</span>
                          ))
                        : <p className="text-sm text-gray-500">ไม่มี hashtag</p>}
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-2">Related products</p>
                      <pre className="text-xs bg-gray-900 text-green-400 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
                        {JSON.stringify(selectedProduct.relatedProducts || [], null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

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
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-700">
                  สินค้าที่เลือก ({selectedCount} รายการ)
                </h4>
                <span className="text-xs text-gray-500">
                  {Math.ceil(selectedCount / 9)} bubble • 9 สินค้า / bubble
                </span>
              </div>
              <ScrollArea className="h-40">
                <div className="space-y-3">
                  {Array.from({ length: Math.ceil(products.filter(p => selectedItems.has(p.productId)).length / 9) }).map((_, groupIndex) => {
                    const grouped = products.filter(p => selectedItems.has(p.productId)).slice(groupIndex * 9, groupIndex * 9 + 9);
                    return (
                      <div key={groupIndex} className="rounded-xl border bg-white p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-green-700">Bubble {groupIndex + 1}</span>
                          <span className="text-xs text-gray-400">{grouped.length} รายการ</span>
                        </div>
                        {grouped.map((product, idx) => (
                          <div key={product.id} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded border">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold">
                                {groupIndex * 9 + idx + 1}
                              </span>
                              <span className="truncate max-w-[240px]">{product.name}</span>
                            </div>
                            <span className="font-medium text-red-600 whitespace-nowrap">
                              ฿{Number(product.promotionPrice || product.basePrice).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
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
