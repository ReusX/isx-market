import { cache } from 'react'
import { createClient } from '@supabase/supabase-js'
import companiesData from '@/public/data/companies.json'
import type { CompanyMeta } from '@/types'
import { normalizedValuesTrusted, type Period } from '@/lib/financials'

/**
 * Company results: one filing (a quarter or a year), its headline figures,
 * the same period a year earlier, and the ratios the pipeline derived.
 * Read from the public financial tables; no prose here (lib/resultsText).
 *
 * A results page exists only where the figures are trusted: the tickers in
 * FINANCIAL_DATA_QUALITY with a known unit defect get no page rather than
 * a wrong one.
 */
export type ResultsKey = { sym: string; year: number; period: Period }
export type ResultsIndexRow = ResultsKey & { template: 'industrial' | 'bank'; addedAt: string }
export type Figures = Partial<Record<
  'net_income' | 'pretax_income' | 'revenue' | 'operating_income' | 'financing_income'
  | 'total_assets' | 'total_equity' | 'customer_deposits' | 'islamic_financing' | 'cash' | 'cash_and_cbi' | 'paid_capital', number>>
export type Results = {
  key: ResultsKey
  slug: string
  template: 'industrial' | 'bank'
  ar: string; en: string; sec: string
  now: Figures
  prior: Figures | null
  priorKey: ResultsKey | null
  ratios: Partial<Record<'roe' | 'roa' | 'eps' | 'net_margin' | 'bvps' | 'capital_adequacy_ratio' | 'loan_to_deposit' | 'npl_ratio' | 'net_income_growth_yoy' | 'revenue_growth_yoy' | 'debt_to_equity', number>>
  pdfUrl: string | null
  addedAt: string | null
  unitReported: string | null
  /** The company's other filings, newest first, for the nav. */
  siblings: (ResultsKey & { slug: string })[]
}

const PERIODS: Period[] = ['ANNUAL', 'Q1', 'Q2', 'Q3', 'Q4']
export const resultsSlug = (k: { year: number; period: Period }) => `${k.year}-${k.period.toLowerCase()}`
export function parseResultsSlug(slug: string): { year: number; period: Period } | null {
  const m = /^(\d{4})-(annual|q[1-4])$/.exec(slug)
  if (!m) return null
  const period = m[2].toUpperCase() as Period
  return PERIODS.includes(period) ? { year: +m[1], period } : null
}

function client() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { fetch: (u, i) => fetch(u, { ...i, next: { revalidate: 3600 } }) },
    auth: { persistSession: false },
  })
}
const META = new Map((companiesData as CompanyMeta[]).map((c) => [c.sym, c]))
type ReportRow = { ticker: string; fiscal_year: number; period: string; template: string | null; pdf_url: string | null; source_added_date: string | null; unit_reported: string | null }
type FactRow = { ticker: string; fiscal_year: number; period: string; statement: string; line_key: string; value_iqd: number | null }
type RatioRow = { ratio_key: string; value: number | null }

/** Every filing with trusted figures, newest first. */
export const loadResultsIndex = cache(async (): Promise<ResultsIndexRow[]> => {
  const { data } = await client().from('financial_reports_public')
    .select('ticker,fiscal_year,period,template,source_added_date').order('source_added_date', { ascending: false }).range(0, 999)
  const seen = new Set<string>()
  return ((data ?? []) as ReportRow[]).flatMap((r) => {
    const period = r.period as Period
    const k = `${r.ticker}:${r.fiscal_year}:${period}`
    if (!PERIODS.includes(period) || !META.has(r.ticker) || !normalizedValuesTrusted(r.ticker) || seen.has(k)) return []
    if (r.template !== 'bank' && r.template !== 'industrial') return []
    seen.add(k)
    return [{ sym: r.ticker, year: r.fiscal_year, period, template: r.template, addedAt: r.source_added_date ?? '' }]
  })
})

export const loadResults = cache(async (symRaw: string, slug: string): Promise<Results | null> => {
  const sym = symRaw.toUpperCase()
  const meta = META.get(sym)
  const key = parseResultsSlug(slug)
  if (!meta || !key || !normalizedValuesTrusted(sym)) return null
  const sb = client()
  const [repRes, factRes, ratioRes] = await Promise.all([
    sb.from('financial_reports_public').select('ticker,fiscal_year,period,template,pdf_url,source_added_date,unit_reported').eq('ticker', sym),
    sb.from('financial_facts_public').select('ticker,fiscal_year,period,statement,line_key,value_iqd').eq('ticker', sym).in('fiscal_year', [key.year, key.year - 1]).eq('period', key.period),
    sb.from('financial_ratios_public').select('ratio_key,value').eq('ticker', sym).eq('fiscal_year', key.year).eq('period', key.period),
  ])
  const reports = (repRes.data ?? []) as ReportRow[]
  const report = reports.find((r) => r.fiscal_year === key.year && r.period === key.period)
  if (!report || (report.template !== 'bank' && report.template !== 'industrial')) return null
  const facts = (factRes.data ?? []) as FactRow[]
  const pickFigures = (year: number): Figures => {
    const out: Figures = {}
    for (const f of facts) {
      if (f.fiscal_year !== year || f.value_iqd == null) continue
      const k = f.line_key === 'revenue_and_commissions' ? 'revenue' : f.line_key
      if (k in KEYS) (out as Record<string, number>)[k] = f.value_iqd
    }
    return out
  }
  const now = pickFigures(key.year)
  if (now.net_income == null) return null
  const priorFig = pickFigures(key.year - 1)
  const prior = priorFig.net_income != null ? priorFig : null
  const ratios: Results['ratios'] = {}
  for (const r of (ratioRes.data ?? []) as RatioRow[]) if (r.value != null && r.ratio_key in RKEYS) (ratios as Record<string, number>)[r.ratio_key] = r.value
  const siblings = reports
    .filter((r) => PERIODS.includes(r.period as Period))
    .map((r) => ({ sym, year: r.fiscal_year, period: r.period as Period, slug: resultsSlug({ year: r.fiscal_year, period: r.period as Period }) }))
    .sort((a, b) => (b.year - a.year) || (PERIODS.indexOf(b.period) - PERIODS.indexOf(a.period)))
  return {
    key: { sym, ...key }, slug, template: report.template,
    ar: meta.ar, en: meta.en, sec: meta.sec ?? '',
    now, prior, priorKey: prior ? { sym, year: key.year - 1, period: key.period } : null,
    ratios, pdfUrl: report.pdf_url, addedAt: report.source_added_date, unitReported: report.unit_reported,
    siblings,
  }
})
const KEYS = { net_income: 1, pretax_income: 1, revenue: 1, operating_income: 1, financing_income: 1, total_assets: 1, total_equity: 1, customer_deposits: 1, islamic_financing: 1, cash: 1, cash_and_cbi: 1, paid_capital: 1 }
const RKEYS = { roe: 1, roa: 1, eps: 1, net_margin: 1, bvps: 1, capital_adequacy_ratio: 1, loan_to_deposit: 1, npl_ratio: 1, net_income_growth_yoy: 1, revenue_growth_yoy: 1, debt_to_equity: 1 }
