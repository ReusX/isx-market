import type { Company, CompanyMeta, LiveData, LiveStock } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { arDate, enDate } from '@/lib/date'

// ─── Data fetchers ──────────────────────────────────────────────────────────

// Short client-side cache: navigating between market pages (home, /market,
// /charts, /c/[sym], /watchlist) reuses one snapshot instead of re-querying
// Supabase on every mount. Prices refresh once per day, so 60s is plenty fresh.
let _liveCache: { at: number; data: LiveData } | null = null
let _livePromise: Promise<LiveData> | null = null
const LIVE_TTL = 60_000

export async function fetchLive(): Promise<LiveData> {
  if (_liveCache && Date.now() - _liveCache.at < LIVE_TTL) return _liveCache.data
  if (_livePromise) return _livePromise            // de-dupe concurrent mounts
  _livePromise = fetchLiveRaw()
    .then(data => { _liveCache = { at: Date.now(), data }; _livePromise = null; return data })
    .catch(err => { _livePromise = null; throw err })
  return _livePromise
}

// Live prices come from OUR OWN pipeline: the ISX official daily report
// workbooks parsed into Supabase `daily_prices` (refreshed by the daily cron
// at /api/cron/daily-prices). We take the latest trading session for current
// prices and the prior session to compute the day-over-day change.
async function fetchLiveRaw(): Promise<LiveData> {
  const sb = createClient()

  // most recent session date
  const { data: latestRow } = await sb
    .from('daily_prices').select('date').order('date', { ascending: false }).limit(1)
  const latest = latestRow?.[0]?.date as string | undefined
  if (!latest) {
    return { updated: '', stocks: [], rsisx: null, breadth: { up: 0, dn: 0, fl: 0, na: 0 }, sectors: {} }
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
  let up = 0, dn = 0, fl = 0, na = 0
  for (const r of rows ?? []) {
    if (r.date !== latest) continue
    const close = (r.close as number) ?? 0
    const pc = prevClose.get(r.ticker as string)
    /* No prior close means the change is UNKNOWN, not zero. `change` and `pct`
       stay 0 so every surface that types them as `number` keeps working, but
       `noPrior` carries the truth and the company is counted separately.
       Folding these into `fl` said 8 companies were unchanged on 2026-08-13
       when nobody knew whether they were. */
    const noPrior = pc == null
    const change = noPrior ? 0 : close - pc!
    const pct = pc ? (change / pc) * 100 : 0
    if (noPrior) na++
    else if (change > 0) up++
    else if (change < 0) dn++
    else fl++
    stocks.push({
      code: r.ticker as string,
      close,
      open:  (r.open  as number) ?? close,
      high:  (r.high  as number) ?? close,
      low:   (r.low   as number) ?? close,
      change,
      pct,
      noPrior,
      vol:   (r.value  as number) ?? 0,
      shares_traded: (r.volume as number) ?? 0,
      deals: (r.trades as number) ?? 0,
    })
  }

  // Carry-forward: listed companies that did NOT trade in the latest session
  // still belong on the board. ISX is thin — only ~40-50 of ~124 companies
  // trade on any given day. We show each one's LAST ACTUAL trade (real close,
  // volume and change) sourced from daily_prices via the `latest_trade` view
  // (one row per ticker), marked `stale` so it reads as "not today's session".
  const traded = new Set(stocks.map(s => s.code))
  const { data: last } = await sb
    .from('latest_trade').select('ticker,date,close,value,volume,change,pct,trades')
  for (const r of last ?? []) {
    const code = r.ticker as string
    const close = r.close as number | null
    if (traded.has(code) || close == null || close <= 0) continue
    stocks.push({
      code, close, open: close, high: close, low: close,
      change: (r.change as number) ?? 0,
      pct:    (r.pct    as number) ?? 0,
      vol:    (r.value  as number) ?? 0,
      shares_traded: (r.volume as number) ?? 0,
      deals:  (r.trades as number) ?? 0,
      stale:  true,
      lastTrade: r.date as string,
    })
  }

  return { updated: latest, stocks, rsisx: null, breadth: { up, dn, fl, na }, sectors: {} }
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
      noPrior: live?.noPrior ?? false,
      vol:    live?.vol    ?? 0,
      shares_traded: live?.shares_traded ?? 0,
      deals:  live?.deals  ?? 0,
      stale:  live?.stale  ?? false,
      lastTrade: live?.lastTrade,
    }
  })
}

// ─── Formatters ─────────────────────────────────────────────────────────────

