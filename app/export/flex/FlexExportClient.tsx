'use client';

import { useMemo, useState } from 'react';
import { Copy, Download, FileJson } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProductGrid3x3Preview from './ProductGrid3x3Preview';
import { buildFlexPayload, buildSingleBubbleFlexPayload } from './flex-json';
import type { ExportGlobalConfig, ExportPreviewDocument } from './export-types';

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
  initialPreview,
}: {
  initialConfig: ExportGlobalConfig;
  initialPreview: ExportPreviewDocument;
}) {
  const [config] = useState<ExportGlobalConfig>(initialConfig);
  const [copied, setCopied] = useState<'all' | `bubble-${number}` | null>(null);
  const [activeBubbleJsonIndex, setActiveBubbleJsonIndex] = useState<number | null>(null);

  const preview = initialPreview;
  const flexPayload = useMemo(() => buildFlexPayload(preview), [preview]);
  const flexJson = useMemo(() => JSON.stringify(flexPayload, null, 2), [flexPayload]);

  const copyText = async (content: string, mode: 'all' | `bubble-${number}`) => {
    await navigator.clipboard.writeText(content);
    setCopied(mode);
    setTimeout(() => setCopied(null), 1600);
  };

  return (
    <section className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)_420px]">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Template ที่เลือก</h2>
        <div className="mt-4 rounded-2xl border border-violet-200 bg-violet-50 p-4">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-violet-500">Preset</p>
          <h3 className="mt-2 text-lg font-bold text-slate-900">{config.title}</h3>
          <p className="mt-2 text-sm text-slate-600">{config.intro}</p>
        </div>
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
          โหมดนี้ลดส่วนกรอกออกแล้ว ใช้ template เป็นตัวกำหนด header และโครง Flex อัตโนมัติ
        </div>
      </div>

      <div className="space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Preview 3x3</h2>
              <p className="mt-1 text-sm text-slate-500">จัดสินค้าอัตโนมัติ 9 ชิ้นต่อ bubble แบบ 3x3</p>
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
            <div key={bubble.bubbleIndex} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap gap-2">
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

              {activeBubbleJsonIndex === index && activeBubbleJsonIndex !== null ? (
                <div className="rounded-xl border border-slate-200 bg-slate-950 p-3 text-xs text-slate-100">
                  <pre className="max-h-[360px] overflow-auto whitespace-pre-wrap break-all">{singleBubbleJson}</pre>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Export JSON</h2>
            <p className="mt-1 text-sm text-slate-500">Copy หรือ download JSON ทั้งชุดได้ทันที</p>
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
