import type { ResultsVars as V } from '../ar/results'

/* English mirror; the page is Arabic-only for now. */
type Dir = 'up' | 'down' | 'flat'
type Cmp = { pct: string; dir: Dir } | null
const yoy = (c: Cmp, up: string, down: string, flat: string) => (!c ? '' : c.dir === 'up' ? `${up} ${c.pct}%` : c.dir === 'down' ? `${down} ${c.pct}%` : flat)
const when = (v: V) => (v.isAnnual ? `fiscal year ${v.year}` : `${v.periodLabel} ${v.year}`)

export const results = {
  eyebrow: 'Company results',
  h1: (v: V) => `${v.company} results · ${when(v)}`,
  seoTitle: (v: V) => `${v.company} ${when(v)} results · net ${v.net.startsWith('−') ? 'loss' : 'profit'} ${v.net.replace('−', '')} IQD${v.netYoY ? ` (${v.netYoY.dir === 'up' ? '+' : v.netYoY.dir === 'down' ? '−' : ''}${v.netYoY.pct}%)` : ''}`,
  seoDescription: (v: V) => `${v.company} (${v.sym}), ${when(v)}: net profit ${v.net} IQD${v.netYoY ? ` ${yoy(v.netYoY, 'up', 'down', 'flat')} year on year` : ''}${v.revenue ? `, revenue ${v.revenue}` : ''}${v.assets ? `, total assets ${v.assets}` : ''}${v.roe ? `, ROE ${v.roe}%` : ''}. From the statements filed with the Iraq Securities Commission.`,
  standfirst: 'Written automatically from the financial statements the company filed with the Iraq Securities Commission, after the figures were extracted and their units normalised. Figures as reported; no opinion, no recommendation.',
  headline: (v: V) => v.net.startsWith('−')
    ? `${v.company} reported a net loss of ${v.net.replace('−', '')} IQD for ${when(v)}${v.netYoY ? `, ${yoy(v.netYoY, 'an improvement of', 'a deterioration of', 'in line')} on the same period a year earlier` : ''}.`
    : `${v.company} reported a net profit of ${v.net} IQD for ${when(v)}${v.netYoY ? `, ${yoy(v.netYoY, 'up', 'down', 'unchanged')} on the same period a year earlier` : ''}.`,
  revenue: (v: V) => v.revenue ? `${v.isBank ? 'Net commission and banking income' : 'Revenue'} was ${v.revenue} IQD${v.revenueYoY ? `, ${yoy(v.revenueYoY, 'up', 'down', 'flat')} year on year` : ''}${v.pretax ? `; pre-tax profit ${v.pretax} IQD` : ''}${v.margin ? `. Net margin ${v.margin}%` : ''}.` : '',
  balance: (v: V) => {
    const p: string[] = []
    if (v.assets) p.push(`total assets ${v.assets} IQD${v.assetsYoY ? ` (${yoy(v.assetsYoY, '+', '−', '=').replace(' ', '')} y/y)` : ''}`)
    if (v.equity) p.push(`equity ${v.equity} IQD`)
    if (v.isBank && v.deposits) p.push(`customer deposits ${v.deposits} IQD${v.depositsYoY ? ` (${yoy(v.depositsYoY, '+', '−', '=').replace(' ', '')})` : ''}`)
    if (v.isBank && v.financing) p.push(`financing portfolio ${v.financing} IQD`)
    return p.length ? `Balance sheet: ${p.join(', ')}.` : ''
  },
  ratios: (v: V) => {
    const p: string[] = []
    if (v.roe) p.push(`ROE ${v.roe}%`); if (v.roa) p.push(`ROA ${v.roa}%`); if (v.eps) p.push(`EPS ${v.eps} IQD`)
    if (v.car) p.push(`capital adequacy ${v.car}%`); if (v.ltd) p.push(`loan-to-deposit ${v.ltd}%`); if (v.npl) p.push(`NPL ratio ${v.npl}%`)
    return p.length ? `Derived indicators: ${p.join(', ')}.` : ''
  },
  source: (v: V) => v.filedOn ? `The statements were filed with the Iraq Securities Commission on ${v.filedOn}.` : 'Source: the financial statements filed with the Iraq Securities Commission.',
  sections: { headline: 'The result', income: 'Income', balance: 'Balance sheet', ratios: 'Indicators', table: 'Key figures', filings: 'Other filings' },
  cols: { line: 'Line', now: 'Period', prior: 'Prior period', change: 'Change' },
  lines: { net_income: 'Net profit', pretax_income: 'Pre-tax profit', revenue: 'Revenue', revenue_bank: 'Net commission and banking income', operating_income: 'Operating profit', total_assets: 'Total assets', total_equity: 'Equity', customer_deposits: 'Customer deposits', islamic_financing: 'Financing portfolio', cash: 'Cash', paid_capital: 'Paid-up capital' },
  pdf: 'Original statements (PDF)',
  allFinancials: 'All financial statements',
  companyPage: 'Share page',
  aboutTitle: 'How this page is written',
  aboutBody: 'Figures are extracted from the scanned statements the company files with the Iraq Securities Commission, normalised to dinars, and this page is generated from them. Year-on-year comparisons use the same period of the previous year where available. Companies with a known unit-normalisation defect get no results page. The original statements remain the reference.',
  unitBn: 'bn', unitMn: 'mn', unitK: 'k', unitTn: 'tn',
  kindLabel: 'Results',
  feedHeadline: (v: V) => `${v.company} ${when(v)} results: net profit ${v.net} IQD${v.netYoY ? ` (${v.netYoY.dir === 'up' ? '+' : v.netYoY.dir === 'down' ? '−' : ''}${v.netYoY.pct}%)` : ''}`,
  sourceName: 'IQWealth · from the financial statements',
  yoyNote: 'against the same period of the previous year',
}
