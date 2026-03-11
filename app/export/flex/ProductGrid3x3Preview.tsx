import type { ExportPreviewBubble, ExportPreviewProduct } from './export-types';
import { getProductBadgeTokens } from './export-helpers';

function formatNumber(value: number | null | undefined) {
  return Number(value || 0).toLocaleString();
}

function ProductCell({ product }: { product: ExportPreviewProduct | null }) {
  if (!product) {
    return <div className="aspect-[0.92] rounded-2xl border border-dashed border-slate-200 bg-slate-50" />;
  }

  const badges = getProductBadgeTokens(product);
  const darkPrice = product.flashDarkPrice ?? product.flashPrice ?? product.promotionPrice ?? product.basePrice;
  const redPrice = product.flashRedPrice ?? product.basePrice;
  const oldPrice = redPrice > darkPrice ? formatNumber(redPrice) : null;
  const newPrice = formatNumber(darkPrice);

  return (
    <div className="aspect-[0.92] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="relative aspect-square bg-slate-100">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">No image</div>
        )}

        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
          {badges.slice(0, 2).map((badge) => (
            <span key={badge} className="rounded-md bg-red-500 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-sm">
              {badge === 'Flash' ? 'FLASH' : badge}
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-1.5 p-2.5">
        <p className="line-clamp-2 min-h-[2.4rem] text-[11px] font-medium leading-5 text-slate-800">
          {product.name}
        </p>

        <div className="flex flex-wrap items-end gap-x-2 gap-y-1">
          {oldPrice ? <span className="text-[10px] text-slate-400 line-through">{oldPrice}</span> : null}
          <span className="text-[13px] font-bold text-red-600">{newPrice}</span>
        </div>

        {product.isFlashsale && (product.flashMinQty || product.flashMaxQty) ? (
          <p className="text-[10px] font-medium text-amber-700">
            ต่ำสุด {product.flashMinQty ?? '-'} ชิ้น{product.flashMaxQty ? ` • ไม่เกิน ${product.flashMaxQty} ชิ้น` : ''}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default function ProductGrid3x3Preview({ bubble }: { bubble: ExportPreviewBubble }) {
  const isFlashStyle = bubble.products.some((product) => product.isFlashsale) || bubble.label.toLowerCase().includes('flash');
  const flashMetaProduct = bubble.products.find((product) => product.flashSaleName);

  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div
        className={
          isFlashStyle
            ? 'bg-gradient-to-r from-slate-900 via-slate-800 to-yellow-400 px-4 py-3 text-white'
            : 'bg-violet-600 px-4 py-3 text-white'
        }
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/80">
              {isFlashStyle ? 'Hot Deal' : 'Product Set'}
            </p>
            <h3 className="mt-1 text-base font-black tracking-wide">{bubble.label}</h3>
            <p className="mt-0.5 text-xs text-white/85">{flashMetaProduct?.flashSaleName || bubble.subtitle}</p>
          </div>
          <div className="rounded-full bg-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white">
            {isFlashStyle ? 'FLASH' : `${bubble.products.length}/9`}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 p-4">
        {bubble.grid.flat().map((product, index) => (
          <ProductCell key={product?.productId ?? `empty-${index}`} product={product} />
        ))}
      </div>
    </section>
  );
}
