import type { Company, CompanyMeta, LiveData, LiveStock } from '@/types'

// ─── Data fetchers ──────────────────────────────────────────────────────────

export async function fetchLive(): Promise<LiveData> {
  const res = await fetch('/data/live.json', { next: { revalidate: 1800 } })
  if (!res.ok) throw new Error('Failed to fetch live data')
  return res.json()
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
    return {
      ...m,
      close:  live?.close  ?? 0,
      open:   live?.open   ?? 0,
      high:   live?.high   ?? 0,
      low:    live?.low    ?? 0,
      change: live?.change ?? 0,
      pct:    live?.pct    ?? 0,
      vol:    live?.vol    ?? 0,
      deals:  live?.deals  ?? 0,
    }
  })
}

// ─── Formatters ─────────────────────────────────────────────────────────────

export function fmtVol(v: number | null | undefined): string {
  if (!v) return '—'
  if (v >= 1e9) return (v / 1e9).toFixed(1) + 'B'
  if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M'
  if (v >= 1e3) return (v / 1e3).toFixed(0) + 'K'
  return v.toString()
}

export function fmtMcap(v: number | null | undefined): string {
  if (!v) return '—'
  if (v >= 1e6) return (v / 1e6).toFixed(1) + 'T'
  if (v >= 1e3) return (v / 1e3).toFixed(1) + 'B'
  return v.toLocaleString('en', { maximumFractionDigits: 0 }) + 'M'
}

export function fmtRsisxVal(v: string | number | null | undefined): string {
  if (v == null) return '—'
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
