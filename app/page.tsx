import ProductSelector from './ProductSelector';
import fs from 'node:fs/promises';
import path from 'node:path';

import type { Product } from '@/types/product';

async function getInitialProducts(): Promise<Product[]> {
  try {
    const filePath = path.join(process.cwd(), 'getDataProductIsGroup.json');
    const fileContent = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(fileContent);
    return Array.isArray(parsed.product) ? parsed.product : [];
  } catch {
    return [];
  }
}

export default async function Home() {
  const initialProducts = await getInitialProducts();

  return (
    <main className="min-h-screen">
      <ProductSelector initialProducts={initialProducts} />
    </main>
  );
}
