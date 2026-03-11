export type ExportTemplateKey = 'promotion' | 'recommend' | 'bestseller' | 'rx' | 'flashsale';

export type ExportThemeKey = 'violet' | 'emerald' | 'rose' | 'amber' | 'sky';

export type ExportGlobalConfig = {
  template: ExportTemplateKey;
  title: string;
  intro: string;
  footerText: string;
  ctaLabel: string;
  theme: ExportThemeKey;
};

export type ExportBubbleConfig = {
  bubbleIndex: number;
  subtitle?: string;
  label?: string;
  note?: string;
  productIds: number[];
};

export type ExportPreviewProduct = {
  productId: number;
  sku: string;
  name: string;
  imageUrl: string | null;
  basePrice: number;
  promotionPrice: number | null;
  stockQuantity: number;
  isRx: boolean;
  isPromotion: boolean;
  isFlashsale: boolean;
  hashtags: string[];
};

export type ExportPreviewBubble = {
  bubbleIndex: number;
  subtitle: string;
  label: string;
  note: string;
  products: ExportPreviewProduct[];
  grid: Array<Array<ExportPreviewProduct | null>>;
};

export type ExportPreviewDocument = {
  config: ExportGlobalConfig;
  bubbles: ExportPreviewBubble[];
};
