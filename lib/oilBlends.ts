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

export type BlendDef = { key: string; ar: string; region: Region; flag: string }

export const BLEND_DEFS: BlendDef[] = [
  { key: 'Basrah-Heavy', ar: 'البصرة الثقيل', region: 'iraq', flag: '🇮🇶' },
  { key: 'Basrah-Medium', ar: 'البصرة المتوسط', region: 'iraq', flag: '🇮🇶' },
  { key: 'Brent-Crude', ar: 'خام برنت', region: 'benchmark', flag: '🇬🇧' },
  { key: 'WTI-Crude', ar: 'غرب تكساس WTI', region: 'benchmark', flag: '🇺🇸' },
  { key: 'Opec-Basket', ar: 'سلة أوبك', region: 'benchmark', flag: '🛢️' },
  { key: 'Dubai', ar: 'دبي/عُمان', region: 'benchmark', flag: '🇦🇪' },
  { key: 'Murban-Crude', ar: 'مربان', region: 'benchmark', flag: '🇦🇪' },
  { key: 'Arab-Light', ar: 'العربي الخفيف', region: 'regional', flag: '🇸🇦' },
  { key: 'Kuwait-Export-Blend', ar: 'مزيج الكويت', region: 'regional', flag: '🇰🇼' },
  { key: 'Iran-Heavy', ar: 'إيران الثقيل', region: 'regional', flag: '🇮🇷' },
  { key: 'Iran-Light', ar: 'إيران الخفيف', region: 'regional', flag: '🇮🇷' },
]

export const REGION_LABEL: Record<Region, string> = {
  iraq: 'الخام العراقي',
  benchmark: 'المؤشرات العالمية',
  regional: 'خامات أوبك والمنطقة',
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
