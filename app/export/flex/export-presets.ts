import type { ExportGlobalConfig, ExportTemplateKey } from './export-types';

export const EXPORT_PRESETS: Record<ExportTemplateKey, ExportGlobalConfig> = {
  promotion: {
    template: 'promotion',
    title: 'โปรโมชันขายดีประจำวันนี้',
    intro: 'รวมสินค้าราคาพิเศษ คัดมาให้พร้อมโปรเด่น ส่งต่อได้ทันที',
    footerText: 'สนใจตัวไหน แจ้งรหัสหรือแคปหน้าจอส่งกลับมาได้เลย',
    ctaLabel: 'ดูสินค้าเพิ่มเติม',
    theme: 'rose',
  },
  recommend: {
    template: 'recommend',
    title: 'สินค้าแนะนำสำหรับร้านยา',
    intro: 'คัดสินค้าที่น่าสนใจและเหมาะกับการเติมสต็อกช่วงนี้',
    footerText: 'หากต้องการให้จัดชุดเพิ่ม แจ้งหมวดสินค้าที่สนใจได้เลย',
    ctaLabel: 'ดูรายการแนะนำ',
    theme: 'violet',
  },
  bestseller: {
    template: 'bestseller',
    title: 'สินค้าขายดี',
    intro: 'รวมสินค้ายอดนิยมที่ลูกค้าสั่งต่อเนื่อง ใช้งานง่าย ส่งออกไว',
    footerText: 'สอบถามราคาและจำนวนสั่งซื้อเพิ่มเติมได้ทันที',
    ctaLabel: 'ดูสินค้าขายดี',
    theme: 'amber',
  },
  rx: {
    template: 'rx',
    title: 'กลุ่มสินค้า RX',
    intro: 'คัดสินค้ากลุ่ม RX สำหรับงานจัดรายการและคัดเลือกสินค้าตามหมวด',
    footerText: 'กรุณาตรวจสอบเงื่อนไขการสั่งซื้อก่อนยืนยันรายการ',
    ctaLabel: 'ดูสินค้า RX',
    theme: 'sky',
  },
  flashsale: {
    template: 'flashsale',
    title: 'Flash Sale มาแล้ว',
    intro: 'รวมสินค้าราคาเด็ดช่วงเวลาจำกัด พร้อมส่งต่อเป็น Flex ได้ทันที',
    footerText: 'โปรมีเวลาจำกัด กรุณารีบยืนยันรายการหากสนใจ',
    ctaLabel: 'ดู Flash Sale',
    theme: 'emerald',
  },
};