/**
 * ═══ THE market-cap definition ═══════════════════════════════════════════
 *
 * One rule, one place: a company's market cap is its LAST PUBLISHED CLOSE
 * multiplied by its ISSUED SHARE COUNT, in whole dinars — and `null` when
 * either input is missing.
 *
 * `null` is the point of it. `companies.json` also carries a static `mcap`
 * field (in millions) that was correct when it was written and has drifted
 * since: measured against this formula on 2026-08-24, **25 of 99 companies
 * differ by more than 5%**, the worst by −33% (IHFI) and +28% (SMRI). A
 * fallback to that number is not a safer answer than no answer — it is a
 * confident wrong one, and it is invisible, because nothing on screen says
 * which of the two a given row used.
 *
 * Callers decide what to do with `null`: rank it last, print `—`, or exclude
 * it. None of them may substitute a different quantity for it.
 *
 * Used by the screener, the heat map, the statistics snapshot and the
 * homepage board, so the same company cannot carry two market caps in one
 * product.
 */
export function companyMarketCap(
  close: number | null | undefined,
  shares: number | null | undefined,
): number | null {
  if (!(close != null && close > 0)) return null
  if (!(shares != null && shares > 0)) return null
  return close * shares
}

/**
 * ⚠ LEGACY display helper, kept for the pre-redesign routes that still call it
 * (`/market`, `/companies`, `/analysis`).
 *
 * It differs from `companyMarketCap` in two ways that matter: it takes the
 * LIVE-session close, which is 0 for any company that did not trade today, and
 * it then falls back to the static `mcap` — so on those rows it silently
 * prints a figure that can be a third off. Migrating those three routes is a
 * behaviour change on frozen surfaces and is reported rather than done here.
 */
export function liveMcap(c: { close: number; shares?: number; mcap?: number }): number {
  return c.shares && c.close > 0 ? c.close * c.shares : (c.mcap || 0) * 1e6
}

/**
 * Display name for a company assembled from the curated meta (companies.json)
 * and the derived company_metrics row. Meta wins: a handful of metrics rows
 * carry junk Arabic names straight from the bulletin parse ("8", "15"), so a
 * candidate also has to actually read as a name rather than a number.
 *
 * ── On locale ─────────────────────────────────────────────────────────────
 * `locale` only reorders the candidate list; it never filters it. An English
 * reader looking at a company that has no English name gets the official
 * Arabic one, with the ticker beside it, because that is the truth. The
 * alternative — an empty cell, or worse a machine-made translation of a legal
 * company name — is the failure mode the brief calls out by name.
 */
export function companyName(
  c: { ar?: string | null; en?: string | null; name_ar?: string | null; name_en?: string | null },
  ticker: string,
  locale: 'ar' | 'en' = 'ar',
): string {
  const order = locale === 'ar'
    ? [c.ar, c.en, c.name_ar, c.name_en]
    : [c.en, c.name_en, c.ar, c.name_ar]
  const named = order.find(v => v && /[A-Za-z؀-ۿ]/.test(v))
  return named?.trim() || ticker
}

/**
 * Arabic normalisation for fuzzy name matching: drop harakat and tatweel, fold
 * the alef/ya/ta-marbuta variants together, and strip spaces.
 */
function normalizeAr(s: string): string {
  return s
    .replace(/[ً-ْـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/[ىئ]/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, '')
}

/** Longest common subsequence length — small strings, so the O(n·m) table is fine. */
function lcsLen(a: string, b: string): number {
  const prev = new Array<number>(b.length + 1).fill(0)
  const cur = new Array<number>(b.length + 1).fill(0)
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1])
    }
    for (let j = 0; j <= b.length; j++) prev[j] = cur[j]
  }
  return prev[b.length]
}

/**
 * Best curated match for a company name that came out of the PDF pipeline.
 *
 * The monthly reports are scanned Arabic, and the parse mangles them in small,
 * consistent ways — "الخاتم لأتصالات" for للاتصالات, "مصرف الاتمان" for
 * الائتمان, "دار السالم للتامين" for السلام للتأمين. Similarity against the
 * curated list recovers the real name; below the threshold we keep what the
 * report said rather than guess.
 */
export function matchCompanyName(
  raw: string,
  meta: { ar?: string | null; en?: string | null }[],
  cover = 0.9,
  locale: 'ar' | 'en' = 'ar',
): string {
  const hit = matchCompanyRecord(raw, meta, cover)
  if (!hit) return raw
  /* The match is made on the Arabic name — the monthly PDF has no ticker
     column — but what is DISPLAYED follows the reader. Falling back to the
     Arabic name when a company has no verified English one is deliberate: a
     legal company name is never machine-translated here. */
  return (locale === 'en' ? hit.en || hit.ar : hit.ar) ?? raw
}

