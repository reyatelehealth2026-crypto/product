import Link from 'next/link';
import { PrismaClient } from '@prisma/client';
import { buildPreviewDocument } from './export-helpers';
import { EXPORT_PRESETS } from './export-presets';
import type { ExportTemplateKey } from './export-types';

const prisma = new PrismaClient();

function parseIds(raw?: string): number[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((value) => Number.isFinite(value) && value > 0);
}

export default async function FlexExportPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string; template?: string }>;
}) {
  const resolved = await searchParams;
  const ids = parseIds(resolved.ids);
  const template = ((resolved.template as ExportTemplateKey) || 'promotion');
  const config = EXPORT_PRESETS[template] || EXPORT_PRESETS.promotion;

  const products = ids.length
    ? await prisma.product.findMany({
        where: { productId: { in: ids } },
        orderBy: { productId: 'asc' },
      })
    : [];

  const preview = buildPreviewDocument(products, config);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-violet-600">Flex Export Wizard</p>
            <h1 className="text-2xl font-bold text-slate-900">เตรียมส่งออก LINE Flex</h1>
            <p className="mt-1 text-sm text-slate-500">
              ใช้ข้อมูลจาก DB โดยตรง พร้อม preset และ grouping สำหรับ bubble แบบ 3x3
            </p>
          </div>
          <Link href="/" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
            ← กลับหน้าหลัก
          </Link>
        </div>

        {ids.length === 0 ? (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
            <h2 className="text-lg font-semibold">ยังไม่มีสินค้าที่เลือกสำหรับส่งออก</h2>
            <p className="mt-2 text-sm">
              กรุณากลับไปที่หน้าหลัก เลือกสินค้า แล้วค่อยกดเข้า Flex Export Wizard อีกครั้ง
            </p>
          </section>
        ) : (
          <section className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)_420px]">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">1. Template Panel</h2>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                {Object.entries(EXPORT_PRESETS).map(([key, preset]) => (
                  <Link
                    key={key}
                    href={`/export/flex?ids=${ids.join(',')}&template=${key}`}
                    className={`block rounded-xl border px-3 py-2 ${config.template === key ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                  >
                    <div className="font-medium">{preset.title}</div>
                    <div className="text-xs text-slate-500">{preset.intro}</div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">2. Global Content Setup</h2>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Title</div>
                  <div className="mt-1 font-medium text-slate-900">{config.title}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Intro</div>
                  <div className="mt-1 text-slate-700">{config.intro}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Footer / CTA</div>
                  <div className="mt-1 text-slate-700">{config.footerText}</div>
                  <div className="mt-2 inline-flex rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white">{config.ctaLabel}</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">3. Bubble Editor & Preview</h2>
              <p className="mt-2 text-sm text-slate-500">เลือกสินค้า {products.length} รายการ • สร้างได้ {preview.bubbles.length} bubble</p>
              <div className="mt-4 space-y-3">
                {preview.bubbles.map((bubble) => (
                  <div key={bubble.bubbleIndex} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{bubble.label}</p>
                        <p className="text-xs text-slate-500">{bubble.subtitle}</p>
                      </div>
                      <div className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-700">
                        {bubble.products.length} items
                      </div>
                    </div>
                  </div>
                ))}
                <p className="text-xs text-slate-400">Task ถัดไปจะต่อ bubble overrides + preview grid 3x3 จริงใน panel นี้</p>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
