'use client';

import React, { useState, useMemo, useCallback, useRef } from 'react';
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
  Upload,
  FileJson,
  AlertCircle,
  Loader2,
  Globe,
  ChevronDown
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import type { Product, ProductUnit, SelectedProduct, FlashSaleProduct, FlashSaleResponse, BroadcastItem, BroadcastCategory } from '@/types/product';
import { generateFlexMessage, productToBroadcastItem, flashSaleToBroadcastItem, generateBroadcastCarousel } from '@/types/product';
import { SAMPLE_PRODUCTS } from './sample-data';

interface ProductSelectorProps {
  initialProducts?: Product[];
}

type FilterType = 'all' | 'flashsale' | 'promotion' | 'new' | 'bestseller';
type DataSource = 'sample' | 'upload' | 'api';

const FILTERS: { key: FilterType; label: string; icon: React.ElementType; color: string; bgColor: string }[] = [
  { key: 'all', label: 'ทั้งหมด', icon: Package, color: 'text-gray-700', bgColor: 'bg-gray-100' },
  { key: 'flashsale', label: 'Flash Sale', icon: Zap, color: 'text-red-600', bgColor: 'bg-red-50' },
  { key: 'promotion', label: 'โปรโมชั่น', icon: Tag, color: 'text-orange-600', bgColor: 'bg-orange-50' },
  { key: 'new', label: 'สินค้าใหม่', icon: Sparkles, color: 'text-purple-600', bgColor: 'bg-purple-50' },
  { key: 'bestseller', label: 'ขายดี', icon: TrendingUp, color: 'text-green-600', bgColor: 'bg-green-50' },
];

