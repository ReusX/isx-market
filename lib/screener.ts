import type { CompanyMeta } from '@/types'

/**
 * فارز الأسهم — the screening data model.
 *
 * Everything here maps to a field that exists. `docs/SCREENER_DATA_MAP.md` is
 * the audit; this file is that audit expressed as types.
 *
 * ── The one rule that shapes every function below ─────────────────────────
 * NULL IS NOT ZERO, and a null never silently satisfies a numeric range.
 * `metricValue` returns `number | null`, and the filter EXCLUDES null: asking
 * for "P/E under 10" asks for companies whose P/E is known and under 10, and
 * the two thirds of the exchange with no published financials does not
 * qualify by virtue of being unmeasured.
 *
 * The converse matters just as much and is enforced by keeping the metrics
 * independent: a company with no P/E is still a full participant in a
 * liquidity question. One missing measure never drops a row from a filter
 * about a different measure.
 */

/** One row of `company_metrics`, exactly as the table defines it. */
export type Metric = {
  ticker: string
  name_en: string | null
  name_ar: string | null
  sector: string
  last_date: string | null
  last_close: number
  prev_close: number | null
  close_1w: number | null
  close_1m: number | null
  close_3m: number | null
  close_yend: number | null
  close_52w: number | null
  high_52w: number | null
  low_52w: number | null
  /** Mean daily traded VALUE across 20 sessions, IQD. */
  avg_value_20d: number | null
  days_since_trade: number | null
  /**
   * Net foreign flow over 30 days, IQD. Positive is net buying.
   *
   * ⚠ NEVER NULL, and 89 of 124 rows are a literal 0 — a computed net, not a
   * gap. 13 of those zeros belong to companies that DO appear in
   * `foreign_flow_company_daily`, so the pipeline writes 0 both for "buys and
   * sells cancelled" and for "no foreign trades in the window". Both are true
   * statements about foreign activity, so 0 renders as 0, never as `—`.
   */
  ff_net_30d: number | null
}

export type ScreenerRow = Metric & {
  /** Display name, Arabic or English by the active language. */
  name: string
  logo?: string
  color?: string
  /** `last_close × issued shares`, IQD. Null where the share count is absent. */
  mcap: number | null
  /** Trailing twelve months, positive only. Null for ~2/3 of the exchange. */
  pe: number | null
  suspended: boolean
}

/** No trade in this many days and the quote stops describing a live market. */
export const STALE_DAYS = 60

/* ── Periods ───────────────────────────────────────────────────────────────
   Which "as-of" close drives the change column. The six the route already
   offers, each backed by its own column in `company_metrics`. */
export const PERIODS = [
  { id: '1d', ar: 'يوم', en: 'Day' },
  { id: '1w', ar: 'أسبوع', en: 'Week' },
  { id: '1m', ar: 'شهر', en: 'Month' },
  { id: '3m', ar: '3 أشهر', en: '3M' },
  { id: 'ytd', ar: 'العام', en: 'YTD' },
  { id: '52w', ar: 'سنة', en: 'Year' },
] as const
export type PeriodId = (typeof PERIODS)[number]['id']

export function periodRef(r: ScreenerRow, p: PeriodId): number | null {
  return ({
    '1d': r.prev_close, '1w': r.close_1w, '1m': r.close_1m,
    '3m': r.close_3m, ytd: r.close_yend, '52w': r.close_52w,
  } as const)[p]
}

/** Null when the reference close is missing — 1 to 8 rows, depending on window. */
export function periodChange(r: ScreenerRow, p: PeriodId): number | null {
  const ref = periodRef(r, p)
  if (ref == null || ref <= 0) return null
  return ((r.last_close - ref) / ref) * 100
}

/** Where the price sits inside its own 52-week band, 0–100. */
export function bandPosition(r: ScreenerRow): number | null {
  if (!r.high_52w || !r.low_52w || r.high_52w <= r.low_52w) return null
  return Math.min(100, Math.max(0, ((r.last_close - r.low_52w) / (r.high_52w - r.low_52w)) * 100))
}

/* ── Metrics ───────────────────────────────────────────────────────────────
   Seven, and every one is a field the page already computes and already
   prints in a column. Nothing here is a new measurement. */
export type MetricId = 'price' | 'change' | 'band' | 'liquidity' | 'mcap' | 'foreign' | 'pe'

export type MetricDef = {
  id: MetricId
  ar: string
  en: string
  group: 'perf' | 'liq' | 'val'
  unitAr?: string
  unitEn?: string
  /**
   * What one typed unit is worth.
   *
   * Nobody should be asked to type 900000000 to mean «900 million» — it is
   * nine keystrokes, it overflows any field narrow enough to sit in a filter
   * row, and one mistyped zero is a filter that silently returns nothing. The
   * money metrics are entered in the magnitude the table already prints them
   * in, and the suffix beside the field says which.
   */
  scale: number
  /** Decimals accepted/displayed in the input. */
  step: number
}

