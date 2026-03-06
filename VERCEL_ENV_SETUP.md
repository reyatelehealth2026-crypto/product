# Vercel Environment Variables Setup

## วิธีตั้งค่า DATABASE_URL

### วิธีที่ 1: Vercel Dashboard (แนะนำ)
1. ไปที่ https://vercel.com/dashboard
2. เลือก project **"product"**
3. ไปที่ **Settings** → **Environment Variables**
4. เพิ่มตัวแปร:
   - **Name:** `DATABASE_URL`
   - **Value:** `mysql://zrismpsz_item:zrismpsz_item@118.27.146.16:3306/zrismpsz_item`
   - **Environment:** Production, Preview, Development
5. กด **Save**
6. ไปที่ **Deployments** → กด **Redeploy** ใหม่

### วิธีที่ 2: Vercel CLI
```bash
# ติดตั้ง Vercel CLI ถ้ายังไม่มี
npm i -g vercel

# Login
vercel login

# Add environment variable
vercel env add DATABASE_URL production
# แล้วพิมพ์: mysql://zrismpsz_item:zrismpsz_item@118.27.146.16:3306/zrismpsz_item

# หรือใช้คำสั่งนี้เพื่อข้าม interactive
echo "mysql://zrismpsz_item:zrismpsz_item@118.27.146.16:3306/zrismpsz_item" | vercel env add DATABASE_URL production

# Redeploy
vercel --prod
```

### วิธีที่ 3: vercel.json (ไม่แนะนำสำหรับ secrets)
```json
{
  "env": {
    "DATABASE_URL": "mysql://zrismpsz_item:zrismpsz_item@118.27.146.16:3306/zrismpsz_item"
  }
}
```

## หลังตั้งค่าเสร็จ
ตรวจสอบว่าทำงานได้โดย:
1. รอ redeploy เสร็จ
2. ไปที่ `https://your-domain.com/api/sync` (GET)
3. ควรได้ผลลัพธ์ JSON แทน error
