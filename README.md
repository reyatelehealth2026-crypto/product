# CNY Pharmacy Product Selector

ระบบเลือกสินค้าสำหรับสร้าง LINE Flex Message - Standalone Project

## 🚀 Features

- **Flash Sale Style UI** - ดีไซน์ตามตัวอย่าง CNY Pharmacy
- **Filter สินค้า** - ทั้งหมด | Flash Sale | โปรโมชั่น | สินค้าใหม่ | ขายดี
- **เลือกสินค้าง่าย** - คลิกที่ Card ได้เลย
- **แสดง Progress Bar** - แสดงเปอร์เซ็นต์ที่ขายไปแล้ว (Flash Sale style)
- **สร้าง Flex Message** - Copy หรือดาวน์โหลด JSON ได้ทันที
- **ไม่ต้องเชื่อมระบบหลัก** - ใช้งาน独立ได้เลย

## 📦 Installation

```bash
npm install
```

## 🚀 Development

```bash
npm run dev
```

เปิดที่ http://localhost:3000

## 📦 Build

```bash
npm run build
```

ไฟล์ build จะอยู่ในโฟลเดอร์ `dist/`

## 📖 Usage

1. แก้ไขไฟล์ `app/page.tsx` ใส่ข้อมูลสินค้าของคุณใน `SAMPLE_PRODUCTS`
2. หรือแก้ไขให้รับข้อมูลจาก API/JSON file
3. รัน `npm run dev` เพื่อทดสอบ
4. Build ด้วย `npm run build` เพื่อ deploy

## 📁 Project Structure

```
my-app/
├── app/
│   ├── ProductSelector.tsx    # Main component
│   ├── page.tsx               # Main page with sample data
│   ├── layout.tsx             # Root layout
│   └── globals.css            # Global styles
├── components/ui/             # shadcn/ui components
├── types/
│   └── product.ts             # TypeScript types
├── lib/
│   └── utils.ts               # Utility functions
└── next.config.ts             # Next.js config
```

## 🎨 JSON Data Format

```typescript
interface Product {
  product_data: [{
    id: number;
    sku: string;
    barcode: string;
    name: string;
    name_en: string;
    spec_name: string;
    is_recommend: number;    // 1 = สินค้าแนะนำ/ใหม่
    is_promotion: number;    // 1 = ลดราคา
    is_bestseller: number;   // 1 = ขายดี
    is_rx: number;           // 1 = ยาตามใบสั่ง
  }];
  product_photo: [{ photo_path: string }];
  product_unit: [{ id: number; unit: string; unit_num: string; contain: string }];
  product_price: [{
    product_price: [{
      price: string;
      promotion_price: string;  // 0.00 = ไม่ลด
    }]
  }];
  product_stock: [{ productLotId: number; stock_num: string }];
  customer_buyed: number;
  product_is_flashSale: number;  // 1 = Flash Sale
  product_is_recommend: number;
}
```

## 🔧 Technologies

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- shadcn/ui
- Lucide Icons

## 📝 License

Internal use for CNY Pharmacy