export const METRICS: MetricDef[] = [
  { id: 'price', ar: 'السعر', en: 'Price', group: 'perf', unitAr: 'IQD', unitEn: 'IQD', scale: 1, step: 0.01 },
  { id: 'change', ar: 'التغيّر', en: 'Change', group: 'perf', unitAr: '٪', unitEn: '%', scale: 1, step: 0.1 },
  { id: 'band', ar: 'الموقع من مدى 52 أسبوعاً', en: '52-week position', group: 'perf', unitAr: '٪', unitEn: '%', scale: 1, step: 1 },
  { id: 'liquidity', ar: 'السيولة اليومية', en: 'Daily liquidity', group: 'liq', unitAr: 'مليون IQD', unitEn: 'M IQD', scale: 1e6, step: 0.1 },
  { id: 'mcap', ar: 'القيمة السوقية', en: 'Market cap', group: 'liq', unitAr: 'مليار IQD', unitEn: 'B IQD', scale: 1e9, step: 0.1 },
  { id: 'foreign', ar: 'صافي الأجانب 30 يوماً', en: 'Foreign net 30d', group: 'liq', unitAr: 'مليون IQD', unitEn: 'M IQD', scale: 1e6, step: 0.1 },
  { id: 'pe', ar: 'مكرر الربحية (TTM)', en: 'P/E (TTM)', group: 'val', scale: 1, step: 0.1 },
]

export const GROUPS: { id: MetricDef['group']; ar: string; en: string }[] = [
  { id: 'perf', ar: 'السعر والأداء', en: 'Price & performance' },
  { id: 'liq', ar: 'السيولة والحجم', en: 'Liquidity & size' },
  { id: 'val', ar: 'التقييم', en: 'Valuation' },
]

export const metricDef = (id: MetricId) => METRICS.find((m) => m.id === id)!

/**
 * The value a filter and a sort both read. `null` means UNMEASURED, and every
 * caller must treat it as such rather than substituting 0.
 */
export function metricValue(r: ScreenerRow, id: MetricId, period: PeriodId): number | null {
  switch (id) {
    case 'price': return r.last_close > 0 ? r.last_close : null
    case 'change': return periodChange(r, period)
    case 'band': return bandPosition(r)
    case 'liquidity': return r.avg_value_20d
    case 'mcap': return r.suspended ? null : r.mcap
    // Never null in the source; 0 is a measured net. See the type comment.
    case 'foreign': return r.ff_net_30d ?? null
    case 'pe': return r.pe
  }
}

/* ── Presets ───────────────────────────────────────────────────────────────
   The eight the route already ships. The change from today is that a preset
   WRITES ITS CONDITION into the filter set instead of entering a branch you
   cannot see: pressing «الأقل مكرراً» leaves a visible, editable, combinable
   «مكرر الربحية ≤ 10» rather than a mode. Same eight shortcuts, no longer a
   dead end. */
export type Range = { min: number | null; max: number | null }
export type Ranges = Partial<Record<MetricId, Range>>

export const PRESETS = [
  { id: 'all', ar: 'الكل', en: 'All', hintAr: 'كل الشركات النشطة', hintEn: 'Every active company' },
  { id: 'gainers', ar: 'الرابحون', en: 'Gainers', hintAr: 'ارتفع سعرها خلال الفترة المختارة', hintEn: 'Up over the selected period' },
  { id: 'losers', ar: 'الخاسرون', en: 'Losers', hintAr: 'انخفض سعرها خلال الفترة المختارة', hintEn: 'Down over the selected period' },
  { id: 'liquid', ar: 'الأكثر سيولة', en: 'Most liquid', hintAr: 'الأعلى في متوسط قيمة التداول اليومية', hintEn: 'Highest 20-session average traded value' },
  { id: 'cheap', ar: 'الأقل مكرراً', en: 'Lowest P/E', hintAr: 'أدنى مكرر ربحية (TTM)', hintEn: 'Lowest trailing P/E' },
  { id: 'fbuy', ar: 'شراء أجنبي', en: 'Foreign buying', hintAr: 'صافي شراء أجنبي خلال 30 يوماً', hintEn: 'Net foreign buying over 30 days' },
  { id: 'fsell', ar: 'بيع أجنبي', en: 'Foreign selling', hintAr: 'صافي بيع أجنبي خلال 30 يوماً', hintEn: 'Net foreign selling over 30 days' },
  { id: 'nearhigh', ar: 'قرب القمة', en: 'Near high', hintAr: 'ضمن 5٪ من أعلى سعر في 52 أسبوعاً', hintEn: 'Within 5% of the 52-week high' },
] as const
export type PresetId = (typeof PRESETS)[number]['id']

