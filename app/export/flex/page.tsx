import Link from 'next/link';

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
  searchParams: Promise<{ ids?: string }>;
}) {
  const resolved = await searchParams;
  const ids = parseIds(resolved.ids);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-violet-600">Flex Export Wizard</p>
            <h1 className="text-2xl font-bold text-slate-900">เตรียมส่งออก LINE Flex</h1>
            <p className="mt-1 text-sm text-slate-500">
              โครงสร้างหน้าใหม่สำหรับ preset, global content, bubble overrides และ preview แบบ 3x3
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
              <p className="mt-2 text-sm text-slate-500">Promotion / Recommended / Bestseller / RX / Flash Sale</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">2. Global Content Setup</h2>
              <p className="mt-2 text-sm text-slate-500">Title, intro, footer text, CTA และ theme token</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">3. Bubble Editor & Preview</h2>
              <p className="mt-2 text-sm text-slate-500">Selected IDs: {ids.join(', ')}</p>
              <p className="mt-2 text-sm text-slate-500">Phase นี้เป็น page shell ก่อน แล้วจะต่อ bubble override + 3x3 preview ใน task ถัดไป</p>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
