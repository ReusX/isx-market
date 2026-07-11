import type { Company, CompanyMeta, LiveData, LiveStock } from '@/types'
import { createClient } from '@/lib/supabase/client'

// ─── Data fetchers ──────────────────────────────────────────────────────────

// Live prices come from OUR OWN pipeline: the ISX official daily report
// workbooks parsed into Supabase `daily_prices` (refreshed by the daily cron
// at /api/cron/daily-prices). We take the latest trading session for current
// prices and the prior session to compute the day-over-day change.
export async function fetchLive(): Promise<LiveData> {
  const sb = createClient()

  // most recent session date
  const { data: latestRow } = await sb
    .from('daily_prices').select('date').order('date', { ascending: false }).limit(1)
  const latest = latestRow?.[0]?.date as string | undefined
  if (!latest) {
    return { updated: '', stocks: [], rsisx: null, breadth: { up: 0, dn: 0, fl: 0 }, sectors: {} }
  }

  // the session immediately before it (for change %)
  const { data: prevRow } = await sb
    .from('daily_prices').select('date').lt('date', latest)
    .order('date', { ascending: false }).limit(1)
  const prev = prevRow?.[0]?.date as string | undefined

  // all rows for both sessions (≈100 companies each, well under the row cap)
  const dates = prev ? [latest, prev] : [latest]
  const { data: rows } = await sb
    .from('daily_prices')
    .select('ticker,date,open,high,low,close,volume,value,trades')
    .in('date', dates)

  const prevClose = new Map<string, number>()
  if (prev) for (const r of rows ?? []) {
    if (r.date === prev && r.close != null) prevClose.set(r.ticker as string, r.close as number)
  }

  const stocks: LiveStock[] = []
  let up = 0, dn = 0, fl = 0
  for (const r of rows ?? []) {
    if (r.date !== latest) continue
    const close = (r.close as number) ?? 0
    const pc = prevClose.get(r.ticker as string)
    const change = pc != null ? close - pc : 0
    const pct = pc ? (change / pc) * 100 : 0
    if (change > 0) up++; else if (change < 0) dn++; else fl++
    stocks.push({
      code: r.ticker as string,
      close,
      open:  (r.open  as number) ?? close,
      high:  (r.high  as number) ?? close,
      low:   (r.low   as number) ?? close,
      change,
      pct,
      vol:   (r.value  as number) ?? 0,
      deals: (r.trades as number) ?? 0,
    })
  }

  // Carry-forward: listed companies that did NOT trade in the latest session
  // still belong on the board at their last known price (shown flat, "no trade
  // today") instead of vanishing. ISX is thin — only ~40-50 of ~124 companies
  // trade on any given day. Source the last close from company_metrics.
  const traded = new Set(stocks.map(s => s.code))
  const { data: metrics } = await sb
    .from('company_metrics').select('ticker,last_close')
  for (const m of metrics ?? []) {
    const code = m.ticker as string
    const lc = m.last_close as number | null
    if (traded.has(code) || lc == null || lc <= 0) continue
    stocks.push({
      code, close: lc, open: lc, high: lc, low: lc,
      change: 0, pct: 0, vol: 0, deals: 0, stale: true,
    })
  }

  return { updated: latest, stocks, rsisx: null, breadth: { up, dn, fl }, sectors: {} }
}

export async function fetchCompanyMeta(): Promise<CompanyMeta[]> {
  const res = await fetch('/data/companies.json', { next: { revalidate: 86400 } })
  if (!res.ok) throw new Error('Failed to fetch company meta')
  return res.json()
}

// ─── Merge ──────────────────────────────────────────────────────────────────

export function mergeCompanies(meta: CompanyMeta[], stocks: LiveStock[]): Company[] {
  const priceMap = new Map(stocks.map(s => [s.code, s]))
  return meta.map(m => {
    const live = priceMap.get(m.sym)
    const close = live?.close ?? 0
    const mcap = (close > 0 && m.shares)
      ? (close * m.shares) / 1_000_000
      : m.mcap
    return {
      ...m,
      mcap,
      close,
      open:   live?.open   ?? 0,
      high:   live?.high   ?? 0,
      low:    live?.low    ?? 0,
      change: live?.change ?? 0,
      pct:    live?.pct    ?? 0,
      vol:    live?.vol    ?? 0,
      deals:  live?.deals  ?? 0,
      stale:  live?.stale  ?? false,
    }
  })
}

// ─── Formatters ─────────────────────────────────────────────────────────────

export function fmtVol(v: number | null | undefined): string {
  if (!v) return '·'
  if (v >= 1e9) return (v / 1e9).toFixed(1) + 'B'
  if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M'
  if (v >= 1e3) return (v / 1e3).toFixed(0) + 'K'
  return v.toString()
}

export function fmtMcap(v: number | null | undefined): string {
  if (!v) return '·'
  if (v >= 1e6) return (v / 1e6).toFixed(1) + 'T'
  if (v >= 1e3) return (v / 1e3).toFixed(1) + 'B'
  return v.toLocaleString('en', { maximumFractionDigits: 0 }) + 'M'
}

export function fmtRsisxVal(v: string | number | null | undefined): string {
  if (v == null) return '·'
  return Number(v).toFixed(2)
}

// ─── Sector metadata ─────────────────────────────────────────────────────────

export const SECTORS = [
  { id: 'all',  ar: 'الكل',    en: 'All' },
  { id: 'BANK', ar: 'بنوك',    en: 'Banking' },
  { id: 'IND',  ar: 'صناعي',   en: 'Industrial' },
  { id: 'SVC',  ar: 'خدمات',   en: 'Services' },
  { id: 'HTL',  ar: 'فنادق',   en: 'Hotels' },
  { id: 'TEL',  ar: 'اتصالات', en: 'Telecom' },
  { id: 'AGR',  ar: 'زراعة',   en: 'Agriculture' },
  { id: 'INS',  ar: 'تأمين',   en: 'Insurance' },
  { id: 'INV',  ar: 'استثمار', en: 'Investment' },
]

export const SORT_OPTIONS = [
  { id: 'default',   ar: 'الكل',    en: 'All' },
  { id: 'gainers',   ar: 'رابحون',  en: 'Gainers' },
  { id: 'losers',    ar: 'خاسرون',  en: 'Losers' },
  { id: 'volume',    ar: 'الحجم',   en: 'Volume' },
  { id: 'watchlist', ar: 'مراقبة',  en: 'Watchlist' },
]

export function filterSort(
  companies: Company[],
  sector: string,
  sort: string,
  watchlist: string[]
): Company[] {
  let data = companies.filter(c => c.close > 0)
  if (sector !== 'all') data = data.filter(c => c.sec === sector)
  if (sort === 'gainers')   return [...data].sort((a, b) => b.pct - a.pct)
  if (sort === 'losers')    return [...data].sort((a, b) => a.pct - b.pct)
  if (sort === 'volume')    return [...data].sort((a, b) => (b.vol ?? 0) - (a.vol ?? 0))
  if (sort === 'watchlist') return data.filter(c => watchlist.includes(c.sym))
  return [...data].sort((a, b) => (b.mcap ?? 0) - (a.mcap ?? 0))
}