/** The condition a preset writes. `null` for «الكل», which clears instead. */
export function presetRanges(id: PresetId): Ranges | null {
  switch (id) {
    case 'all': return null
    case 'gainers': return { change: { min: 0.01, max: null } }
    case 'losers': return { change: { min: null, max: -0.01 } }
    case 'liquid': return { liquidity: { min: 5e6, max: null } }
    case 'cheap': return { pe: { min: 0.1, max: 10 } }
    case 'fbuy': return { foreign: { min: 1, max: null } }
    case 'fsell': return { foreign: { min: null, max: -1 } }
    case 'nearhigh': return { band: { min: 95, max: null } }
  }
}

/** The preset the current set exactly matches, or null once it stops matching
 *  any of them. Never «الكل» while filters are cutting the results — a control
 *  that says "no filters" over a filtered list is lying about the page. */
export function activePreset(ranges: Ranges): PresetId | null {
  const keys = Object.keys(ranges) as MetricId[]
  if (keys.length === 0) return 'all'
  if (keys.length !== 1) return null
  const k = keys[0]
  const r = ranges[k]!
  if (k === 'change' && r.min === 0.01 && r.max === null) return 'gainers'
  if (k === 'change' && r.max === -0.01 && r.min === null) return 'losers'
  if (k === 'liquidity' && r.min === 5e6 && r.max === null) return 'liquid'
  if (k === 'pe' && r.min === 0.1 && r.max === 10) return 'cheap'
  if (k === 'foreign' && r.min === 1 && r.max === null) return 'fbuy'
  if (k === 'foreign' && r.max === -1 && r.min === null) return 'fsell'
  if (k === 'band' && r.min === 95 && r.max === null) return 'nearhigh'
  return null
}

/**
 * Does a row satisfy one range?
 *
 * The whole null policy lives in the first two lines: unmeasured is EXCLUDED.
 * An invalid range where min > max is left to return nothing on its own rather
 * than being silently repaired — the reader typed it, and quietly swapping the
 * bounds would answer a question they did not ask. The UI flags it instead.
 */
export function inRange(v: number | null, range: Range): boolean {
  if (v === null || !Number.isFinite(v)) return false
  if (range.min !== null && v < range.min) return false
  if (range.max !== null && v > range.max) return false
  return true
}

export const rangeIsSet = (r: Range | undefined): r is Range =>
  Boolean(r) && (r!.min !== null || r!.max !== null)

export const rangeInvalid = (r: Range | undefined): boolean =>
  Boolean(r && r.min !== null && r.max !== null && r.min > r.max)

/** Sector keys as `company_metrics` writes them, with their Arabic labels. */
export const SECTOR_LABELS: Record<string, { ar: string; en: string }> = {
  Banks: { ar: 'المصارف', en: 'Banks' },
  Telecom: { ar: 'الاتصالات', en: 'Telecom' },
  Industry: { ar: 'الصناعة', en: 'Industry' },
  Tourism: { ar: 'الفنادق والسياحة', en: 'Hotels & tourism' },
  Insurance: { ar: 'التأمين', en: 'Insurance' },
  Agriculture: { ar: 'الزراعة', en: 'Agriculture' },
  Investment: { ar: 'الاستثمار المالي', en: 'Investment' },
  Services: { ar: 'الخدمات', en: 'Services' },
  'Money Transfer': { ar: 'التحويل المالي', en: 'Money transfer' },
  Other: { ar: 'أخرى', en: 'Other' },
}

export function sectorLabel(key: string, ar: boolean): string {
  const s = SECTOR_LABELS[key]
  return s ? (ar ? s.ar : s.en) : key
}

/** Merge a metrics row with its identity, and derive market cap and suspension. */
export function toRow(m: Metric, meta: CompanyMeta | undefined, ar: boolean): ScreenerRow {
  const name = (ar ? m.name_ar || meta?.ar || m.name_en || meta?.en : m.name_en || meta?.en || m.name_ar || meta?.ar) || m.ticker
  /* Market cap must agree with the price shown beside it, so it is
     `last_close × shares` rather than the static figure in companies.json.
     The 20 tickers with no identity row have no share count and therefore no
     market cap — null, not a guess. */
  const mcap = m.last_close > 0 && meta?.shares ? m.last_close * meta.shares : null
  return {
    ...m,
    name,
    logo: meta?.logo,
    color: meta?.color,
    mcap,
    pe: null,
    suspended: (m.days_since_trade ?? 0) > STALE_DAYS,
  }
}
