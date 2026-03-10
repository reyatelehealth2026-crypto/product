import type { ExportPreviewBubble, ExportPreviewProduct } from './export-types';
import { getProductBadgeTokens } from './export-helpers';

function formatPrice(product: ExportPreviewProduct) {
  const price = product.promotionPrice ?? product.basePrice;
  return Number(price || 0).toLocaleString();
}

function ProductCell({ product }: { product: ExportPreviewProduct | null }) {
  if (!product) {
    return <div className="aspect-[0.82] rounded-2xl border border-dashed border-slate-200 bg-slate-50" />;
  }

  const badges = getProductBadgeTokens(product);

  return (
    <div className="aspect-[0.82] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="aspect-square bg-slate-100">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">No image</div>
        )}
      </div>
      <div className="space-y-2 p-2.5">
        <p className="line-clamp-2 min-h-[2.5rem] text-[11px] font-medium leading-5 text-slate-800">
          {product.name}
        </p>
        <div className="flex flex-wrap gap-1">
          {badges.slice(0, 2).map((badge) => (
            <span
              key={badge}
              className="rounded-full bg-slate-900 px-1.5 py-0.5 text-[9px] font-semibold text-white"
            >
              {badge}
            </span>
          ))}
        </div>
        <div className="space-y-1">
          <p className="text-[12px] font-semibold text-rose-600">฿{formatPrice(product)}</p>
          <p className="text-[10px] text-slate-400">คงเหลือ {product.stockQuantity.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}

export default function ProductGrid3x3Preview({ bubble }: { bubble: ExportPreviewBubble }) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-violet-500">{bubble.label}</p>
          <h3 className="mt-1 text-sm font-semibold text-slate-900">{bubble.subtitle}</h3>
        </div>
        <div className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
          {bubble.products.length}/9 items
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {bubble.grid.flat().map((product, index) => (
          <ProductCell key={product?.productId ?? `empty-${index}`} product={product} />
        ))}
      </div>
    </section>
  );
}
