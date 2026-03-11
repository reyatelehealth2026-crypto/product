import Link from 'next/link';
import { PrismaClient } from '@prisma/client';
import FlexExportClient from './FlexExportClient';
import { EXPORT_PRESETS } from './export-presets';
import type { ExportTemplateKey } from './export-types';

const prisma = new PrismaClient();

type FlashSaleMeta = {
  flashsale_id?: number | string;
};

type FlashSaleApiRow = {
  sku?: string;
  dark_price?: string | number;
  red_price?: string | number;
  quota?: number | string;
  usage?: number | string;
  usage_show?: number | string;
  name?: string;
  min_item?: number | string;
  max_item?: number | string;
};

function parseIds(raw?: string): number[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((value) => Number.isFinite(value) && value > 0);
}

function parseFlashMeta(value: unknown): FlashSaleMeta | null {
  if (!value) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as FlashSaleMeta;
    } catch {
      return null;
    }
  }
  if (typeof value === 'object') return value as FlashSaleMeta;
  return null;
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function fetchFlashOverrides(products: Array<any>) {
  const flashIds = Array.from(
    new Set(
      products
        .flatMap((product) => {
          const entries = Array.isArray(product.flashSaleInfo) ? product.flashSaleInfo : [product.flashSaleInfo];
          return entries
            .map((entry: unknown) => parseFlashMeta(entry))
            .map((entry: FlashSaleMeta | null) => toNumber(entry?.flashsale_id))
            .filter((value: number | null): value is number => value != null);
        })
    )
  );

  const bySku = new Map<string, FlashSaleApiRow>();

  await Promise.all(
    flashIds.map(async (flashId) => {
      try {
        const response = await fetch(`https://www.cnypharmacy.com/api/flashsale/${flashId}`, {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'Mozilla/5.0',
          },
          cache: 'no-store',
        });

        if (!response.ok) return;
        const data = await response.json();
        const items = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];

        for (const item of items as FlashSaleApiRow[]) {
          if (item?.sku) bySku.set(String(item.sku), item);
        }
      } catch {
        // ignore upstream failures and fall back to DB snapshot
      }
    })
  );

  return bySku;
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

  const flashOverrides = await fetchFlashOverrides(products);

  const hydratedProducts = products.map((product) => {
    const flash = flashOverrides.get(String(product.sku));
    if (!flash) return product;

    const quota = toNumber(flash.quota);
    const usage = toNumber(flash.usage);
    const remaining = quota != null && usage != null ? Math.max(quota - usage, 0) : product.stockQuantity;

    return {
      ...product,
      stockQuantity: remaining,
      flashSaleInfo: [
        JSON.stringify({
          ...(Array.isArray(product.flashSaleInfo) && product.flashSaleInfo[0]
            ? parseFlashMeta(product.flashSaleInfo[0]) || {}
            : {}),
          name: flash.name,
          min_item: flash.min_item,
          max_item: flash.max_item,
          dark_price: flash.dark_price,
          red_price: flash.red_price,
          quota: flash.quota,
          usage: flash.usage,
          usage_show: flash.usage_show,
        }),
      ],
    };
  });

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-violet-600">Flex Export Wizard</p>
            <h1 className="text-2xl font-bold text-slate-900">เตรียมส่งออก LINE Flex</h1>
            <p className="mt-1 text-sm text-slate-500">
              ใช้ข้อมูลจาก DB และ override flash sale จาก upstream เพื่อให้ราคาใกล้เว็บจริงที่สุด
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
          <FlexExportClient initialConfig={config} products={hydratedProducts as any} />
        )}
      </div>
    </main>
  );
}
