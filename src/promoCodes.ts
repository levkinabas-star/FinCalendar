export type PromoPeriod = 'monthly' | 'yearly' | 'lifetime' | 'disable';

export interface PromoCode {
  code: string;
  period: PromoPeriod;
  labelRu: string;
  labelEn: string;
}

export const PROMO_CODES: PromoCode[] = [
  { code: 'BESTBETATEST', period: 'monthly',  labelRu: 'Pro на 1 месяц',   labelEn: 'Pro for 1 month' },
  { code: 'BESTGOD',     period: 'yearly',   labelRu: 'Pro на 1 год',     labelEn: 'Pro for 1 year'  },
  { code: 'OHUHUS56',    period: 'lifetime', labelRu: 'Pro навсегда',     labelEn: 'Pro lifetime'    },
  { code: 'KILLME',      period: 'disable',  labelRu: 'Pro отключён',     labelEn: 'Pro disabled'    },
];

export function findPromoCode(input: string): PromoCode | null {
  return PROMO_CODES.find((p) => p.code === input.trim().toUpperCase()) ?? null;
}

export function calcProExpiry(period: PromoPeriod): string | null {
  if (period === 'lifetime') return null;
  const d = new Date();
  if (period === 'monthly') d.setMonth(d.getMonth() + 1);
  if (period === 'yearly')  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString();
}
