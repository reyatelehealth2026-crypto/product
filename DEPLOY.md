# CNY Product Selector - Deploy Script

## 🚀 วิธี Deploy ง่ายที่สุด (ไม่ต้องสมัคร)

### วิธีที่ 1: Netlify Drop ⭐ (แนะนำ)
1. เปิด browser ไปที่: https://app.netlify.com/drop
2. ลากโฟลเดอร์ `dist/` ทั้งโฟลเดอร์ไปวางบนหน้าเว็บ
3. รอ 30 วินาที จะได้ URL ฟรีทันที!

### วิธีที่ 2: Surge.sh
```bash
cd my-app/dist
npx surge --domain cny-product-selector.surge.sh
```
*ต้องใส่ email/password ครั้งแรก*

### วิธีที่ 3: GitHub Pages
```bash
# สร้าง repo ใหม่บน GitHub ชื่อ cny-product-selector
# แล้วรัน:
cd my-app/dist
git init
git add .
git commit -m "Deploy"
git push https://github.com/YOUR_USERNAME/cny-product-selector.git main
```

---

## 📁 ไฟล์ที่ต้อง Deploy

โฟลเดอร์: `/root/.openclaw/workspace/cny-product-selector/my-app/dist/`

ไฟล์สำคัญ:
- `index.html` - หน้าหลัก
- `_next/` - Static assets
- `404.html` - Error page

---

## 🌐 URL ที่น่าจะได้

หลัง Deploy จะได้ URL ประมาณ:
- Netlify: `https://random-name-123.netlify.app`
- Surge: `https://cny-product-selector.surge.sh`
- GitHub Pages: `https://yourusername.github.io/cny-product-selector`

---

## ⚠️ หมายเหตุ

Vercel ไม่สามารถใช้ได้ (Account ถูก block เนื่องจาก Fair Use Limits)
แนะนำใช้ **Netlify Drop** แทน ง่ายและเร็วที่สุด!
