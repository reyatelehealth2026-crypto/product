'use client';

import { useMemo, useState } from 'react';
import { Copy, FileJson } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ProductGrid3x3Preview from './ProductGrid3x3Preview';
import { buildPreviewDocument } from './export-helpers';
import { buildFlexPayload } from './flex-json';
import type { ExportBubbleConfig, ExportGlobalConfig, ExportTemplateKey } from './export-types';
import type { Product } from '@prisma/client';

export default function FlexExportClient({
  initialConfig,
  products,
}: {
  initialConfig: ExportGlobalConfig;
  products: Product[];
}) {
  const [config, setConfig] = useState<ExportGlobalConfig>(initialConfig);
  const [bubbleOverrides, setBubbleOverrides] = useState<Partial<ExportBubbleConfig>[]>([]);
  const [copied, setCopied] = useState(false);

  const preview = useMemo(
    () => buildPreviewDocument(products, config, bubbleOverrides),
    [products, config, bubbleOverrides]
  );

  const flexPayload = useMemo(() => buildFlexPayload(preview), [preview]);
  const flexJson = useMemo(() => JSON.stringify(flexPayload, null, 2), [flexPayload]);

  const updateBubble = (index: number, field: keyof ExportBubbleConfig, value: string) => {
    setBubbleOverrides((prev) => {
      const next = [...prev];
      next[index] = {
        bubbleIndex: index + 1,
        productIds: preview.bubbles[index]?.products.map((product) => product.productId) || [],
        ...next[index],
        [field]: value,
      };
      return next;
    });
  };

  const copyJson = async () => {
    await navigator.clipboard.writeText(flexJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <section className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)_420px]">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">1. Global Content Setup</h2>
        <div className="mt-4 space-y-3">
          <Input value={config.title} onChange={(e) => setConfig((prev) => ({ ...prev, title: e.target.value }))} placeholder="หัวหลัก" />
          <Input value={config.intro} onChange={(e) => setConfig((prev) => ({ ...prev, intro: e.target.value }))} placeholder="คำโปรย" />
          <Input value={config.footerText} onChange={(e) => setConfig((prev) => ({ ...prev, footerText: e.target.value }))} placeholder="ข้อความท้าย" />
          <Input value={config.ctaLabel} onChange={(e) => setConfig((prev) => ({ ...prev, ctaLabel: e.target.value }))} placeholder="ปุ่ม CTA" />
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
            ใช้ข้อมูลจาก DB โดยตรง และไม่ trigger re-sync ระหว่าง export
          </div>
        </div>
      </div>

      <div className="space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">2. Bubble Preview 3x3</h2>
              <p className="mt-1 text-sm text-slate-500">แต่ละ bubble แสดง 9 สินค้าแบบ 3x3 พร้อม override ราย bubble</p>
            </div>
            <div className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
              {preview.bubbles.length} bubble
            </div>
          </div>
        </div>

        {preview.bubbles.map((bubble, index) => (
          <div key={bubble.bubbleIndex} className="space-y-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 grid gap-3 md:grid-cols-3">
                <Input
                  value={bubble.subtitle}
                  onChange={(e) => updateBubble(index, 'subtitle', e.target.value)}
                  placeholder="Bubble subtitle"
                />
                <Input
                  value={bubble.label}
                  onChange={(e) => updateBubble(index, 'label', e.target.value)}
                  placeholder="Bubble label"
                />
                <Input
                  value={bubble.note}
                  onChange={(e) => updateBubble(index, 'note', e.target.value)}
                  placeholder="Bubble note"
                />
              </div>
              <ProductGrid3x3Preview bubble={bubble} />
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">3. Flex JSON Export</h2>
            <p className="mt-1 text-sm text-slate-500">Copy JSON เพื่อใช้ส่งต่อหรือทดสอบ LINE Flex</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={copyJson}>
              <Copy className="mr-2 h-4 w-4" />
              {copied ? 'คัดลอกแล้ว' : 'Copy JSON'}
            </Button>
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-950 p-3 text-xs text-slate-100">
          <div className="mb-2 flex items-center gap-2 text-slate-400">
            <FileJson className="h-4 w-4" />
            <span>Flex payload preview</span>
          </div>
          <pre className="max-h-[840px] overflow-auto whitespace-pre-wrap break-all">{flexJson}</pre>
        </div>
      </div>
    </section>
  );
}
