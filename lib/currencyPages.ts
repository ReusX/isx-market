import 'server-only'
import { fxSeries } from '@/lib/fxHistory'
import type { CurrencyCode } from '@/lib/currencies'

/**
 * The currencies that get a page of their own (`/currencies/{code}`), and how
 * each one's dinar history is built.
 *
 * Baghdad prices the dollar; every other currency is derived from it. So a
 * dinar series for the euro is (dinars per dollar, our recorded parallel
 * close) ÷ (euros per dollar, from the ECB via frankfurter.dev). Gulf and
 * Jordanian currencies are pegged to the dollar, so their history is the
 * dollar's divided by a constant — and the page says so. The Iranian rial
 * and Kuwaiti dinar have no free daily history we trust, so they get no chart.
 */
export interface CurrencyPageDef {
  code: CurrencyCode
  slug: string
  /** Units per USD when the currency is pegged; the chart uses the constant. */
  peg: number | null
  /** frankfurter.dev (ECB) publishes a daily USD cross for this currency. */
  ecb: boolean
  /** Quoted in tomans (1 toman = 10 rials) on the street; the page shows both. */
  toman?: boolean
}

export const CURRENCY_PAGES: CurrencyPageDef[] = [
  { code: 'TRY', slug: 'try', peg: null,   ecb: true },
  { code: 'SAR', slug: 'sar', peg: 3.75,   ecb: false },
  { code: 'IRR', slug: 'irr', peg: null,   ecb: false, toman: true },
  { code: 'EUR', slug: 'eur', peg: null,   ecb: true },
  { code: 'AED', slug: 'aed', peg: 3.6725, ecb: false },
  { code: 'KWD', slug: 'kwd', peg: null,   ecb: false },
  { code: 'JOD', slug: 'jod', peg: 0.709,  ecb: false },
  { code: 'GBP', slug: 'gbp', peg: null,   ecb: true },
]

export const currencyPage = (slug: string) => CURRENCY_PAGES.find((c) => c.slug === slug.toLowerCase()) ?? null

export interface CurrencyPoint { date: string; value: number }

const isoDaysAgo = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString().slice(0, 10)

/** Dinars per one unit, daily, for the last `days` days — or [] when the page has no honest history. */
export async function currencyHistory(def: CurrencyPageDef, days = 400): Promise<CurrencyPoint[]> {
  if (!def.peg && !def.ecb) return []
  const from = isoDaysAgo(days)
  const parallel = await fxSeries('parallel', { from })
  const closes = parallel.filter((d) => d.close != null).map((d) => ({ date: d.date, iqd: d.close as number }))
  if (!closes.length) return []

  if (def.peg) return closes.map((d) => ({ date: d.date, value: d.iqd / (def.peg as number) }))

  let cross: Record<string, number> = {}
  try {
    const res = await fetch(
      `https://api.frankfurter.dev/v1/${from}..?base=USD&symbols=${def.code}`,
      { next: { revalidate: 10800 }, signal: AbortSignal.timeout(9000) },
    )
    if (res.ok) {
      const j = (await res.json()) as { rates?: Record<string, Record<string, number>> }
      for (const [date, r] of Object.entries(j.rates ?? {})) if (typeof r[def.code] === 'number') cross[date] = r[def.code]
    }
  } catch { cross = {} }
  const dates = Object.keys(cross).sort()
  if (!dates.length) return []

  /* The ECB publishes on business days; carry the last cross forward over
     weekends and holidays so the dinar series keeps every observed day. */
  const out: CurrencyPoint[] = []
  let i = 0, last: number | null = null
  for (const d of closes) {
    while (i < dates.length && dates[i] <= d.date) { last = cross[dates[i]]; i += 1 }
    if (last) out.push({ date: d.date, value: d.iqd / last })
  }
  return out
}
