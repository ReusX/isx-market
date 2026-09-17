/**
 * The live figures the gold, oil and silver FAQs speak with.
 *
 * One function per page turns the fetched data into the formatted strings
 * the dictionary's `faq(v)` expects, so the visible answers and the
 * FAQPage JSON-LD are built from the same call and cannot disagree. An
 * answer that carries the number is what wins a snippet — a reader asks
 * «كم سعر مثقال الذهب اليوم» and the result that says «724,336 ديناراً» is
 * the one that gets clicked.
 *
 * Missing data renders as «—» rather than dropping the question: the
 * question is still page text, and the dash is honest.
 */
import type { CurrenciesData, GoldData, OilData, SilverData, FxData } from '@/lib/rates'
import { localeDate } from '@/lib/date'

type Locale = 'ar' | 'en'
const MITHQAL_G = 4.608
const n0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const n2 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const f0 = (v: number | null | undefined) => (v == null ? '—' : n0.format(v))
const f2 = (v: number | null | undefined) => (v == null ? '—' : n2.format(v))
const day = (d: string | null | undefined, locale: Locale) => (d ? localeDate(d.replace(/\//g, '-'), locale) : '—')
const marketOf = (fx: FxData | null) => fx?.sell ?? fx?.buy ?? null

export function goldFaqFigures(gold: GoldData | null, locale: Locale) {
  const g = (k: number) => gold?.grams.find((x) => x.karat === k)?.iqd
  return {
    mithqal21: g(21) != null ? f0(g(21)! * MITHQAL_G) : '—',
    gram21: f0(g(21)), gram24: f0(g(24)), gram18: f0(g(18)),
    ounceUsd: f0(gold?.ounceSell?.usd ?? gold?.ounceBuy?.usd),
    date: day(gold?.date, locale),
  }
}

export function oilFaqFigures(oil: OilData | null, fx: FxData | null, locale: Locale) {
  const find = (re: RegExp) => oil?.blends.find((b) => re.test(b.key))
  const heavy = find(/basra.*heavy/i) ?? oil?.blends.find((b) => b.country === 'iraq')
  const medium = find(/basra.*medium/i)
  const brent = find(/^brent/i), wti = find(/^wti/i)
  const market = marketOf(fx)
  return {
    heavy: f2(heavy?.usd), medium: f2(medium?.usd), brent: f2(brent?.usd), wti: f2(wti?.usd),
    heavyIqd: heavy && market ? f0(heavy.usd * market) : '—',
    date: heavy?.stamp ? day(new Date(heavy.stamp * 1000).toISOString().slice(0, 10), locale) : '—',
  }
}

export function silverFaqFigures(silver: SilverData | null, fx: FxData | null, locale: Locale) {
  const market = marketOf(fx)
  const g999 = silver?.grams.find((x) => x.purity === 999)?.usd
  const g925 = silver?.grams.find((x) => x.purity === 925)?.usd
  const iqd = (usd: number | null | undefined) => (usd != null && market ? f0(usd * market) : '—')
  return {
    gram999: f2(g999), gram999Iqd: iqd(g999), gram925Iqd: iqd(g925),
    ounceUsd: f2(silver?.ounceUsd), ounceIqd: iqd(silver?.ounceUsd),
    date: day(silver?.date, locale),
  }
}

/** The FAQPage node for a list of questions. */
export const faqLd = (faq: { q: string; a: string }[]) => ({
  '@type': 'FAQPage',
  mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
})

/** The currencies FAQ: five figures readers ask for by name, in dinars. */
export function currenciesFaqFigures(cur: CurrenciesData | null, fx: FxData | null, locale: Locale) {
  const market = fx?.sell ?? fx?.buy ?? null
  const iqd = (code: keyof CurrenciesData['perUsd']) => {
    const r = cur?.perUsd[code]
    return r && market ? n0.format(market / r) : "—"
  }
  return {
    eur: iqd('EUR'), gbp: iqd('GBP'), try: iqd('TRY'), aed: iqd('AED'), sar: iqd('SAR'), kwd: iqd('KWD'), jod: iqd('JOD'),
    usd: market ? n0.format(market) : "—",
    date: cur?.updatedAt ? localeDate(cur.updatedAt.slice(0, 10), locale) : '—',
  }
}