export default function ProductSelector({ initialProducts = SAMPLE_PRODUCTS }: ProductSelectorProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [dataSource, setDataSource] = useState<DataSource>('sample');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedItems, setSelectedItems] = useState<Map<number, SelectedProduct>>(new Map());
  const [showFlexDialog, setShowFlexDialog] = useState(false);
  const [copied, setCopied] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [bubbleCount, setBubbleCount] = useState(6);
  const [flashSaleLoading, setFlashSaleLoading] = useState(false);
  const [apiLoading, setApiLoading] = useState(false);
  const [flashSaleProducts, setFlashSaleProducts] = useState<FlashSaleProduct[]>([]);
  const [flashSaleMenuName, setFlashSaleMenuName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const data = product.product_data[0];
      if (!data) return false;

      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || 
        data.name.toLowerCase().includes(searchLower) ||
        data.name_en.toLowerCase().includes(searchLower) ||
        data.sku.toLowerCase().includes(searchLower) ||
        data.barcode.toLowerCase().includes(searchLower);

      let matchesFilter = true;
      switch (activeFilter) {
        case 'flashsale':
          matchesFilter = product.product_is_flashSale === 1 || data.is_promotion === 1;
          break;
        case 'promotion':
          matchesFilter = data.is_promotion === 1;
          break;
        case 'new':
          matchesFilter = product.product_is_recommend === 1 || product.product_is_flashSale === 1;
          break;
        case 'bestseller':
          matchesFilter = data.is_bestseller === 1 || product.customer_buyed > 0;
          break;
      }

      return matchesSearch && matchesFilter;
    });
  }, [products, searchQuery, activeFilter]);

  // Handle file upload
  const handleFileUpload = useCallback(async (file: File) => {
    setUploadError(null);
    
    if (!file.name.endsWith('.json')) {
      setUploadError('กรุณาอัปโหลดไฟล์ .json เท่านั้น');
      return;
    }

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      let productArray: Product[] = [];
      
      // Handle different JSON structures
      if (data.product && Array.isArray(data.product)) {
        productArray = data.product;
      } else if (Array.isArray(data)) {
        productArray = data;
      } else {
        throw new Error('รูปแบบ JSON ไม่ถูกต้อง: ต้องการ property "product" ที่เป็น array หรือ array โดยตรง');
      }

      if (productArray.length === 0) {
        throw new Error('ไม่พบข้อมูลสินค้าในไฟล์');
      }

      setProducts(productArray);
      setDataSource('upload');
      setSelectedItems(new Map()); // Clear selections
      
    } catch (err) {
      setUploadError((err as Error).message);
    }
  }, []);

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  // Handle file input change
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  // Reset to sample data
  const resetToSample = useCallback(() => {
    setProducts(SAMPLE_PRODUCTS);
    setDataSource('sample');
    setUploadError(null);
    setSelectedItems(new Map());
    setFlashSaleProducts([]);
    setFlashSaleMenuName('');
  }, []);

  // Fetch Flash Sale from API
  const fetchFlashSale = useCallback(async () => {
    setFlashSaleLoading(true);
    setUploadError(null);
    try {
      const res = await fetch('/api/flashsale?id=116');
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to fetch');

      const data: FlashSaleResponse = json.data;
      const allProducts = data.flashsale.flat();
      setFlashSaleProducts(allProducts);
      setFlashSaleMenuName(data.flasSale_menu?.[0]?.name || 'Flash Sale');
      setActiveFilter('flashsale');
      setDataSource('api');
      setSelectedItems(new Map());
    } catch (err) {
      setUploadError(`ไม่สามารถดึงข้อมูล Flash Sale ได้: ${(err as Error).message}`);
    } finally {
      setFlashSaleLoading(false);
    }
  }, []);

  // Fetch products from API
  const fetchFromApi = useCallback(async (page: number = 1) => {
    setApiLoading(true);
    setUploadError(null);
    try {
      const apiUrl = encodeURIComponent(`https://www.cnypharmacy.com/api/getDataProductIsGroup?page=${page}`);
      const res = await fetch(`/api/products?url=${apiUrl}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to fetch');

      const productArray: Product[] = json.data.product || [];
      if (productArray.length === 0) throw new Error('ไม่พบข้อมูลสินค้า');

      setProducts(productArray);
      setDataSource('api');
      setFlashSaleProducts([]);
      setSelectedItems(new Map());
    } catch (err) {
      setUploadError(`ไม่สามารถดึงข้อมูลสินค้าได้: ${(err as Error).message}`);
    } finally {
      setApiLoading(false);
    }
  }, []);

  // Toggle selection
  const toggleSelection = useCallback((product: Product) => {
    const data = product.product_data[0];
    const newSelected = new Map(selectedItems);
    
    if (newSelected.has(data.id)) {
      newSelected.delete(data.id);
    } else {
      newSelected.set(data.id, {
        product,
        quantity: 1,
        selectedUnit: product.product_unit[0] || null
      });
    }
    setSelectedItems(newSelected);
  }, [selectedItems]);

  // Clear selections
  const clearSelections = useCallback(() => {
    setSelectedItems(new Map());
  }, []);

  // Generate Flex Message JSON
  const flexMessageJson = useMemo(() => {
    // If flash sale products exist and filter is flashsale, use them
    if (flashSaleProducts.length > 0 && activeFilter === 'flashsale') {
      const broadcastItems = flashSaleProducts.map(flashSaleToBroadcastItem);
      return JSON.stringify(generateBroadcastCarousel(broadcastItems, 'flashsale', bubbleCount), null, 2);
    }

    // Otherwise use selected products
    const items = Array.from(selectedItems.values());
    if (items.length === 0) return '{}';

    const broadcastItems = items.map(item => productToBroadcastItem(item.product));
    const category = (activeFilter === 'all' ? 'all' : activeFilter) as BroadcastCategory;
    return JSON.stringify(generateBroadcastCarousel(broadcastItems, category, bubbleCount), null, 2);
  }, [selectedItems, activeFilter, bubbleCount, flashSaleProducts]);

  // Copy to clipboard
  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(flexMessageJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download JSON
  const downloadJSON = () => {
    const blob = new Blob([flexMessageJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flex-message-${activeFilter}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const selectedCount = selectedItems.size;
  const isSelected = (productId: number) => selectedItems.has(productId);

  // Calculate sold percentage for progress bar
  const getSoldPercent = (stock: string) => {
    const num = parseFloat(stock);
    if (isNaN(num) || num <= 0) return 100;
    if (num > 50) return 20;
    if (num > 20) return 50;
    if (num > 10) return 75;
    return 90;
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gray-50">
        {/* Sticky Header */}
        <div className="sticky top-0 z-40 bg-white border-b shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex flex-col gap-3">
              {/* Top Row: Search + Upload */}
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="🔍 ค้นหาสินค้า (ชื่อ, SKU, Barcode...)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 border-gray-200 focus:border-green-500 focus:ring-green-500"
                  />
                </div>

                {/* Upload Button */}
                <input
                  type="file"
                  accept=".json"
                  ref={fileInputRef}
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="whitespace-nowrap"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  อัปโหลด JSON
                </Button>

                {dataSource !== 'sample' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetToSample}
                    className="text-gray-500"
                  >
                    ใช้ตัวอย่าง
                  </Button>
                )}
              </div>

              {/* API Buttons Row */}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchFlashSale}
                  disabled={flashSaleLoading}
                  className="bg-yellow-50 border-yellow-300 text-yellow-800 hover:bg-yellow-100"
                >
                  {flashSaleLoading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Zap className="w-4 h-4 mr-1" />}
                  ดึง Flash Sale
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchFromApi(1)}
                  disabled={apiLoading}
                  className="bg-blue-50 border-blue-300 text-blue-800 hover:bg-blue-100"
                >
                  {apiLoading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Globe className="w-4 h-4 mr-1" />}
                  ดึงจาก API
                </Button>

                <div className="flex items-center gap-1.5 ml-auto">
                  <span className="text-xs text-gray-500">Bubble:</span>
                  <select
                    value={bubbleCount}
                    onChange={(e) => setBubbleCount(Number(e.target.value))}
                    className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    {[1, 2, 3, 4, 5, 6, 7].map(n => (
                      <option key={n} value={n}>{n} ({n * 9} สินค้า)</option>
                    ))}
                  </select>
                </div>

                {flashSaleProducts.length > 0 && (
                  <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium">
                    ⚡ {flashSaleMenuName} ({flashSaleProducts.length} รายการ)
                  </span>
                )}
              </div>

              {/* Filter Pills */}
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {FILTERS.map(({ key, label, icon: Icon, color, bgColor }) => (
                  <button
                    key={key}
                    onClick={() => setActiveFilter(key)}
                    className={cn(
                      "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                      activeFilter === key
                        ? cn(color, bgColor, "ring-2 ring-offset-1 ring-current")
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
          {/* Upload Area (Drag & Drop) */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "mb-4 p-6 border-2 border-dashed rounded-lg text-center transition-colors cursor-pointer",
              isDragging
                ? "border-green-500 bg-green-50"
                : "border-gray-300 bg-gray-50 hover:border-gray-400"
            )}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="flex flex-col items-center gap-2">
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center transition-colors",
                isDragging ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"
              )}>
                <FileJson className="w-6 h-6" />
              </div>
              <p className="text-sm text-gray-600">
                <span className="font-medium">ลากไฟล์ JSON มาวางที่นี่</span> หรือคลิกเพื่อเลือกไฟล์
              </p>
              <p className="text-xs text-gray-400">รองรับไฟล์ .json ที่มี property "product" หรือ array โดยตรง</p>
            </div>
          </div>

          {/* Error Message */}
          {uploadError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>{uploadError}</AlertDescription>
            </Alert>
          )}

          {/* Data Source Badge */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">พบ <span className="font-semibold text-gray-900">{filteredProducts.length}</span> รายการ</span>
              
              {dataSource === 'sample' && (
                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">ตัวอย่าง</span>
              )}
              {dataSource === 'upload' && (
                <span className="px-2 py-0.5 bg-green-100 text-green-600 text-xs rounded-full">อัปโหลด</span>
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

          {/* Products Grid */}
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {filteredProducts.map((product) => {
                const data = product.product_data[0];
                const price = product.product_price[0]?.product_price[0];
                const photo = product.product_photo[0];
                const stock = product.product_stock[0];
                const selected = isSelected(data.id);

                const displayPrice = price?.promotion_price !== '0.00' 
                  ? parseFloat(price.promotion_price) 
                  : parseFloat(price?.price || '0');
                const originalPrice = parseFloat(price?.price || '0');
                const hasDiscount = displayPrice < originalPrice && originalPrice > 0;
                const soldPercent = getSoldPercent(stock?.stock_num || '0');

                // Determine badge
                let badge = null;
                if (product.product_is_flashSale === 1 || (hasDiscount && displayPrice > 0)) {
                  badge = { text: 'FlashSale', color: 'bg-red-500', textColor: 'text-white' };
                } else if (data.is_promotion === 1) {
                  badge = { text: 'โปรโมชั่น', color: 'bg-orange-500', textColor: 'text-white' };
                } else if (data.is_bestseller === 1) {
                  badge = { text: 'ขายดี', color: 'bg-green-500', textColor: 'text-white' };
                } else if (product.product_is_recommend === 1) {
                  badge = { text: 'แนะนำ', color: 'bg-purple-500', textColor: 'text-white' };
                }

                return (
                  <Card
                    key={data.id}
                    className={cn(
                      "group relative overflow-hidden cursor-pointer transition-all duration-200",
                      "hover:shadow-lg hover:-translate-y-1",
                      selected 
                        ? "ring-2 ring-green-500 ring-offset-2 bg-green-50/50" 
                        : "border-gray-200 hover:border-green-300"
                    )}
                    onClick={() => toggleSelection(product)}
                  >
                    {/* Badge */}
                    {badge && (
                      <div className={cn(
                        "absolute top-2 left-2 z-10 px-2 py-0.5 rounded text-xs font-bold",
                        badge.color, badge.textColor
                      )}>
                        {badge.text}
                      </div>
                    )}

                    {/* RX Badge */}
                    {data.is_rx === 1 && (
                      <div className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-600 border border-red-200">
                        ยาตามใบสั่ง
                      </div>
                    )}

                    {/* Selection Indicator */}
                    {selected && (
                      <div className="absolute top-2 right-2 z-20 w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center shadow-md">
                        <Check className="w-4 h-4" />
                      </div>
                    )}

                    {/* Image */}
                    <div className="aspect-square bg-gray-100 relative overflow-hidden">
                      {photo ? (
                        <img
                          src={`https://www.cnypharmacy.com/${photo.photo_path}`}
                          alt={data.name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : null}
                      <div className={cn(
                        "w-full h-full flex items-center justify-center bg-gray-100",
                        photo && "absolute inset-0 -z-10"
                      )}>
                        <Package className="w-10 h-10 text-gray-300" />
                      </div>
                    </div>

                    {/* Content */}
                    <CardContent className="p-2.5 space-y-1.5">
                      {/* Name */}
                      <h3 className="font-medium text-xs text-gray-900 line-clamp-2 min-h-[2rem] leading-tight">
                        {data.name}
                      </h3>

                      {/* Price */}
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-sm font-bold text-red-600">
                          ฿{displayPrice.toLocaleString()}
                        </span>
                        {hasDiscount && (
                          <span className="text-[10px] text-gray-400 line-through">
                            ฿{originalPrice.toLocaleString()}
                          </span>
                        )}
                      </div>

                      {/* Progress Bar (Flash Sale style) */}
                      {badge?.text === 'FlashSale' && (
                        <div className="space-y-1">
                          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-orange-400 to-red-500 rounded-full transition-all"
                              style={{ width: `${soldPercent}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-gray-500">
                            ขายแล้ว {soldPercent}%
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Package className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">ไม่พบสินค้า</h3>
              <p className="text-sm text-gray-500 mt-1">
                ลองค้นหาด้วยคำค้นอื่น หรืออัปโหลดไฟล์ JSON ใหม่
              </p>
              <Button 
                variant="outline"
                className="mt-4"
                onClick={resetToSample}
              >
                ใช้ข้อมูลตัวอย่าง
              </Button>
            </div>
          )}
        </div>

        {/* Floating Action Button */}
        {(selectedCount > 0 || flashSaleProducts.length > 0) && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3">
            {/* Selected Count Card */}
            <div className="bg-white rounded-full shadow-lg border px-4 py-2 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold text-sm">
                {flashSaleProducts.length > 0 ? flashSaleProducts.length : selectedCount}
              </div>
              <span className="text-sm font-medium text-gray-700">
                {flashSaleProducts.length > 0 ? 'Flash Sale' : 'รายการที่เลือก'}
              </span>
              {selectedCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 rounded-full hover:bg-red-50 hover:text-red-600"
                  onClick={clearSelections}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* Generate Flex Button */}
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
              {/* Items Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                {flashSaleProducts.length > 0 && activeFilter === 'flashsale' ? (
                  <>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">
                      ⚡ {flashSaleMenuName} ({flashSaleProducts.length} รายการ) — {bubbleCount} bubble(s)
                    </h4>
                    <ScrollArea className="h-32">
                      <div className="space-y-2">
                        {flashSaleProducts.map((item, idx) => (
                          <div key={item.id} className="flex items-center justify-between text-sm bg-white p-2 rounded border">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center text-xs font-bold">
                                {idx + 1}
                              </span>
                              <span className="truncate max-w-[200px]">{item.name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-gray-400 line-through text-xs">฿{parseFloat(item.red_price).toLocaleString()}</span>
                              <span className="font-medium text-red-600">฿{parseFloat(item.dark_price).toLocaleString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </>
                ) : (
                  <>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">สินค้าที่เลือก ({selectedCount} รายการ) — {bubbleCount} bubble(s)</h4>
                    <ScrollArea className="h-32">
                      <div className="space-y-2">
                        {Array.from(selectedItems.values()).map((item, idx) => {
                          const data = item.product.product_data[0];
                          const price = item.product.product_price[0]?.product_price[0];
                          const displayPrice = price?.promotion_price !== '0.00' 
                            ? parseFloat(price.promotion_price) 
                            : parseFloat(price?.price || '0');
                          
                          return (
                            <div key={data.id} className="flex items-center justify-between text-sm bg-white p-2 rounded border">
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold">
                                  {idx + 1}
                                </span>
                                <span className="truncate max-w-[200px]">{data.name}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-gray-500">x{item.quantity}</span>
                                <span className="font-medium text-red-600">฿{displayPrice.toLocaleString()}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </>
                )}
              </div>

              {/* JSON Output */}
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

              {/* Tips */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                <strong>💡 วิธีใช้:</strong> คัดลอก JSON ด้านบน แล้วนำไปใช้ใน LINE Messaging API หรือ Broadcast System
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