/**
 * The same match, returning the RECORD rather than just its name.
 *
 * `ownership_monthly` and `major_shareholders` carry no ticker column at all —
 * they key on the Arabic company name as the monthly PDF printed it. Anything
 * that needs to put those rows on a company page has to resolve a name to a
 * symbol, and this is the one place that is allowed to: same scoring, same
 * threshold, same ambiguity rule as the display-name match above, so a company
 * page and /statistics can never disagree about which row belongs to whom.
 */
export function matchCompanyRecord<T extends { ar?: string | null }>(
  raw: string,
  meta: T[],
  cover = 0.9,
): T | null {
  const a = normalizeAr(raw)
  if (a.length < 4) return null
  let best: { score: number; rec: T | null } = { score: 0, rec: null }
  let runnerUp = 0
  for (const m of meta) {
    if (!m.ar) continue
    const b = normalizeAr(m.ar)
    // The report often gives a shorter form of the curated name, so score by
    // how much of the shorter string the longer one covers — but keep the two
    // within half a length of each other, or a short name would "match" any
    // longer one that happens to start the same way.
    if (!b || Math.min(a.length, b.length) / Math.max(a.length, b.length) < 0.6) continue
    const score = lcsLen(a, b) / Math.min(a.length, b.length)
    if (score > best.score) { runnerUp = best.score; best = { score, rec: m } }
    else if (score > runnerUp) runnerUp = score
  }
  // Two candidates that fit equally well mean we cannot tell them apart.
  return best.score >= cover && best.score > runnerUp ? best.rec : null
}

export function fmtVol(v: number | null | undefined): string {
  if (!v) return '·'
  if (v >= 1e9) return (v / 1e9).toFixed(1) + 'B'
  if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M'
  if (v >= 1e3) return (v / 1e3).toFixed(0) + 'K'
  return v.toString()
}

/**
 * Tooltip for a carried-forward row. Half the banks on ISX last traded years
 * ago — often a single placement at the 1 IQD par value — so "0.00%" and a
 * session volume would both be lies. Rows say when the price is actually from.
 */
export function lastTradeNote(c: { stale?: boolean; lastTrade?: string }, ar: boolean): string | undefined {
  if (!c.stale) return undefined
  return c.lastTrade
    // ⚠ The English branch used to print the raw ISO string — «Last traded
    // 2026-08-19» beside an Arabic column reading «19 أغسطس 2026». Same date,
    // two formats, one of them not written for a reader.
    ? (ar ? `آخر تداول: ${arDate(c.lastTrade)}` : `Last traded ${enDate(c.lastTrade)}`)
    : (ar ? 'لم يتداول في الجلسة الأخيرة' : 'Did not trade in the latest session')
}

// Suspended-listing rule · defined in lib/listing.ts (which imports nothing, so
// server code can use it without dragging in the browser Supabase client) and
// re-exported here, where every existing caller already looks for it.
export { STALE_DAYS, daysSinceTrade, isSuspended } from '@/lib/listing'

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

// `ar`/`en` are the short chip labels; `arFull`/`enFull` are the full sector
// names used wherever a sector is read as a value (table cells, profiles).
export const SECTORS = [
  { id: 'all',  ar: 'الكل',    en: 'All',         arFull: 'الكل',              enFull: 'All' },
  { id: 'BANK', ar: 'مصارف',   en: 'Banking',     arFull: 'المصارف',           enFull: 'Banking' },
  { id: 'IND',  ar: 'صناعة',   en: 'Industrial',  arFull: 'الصناعة',           enFull: 'Industrial' },
  { id: 'SVC',  ar: 'خدمات',   en: 'Services',    arFull: 'الخدمات',           enFull: 'Services' },
  { id: 'HTL',  ar: 'فنادق',   en: 'Hotels',      arFull: 'الفنادق والسياحة',  enFull: 'Hotels & tourism' },
  { id: 'TEL',  ar: 'اتصالات', en: 'Telecom',     arFull: 'الاتصالات',         enFull: 'Telecom' },
  { id: 'AGR',  ar: 'زراعة',   en: 'Agriculture', arFull: 'الزراعة',           enFull: 'Agriculture' },
  { id: 'INS',  ar: 'تأمين',   en: 'Insurance',   arFull: 'التأمين',           enFull: 'Insurance' },
  { id: 'INV',  ar: 'استثمار', en: 'Investment',  arFull: 'الاستثمار المالي',  enFull: 'Financial investment' },
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
