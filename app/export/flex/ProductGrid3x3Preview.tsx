import type { ExportPreviewBubble, ExportPreviewProduct } from './export-types';
import { getProductUrlFromSku } from './export-helpers';

function formatPrice(value: number | null | undefined) {
  return Number(value || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function ProductCard({ product }: { product: ExportPreviewProduct | null }) {
  if (!product) {
    return <div className="h-48 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50" />;
  }

  const productUrl = product.productUrl || getProductUrlFromSku(product.sku);
  const salePrice = product.flashDarkPrice ?? product.flashPrice ?? product.promotionPrice ?? product.basePrice;
  const originalPrice = product.flashRedPrice ?? product.basePrice;
  const hasDiscount = originalPrice > salePrice;
  const minQty = product.flashMinQty ?? 0;
  const maxQty = product.flashMaxQty ?? 0;
  const dateStart = formatDate(product.offerStart);
  const dateEnd = formatDate(product.offerEnd);
  const hasDate = !!(dateStart || dateEnd);
  const promoLine1 = product.promoLine1 || '';
  const promoLine2 = product.promoLine2 || '';
  const hasPromo = !!(promoLine1 || promoLine2);
  const offerHeader = product.flashSaleName || 'SPECIAL OFFER';

  const unitLabel = (() => {
    const match = (product.name || '').match(/\[([^\]]+)\]/);
    return match ? match[1] : '';
  })();

  const salePriceText = unitLabel
    ? `${formatPrice(salePrice)} -/ ${unitLabel}`
    : `${formatPrice(salePrice)}`;

  const discountedText = unitLabel
    ? `ลดเหลือ ${formatPrice(originalPrice)} / ${unitLabel}`
    : `ลดเหลือ ${formatPrice(originalPrice)}`;

  return (
    <div className="relative flex flex-col rounded-2xl border-2 border-red-500 bg-white shadow-sm">
      {/* SPECIAL OFFER ribbon — sits on top border */}
      <div className="flex justify-center">
        <span className="-mt-[13px] rounded-xl bg-red-700 px-3 py-1 text-[10px] font-bold tracking-widest text-white shadow">
          {offerHeader}
        </span>
      </div>

      {/* Product image */}
      <a href={productUrl} target="_blank" rel="noreferrer" className="mx-2 mt-2 block overflow-hidden rounded-xl bg-slate-50">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="aspect-[4/3] w-full object-contain" />
        ) : (
          <div className="flex aspect-[4/3] w-full items-center justify-center text-[10px] text-slate-400">No image</div>
        )}
      </a>

      {/* Min/Max qty pills */}
      {(minQty > 0 || maxQty > 0) && (
        <div className="mx-2 mt-2 flex flex-wrap gap-1">
          {minQty > 0 && (
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[9px] text-blue-700">ขั้นต่ำ {minQty} ชิ้น</span>
          )}
          {maxQty > 0 && (
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[9px] text-blue-700">จำกัด {maxQty} ชิ้น</span>
          )}
        </div>
      )}

      {/* Date range */}
      {hasDate && (
        <div className="mx-2 mt-1.5 rounded-md border border-red-200 px-2 py-1">
          {dateStart && <p className="text-[9px] text-red-600">เริ่ม {dateStart}</p>}
          {dateEnd && <p className="text-[9px] text-red-600">ถึง {dateEnd}</p>}
        </div>
      )}

      {/* Product name */}
      <a
        href={productUrl}
        target="_blank"
        rel="noreferrer"
        className="mx-2 mt-1.5 line-clamp-3 text-[10px] font-semibold leading-4 text-blue-800 underline"
      >
        {product.name}
      </a>

      {/* Promo conditions */}
      {hasPromo && (
        <div className="mx-2 mt-1 space-y-0.5">
          {promoLine1 && <p className="text-[9px] leading-3.5 text-slate-600">{promoLine1}</p>}
          {promoLine2 && <p className="text-[9px] leading-3.5 text-slate-600">{promoLine2}</p>}
        </div>
      )}

      {/* Sale price */}
      <p className="mx-2 mt-2 text-[12px] font-bold text-red-700">{salePriceText}</p>

      {/* Discounted/original */}
      {hasDiscount && (
        <p className="mx-2 text-[9px] text-slate-500">{discountedText}</p>
      )}

      {/* Buy button */}
      <a
        href={productUrl}
        target="_blank"
        rel="noreferrer"
        className="mx-2 mb-2 mt-2 block rounded-xl bg-red-500 py-1.5 text-center text-[11px] font-bold text-white hover:bg-red-600"
      >
        ซื้อเลย
      </a>
    </div>
  );
}

export default function ProductGrid3x3Preview({ bubble }: { bubble: ExportPreviewBubble }) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-slate-50 p-4 shadow-sm">
      <div className="grid grid-cols-3 gap-4">
        {bubble.products.map((product) => (
          <ProductCard key={product.productId} product={product} />
        ))}
      </div>
    </section>
  );
}
