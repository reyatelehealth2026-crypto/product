'use client';

import { useMemo, useState } from 'react';
import { Copy, Download, FileJson } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ProductGrid3x3Preview from './ProductGrid3x3Preview';
import { buildPreviewDocument } from './export-helpers';
import { buildFlexPayload, buildSingleBubbleFlexPayload } from './flex-json';
import type { ExportBubbleConfig, ExportGlobalConfig } from './export-types';
import type { Product } from '@prisma/client';

function downloadJson(filename: string, content: string) {
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function FlexExportClient({
  initialConfig,
  products,
}: {
  initialConfig: ExportGlobalConfig;
  products: Product[];
}) {
  const [config, setConfig] = useState<ExportGlobalConfig>(initialConfig);
  const [bubbleOverrides, setBubbleOverrides] = useState<Partial<ExportBubbleConfig>[]>([]);
  const [copied, setCopied] = useState<'all' | `bubble-${number}` | null>(null);
  const [activeBubbleJsonIndex, setActiveBubbleJsonIndex] = useState<number | null>(null);

  const preview = useMemo(
    () => buildPreviewDocument(products, config, bubbleOverrides),
    [products, config, bubbleOverrides]
  );

  const flexPayload = useMemo(() => buildFlexPayload(preview), [preview]);
  const flexJson = useMemo(() => JSON.stringify(flexPayload, null, 2), [flexPayload]);
  const activeBubbleJson = useMemo(() => {
    if (activeBubbleJsonIndex == null) return null;
    const payload = buildSingleBubbleFlexPayload(preview, activeBubbleJsonIndex);
    return payload ? JSON.stringify(payload, null, 2) : null;
  }, [preview, activeBubbleJsonIndex]);

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

  const copyText = async (content: string, mode: 'all' | `bubble-${number}`) => {
    await navigator.clipboard.writeText(content);
    setCopied(mode);
    setTimeout(() => setCopied(null), 1600);
  };

  return (
    <section className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)_440px]">
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

        {preview.bubbles.map((bubble, index) => {
          const singleBubblePayload = buildSingleBubbleFlexPayload(preview, index);
          const singleBubbleJson = singleBubblePayload ? JSON.stringify(singleBubblePayload, null, 2) : '';

          return (
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

                <div className="mb-3 flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => copyText(singleBubbleJson, `bubble-${index}`)}>
                    <Copy className="mr-2 h-4 w-4" />
                    {copied === `bubble-${index}` ? 'คัดลอก bubble แล้ว' : `Copy bubble ${bubble.bubbleIndex}`}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => downloadJson(`flex-bubble-${bubble.bubbleIndex}.json`, singleBubbleJson)}>
                    <Download className="mr-2 h-4 w-4" />
                    Download bubble
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setActiveBubbleJsonIndex(activeBubbleJsonIndex === index ? null : index)}>
                    <FileJson className="mr-2 h-4 w-4" />
                    {activeBubbleJsonIndex === index ? 'ซ่อน JSON' : 'ดู JSON bubble'}
                  </Button>
                </div>

                <ProductGrid3x3Preview bubble={bubble} />

                {activeBubbleJsonIndex === index && activeBubbleJson ? (
                  <div className="mt-3 rounded-xl border border-slate-200 bg-slate-950 p-3 text-xs text-slate-100">
                    <pre className="max-h-[360px] overflow-auto whitespace-pre-wrap break-all">{activeBubbleJson}</pre>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">3. Flex JSON Export</h2>
            <p className="mt-1 text-sm text-slate-500">Copy หรือ download JSON ทั้งชุด เพื่อใช้ส่งต่อหรือทดสอบ LINE Flex</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => copyText(flexJson, 'all')}>
              <Copy className="mr-2 h-4 w-4" />
              {copied === 'all' ? 'คัดลอกแล้ว' : 'Copy all'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => downloadJson('flex-export-all.json', flexJson)}>
              <Download className="mr-2 h-4 w-4" />
              Download all
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
