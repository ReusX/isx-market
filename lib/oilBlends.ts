/**
 * The curated blend list for /oil.
 *
 * `fetchOil` keeps every row oilprice.com publishes; this decides which ones
 * the page shows, in what order, and under which Arabic name. Nothing here
 * invents a blend — every key below is a real slug on the source, and a blend
 * that is missing from a given scrape simply does not render.
 *
 * Iraq leads because `Basrah-Heavy` and `Basrah-Medium` are genuinely
 * published rows, not because the product is Iraq-focused. They are price
 * ASSESSMENTS, not official selling prices, and the page says so.
 */

export type Region = 'iraq' | 'benchmark' | 'regional'

export type BlendDef = { key: string; ar: string; en: string; region: Region; flag: string }

export const BLEND_DEFS: BlendDef[] = [
  { key: 'Basrah-Heavy', ar: 'البصرة الثقيل', en: 'Basrah Heavy', region: 'iraq', flag: '🇮🇶' },
  { key: 'Basrah-Medium', ar: 'البصرة المتوسط', en: 'Basrah Medium', region: 'iraq', flag: '🇮🇶' },
  { key: 'Brent-Crude', ar: 'خام برنت', en: 'Brent Crude', region: 'benchmark', flag: '🇬🇧' },
  { key: 'WTI-Crude', ar: 'غرب تكساس WTI', en: 'WTI Crude', region: 'benchmark', flag: '🇺🇸' },
  { key: 'Opec-Basket', ar: 'سلة أوبك', en: 'OPEC Basket', region: 'benchmark', flag: '🛢️' },
  { key: 'Dubai', ar: 'دبي/عُمان', en: 'Dubai / Oman', region: 'benchmark', flag: '🇦🇪' },
  { key: 'Murban-Crude', ar: 'مربان', en: 'Murban', region: 'benchmark', flag: '🇦🇪' },
  { key: 'Arab-Light', ar: 'العربي الخفيف', en: 'Arab Light', region: 'regional', flag: '🇸🇦' },
  { key: 'Kuwait-Export-Blend', ar: 'مزيج الكويت', en: 'Kuwait Export Blend', region: 'regional', flag: '🇰🇼' },
  { key: 'Iran-Heavy', ar: 'إيران الثقيل', en: 'Iran Heavy', region: 'regional', flag: '🇮🇷' },
  { key: 'Iran-Light', ar: 'إيران الخفيف', en: 'Iran Light', region: 'regional', flag: '🇮🇷' },
]

export const REGION_LABEL: Record<Region, { ar: string; en: string }> = {
  iraq:      { ar: 'الخام العراقي',        en: 'Iraqi crude' },
  benchmark: { ar: 'المؤشرات العالمية',    en: 'Global benchmarks' },
  regional:  { ar: 'خامات أوبك والمنطقة',  en: 'OPEC and regional grades' },
}

export const HERO_KEY = 'Basrah-Heavy'
export const REFERENCE_KEY = 'Brent-Crude'

/** Basrah minus Brent. Both real, same unit, same page, same moment. */
export function differential(a: { usd: number }, b: { usd: number }) {
  const abs = a.usd - b.usd
  return { abs, pct: (abs / b.usd) * 100 }
}

/** Dollars per barrel × dinars per dollar. Null in, null out. */
export const iqdPerBarrel = (usd: number, rate: number | null) =>
  rate == null ? null : usd * rate
