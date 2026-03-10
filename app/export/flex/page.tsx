import Link from 'next/link';
import { PrismaClient } from '@prisma/client';
import FlexExportClient from './FlexExportClient';
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
          <FlexExportClient initialConfig={config} products={products} />
        )}
      </div>
    </main>
  );
}
