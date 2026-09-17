import type { Messages } from '@/lib/i18n'
import type { Locale } from '@/lib/i18n/locale'
import { localeDate } from '@/lib/date'
import { periodLabel } from '@/lib/news'
import type { Results } from '@/lib/resultsServer'
import type { ResultsVars } from '@/lib/i18n/messages/ar/results'

const n1 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 })
const n0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const n2 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })
type Dir = 'up' | 'down' | 'flat'

/** Dinar amounts in words-ready form: «12.3 مليار», «−450 مليون». */
export function money(v: number, r: Messages['results']): string {
  const a = Math.abs(v), s = v < 0 ? '−' : ''
  if (a >= 1e12) return `${s}${n2.format(a / 1e12)} ${r.unitTn}`
  if (a >= 1e9) return `${s}${n1.format(a / 1e9)} ${r.unitBn}`
  if (a >= 1e6) return `${s}${n1.format(a / 1e6)} ${r.unitMn}`
  if (a >= 1e3) return `${s}${n0.format(a / 1e3)} ${r.unitK}`
  return `${s}${n0.format(a)}`
}
export function cmp(now?: number, prior?: number): { pct: string; dir: Dir } | null {
  if (now == null || prior == null || !prior) return null
  /* A swing across zero has no meaningful percentage; say only the direction. */
  if ((now < 0) !== (prior < 0)) return { pct: '', dir: now > prior ? 'up' : 'down' }
  const p = ((now - prior) / Math.abs(prior)) * 100
  return { pct: n1.format(Math.abs(p)), dir: p > 0.05 ? 'up' : p < -0.05 ? 'down' : 'flat' }
}
const pct = (v?: number) => (v == null ? null : n1.format(Math.abs(v) <= 1.5 && Math.abs(v) > 0 ? v * 100 : v))

export function resultsVars(x: Results, t: Messages, locale: Locale): ResultsVars {
  const r = t.results
  const full = locale === 'ar' ? x.ar : x.en
  const words = full.split(/\s+/)
  const company = words.length > 6 ? words.slice(0, 4).join(' ') : full
  const isBank = x.template === 'bank'
  const f = x.now, p = x.prior ?? {}
  const m = (v?: number) => (v == null ? null : money(v, r))
  return {
    company, sym: x.key.sym, periodLabel: periodLabel(x.key.period, locale), year: String(x.key.year), isAnnual: x.key.period === 'ANNUAL', isBank,
    net: money(f.net_income as number, r), netDir: (f.net_income as number) > 0 ? 'up' : (f.net_income as number) < 0 ? 'down' : 'flat', netYoY: cmp(f.net_income, p.net_income),
    revenue: m(f.revenue), revenueYoY: cmp(f.revenue, p.revenue),
    pretax: m(f.pretax_income),
    assets: m(f.total_assets), assetsYoY: cmp(f.total_assets, p.total_assets),
    equity: m(f.total_equity),
    deposits: m(f.customer_deposits), depositsYoY: cmp(f.customer_deposits, p.customer_deposits),
    financing: m(f.islamic_financing),
    roe: pct(x.ratios.roe), roa: pct(x.ratios.roa), eps: x.ratios.eps != null ? n2.format(x.ratios.eps) : null,
    margin: pct(x.ratios.net_margin), car: pct(x.ratios.capital_adequacy_ratio), ltd: pct(x.ratios.loan_to_deposit), npl: pct(x.ratios.npl_ratio),
    filedOn: x.addedAt ? localeDate(x.addedAt.slice(0, 10), locale) : null,
    seed: `${x.key.sym}${x.key.year}${x.key.period}`,
  }
}
