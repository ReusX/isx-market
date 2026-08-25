import type { statistics as ar } from '../ar/statistics'

/**
 * The English statistics route.
 *
 * `Market Cap`, not `Structure` — the panel is about capitalisation and the
 * brief is explicit that a vague label like `Overview` or `Structure` may not
 * stand in for the metric a panel actually shows. `Foreign Investors` rather
 * than `Foreign flow` on the tab, matching the brief's naming table, while the
 * panel heading inside stays `Foreign Flow` because that is the measure.
 *
 * Every exclusion sentence is translated in full. They are the reason the
 * numbers can be trusted, and shortening them is how a reader concludes a
 * missing value was a zero.
 */
export const statistics: typeof ar = {
  title: 'Market Statistics',
  standfirst: (from: string, to: string) =>
    `The size, activity, concentration and valuation of the market — the stored series from ${from} to ${to}.`,

  scopePeriod: (from: string, to: string, sessions: string) =>
    `Figures in this section follow the selected period · ${from} — ${to} · ${sessions} sessions`,
  scopeOwn: (from: string, to: string) =>
    `This section has its own window — it does not follow the selected period${from ? ` · ${from} — ${to}` : ''}`,
  scopeMonth: (month: string) => `A single month — does not follow the selected period · ${month}`,
  scopeSnapshot: (close: string) => `Current snapshot — does not follow the selected period · last close ${close}`,

  railLabel: 'Period summary',
  railLoading: 'Loading the series…',
  railEmpty:   'No sessions in this period.',
  railValue:   'Trading value · selected period',
  iqd: 'IQD',
  vsPrior: 'vs the prior period',
  noPrior: 'No prior period of equal length',
  sessionAverage: 'Session Average',
  sessionMedian:  'Session Median',
  meanTraded:     'Mean traded companies',
  sessions:       'Sessions',

  tabsLabel: 'Statistics sections',
  periodLabel: 'Period',

  loadFailedTitle: 'Couldn’t load the statistics data',
  loadFailedNote:  'We couldn’t reach the stored series.',
  retry: 'Try again',

  activity: 'Activity',
  activityTitle: 'Market Activity',
  metricLabel: 'Measure',
  periodTotal: 'Period Total',
  tradedCompanies: 'Traded Companies',
  coverage: 'Coverage',
  ofListed:   (n: string) => `of ${n}`,
  ofSessions: (n: string) => `of ${n} sessions`,
  perSessionNote: (gapNote: string) =>
    `The average is per TRADING session, not per calendar day — the market runs five days in seven, and dividing by calendar days understates every average by about 29%.${gapNote}`,
  perSessionGap: (n: string) => ` · ${n} sessions have no reading for this measure, and appear as gaps in the chart rather than zeros.`,

  structure: 'Market Cap',
  structureTitle: 'Market Capitalisation',
  noCapData: 'No market-cap data available',
  topTenOf: (total: string) => `The ten largest companies, of ${total} IQD in total`,
  concentration: 'Concentration',
  concentrationNote: 'Where the market’s value sits — a different question from where its activity sits.',
  largestCompany: 'Largest company',
  top5: 'Top 5 · of market cap',
  top10: 'Top 10 · of market cap',
  capFormula: (included: string, universe: string, official: string, excluded: string) =>
    `Market cap = last published close × issued shares · ${included} of ${universe} companies in the current register`
    + (official ? ` (official count ${official})` : '')
    + (excluded ? ` · ${excluded} excluded for having no share count` : '') + '.',
  staleNote: (n: string, share: string) =>
    `${n} companies are priced from a close more than 60 days old — a real published close, not a current quote — and account for ${share} of the total.`,
  notIndexWeight: ' A share of market cap is NOT an ISX60 index weight — the index weights are unpublished and this product does not store them.',

  sectors: 'Sectors',
  sectorMetric: 'Sector measure',
  noSectorActivity: 'No sector activity available',
  noSectorActivityNote: 'The monthly sector table couldn’t be loaded. Market cap is still available.',
  noSectorData: 'No sector data available',
  sectorsLabel: 'Sector statistics',
  sectorSnapshot: (n: string, total: string) => `${n} sectors · market-cap snapshot · ${total} IQD in total`,
  sectorMonth: (month: string, n: string, total: string) => `${month} · ${n} sectors · ${total} in total`,
  close: 'Close',
  marketCap: 'Market Cap',
  capShare: 'Share of market cap',
  companies: 'Companies',
  tradedValueMonth: 'Trading value · month',
  volume: 'Volume',
  trades: 'Trades',
  tradedCos: 'Companies traded',
  listedCos: 'Companies listed',
  mixedScopeNote: 'Market cap is a current snapshot from the company register; the activity figures cover one calendar month. The two do not span the same window.',
  pickSector: 'Pick a sector to see its detail.',
  sectorSourceNote:
    'A sector’s market cap is summed from the company register (last close × issued shares) rather than from the monthly column, because that column double-counts companies across historical name rows. The listed-company count is absent from the monthly source and shows as —.',
  reconNote: (raw: string, dropped: string) =>
    `Of ${raw} source rows, ${dropped} duplicate rows with no activity were dropped and historical names were merged — with no activity lost.`,

  companiesTab: 'Companies',
  noCompanyData: 'No company data available',
  rankingLabel: 'Company ranking',
  rankingTitle: 'Company Ranking',
  rankedOf: (n: string, total: string) => `${n} of ${total} companies have a value for this measure`,
  excludedNotZero: 'Companies with no value for this measure are excluded from the ranking, never counted as zero.',
  rankingMeasure: 'Ranking measure',
  company: 'Company',
  share: 'Share',
  oldClose: 'stale close',
  showFirst12: 'Show the first 12 only',
  showAllN: (n: string) => `Show all ${n}`,
  rankedBy: (unit: string) => `Companies ranked by ${unit}`,
  showAll: 'Show all',
  lastClose: 'Last Close',
  pe: 'P/E',

  valuation: 'Valuation',
  noPe: 'No P/E ratios available',
  noPeNote: 'They are computed from published financial statements, which are not available for this session.',
  peTitle: 'Price / Earnings',
  peCoverage: (n: string, universe: string, pct: string) => `${n} of ${universe} companies · ${pct} coverage`,
  peExcluded: 'The ratio is computed only for companies with positive earnings; loss-making companies and those with no published earnings are excluded, never counted as zero.',
  median: 'Median',
  mean: 'Mean',
  lowest: 'Lowest',
  highest: 'Highest',
  medianFirst: 'The median leads: a handful of high multiples drag the mean to a level no company actually trades at. The gap between the two figures is the skew of the distribution itself, not an error in it.',
  extremePe: ' The highest figure belongs to a company whose stored earnings are close to zero, so the ratio comes out in the millions. It is genuinely the quotient, not a display fault — which is exactly why the median leads and the mean does not.',
  distribution: 'Distribution',
  binsNote: (n: string) => `Discrete bins, not a curve: with ${n} observations, any smoothing would draw a shape the data does not have.`,
  dividendYield: 'Dividend yield',
  unavailable: 'unavailable',
  why: 'why?',
  dividendWhy: 'Dividend yield exists in the product as a ratio key inside financial_ratios, but the financial-statement extraction has not been run for most companies, so coverage is close to zero. Showing it now would imply a completeness that does not exist.',
  under5: 'under 5',
  over40: 'over 40',

  foreign: 'Foreign Investors',
  noForeign: 'No foreign-flow data available',
  details: 'Details',
  foreignTitle: 'Foreign Flow',
  foreignWindow: (from: string, to: string, sessions: string) =>
    `This section’s window · ${from} — ${to} · ${sessions} sessions`,
  fullPage: 'Full page',
  cumulativeNet: 'Cumulative net',
  buyMonths: (up: string, total: string) => `${up} of ${total} months with net buying`,
  totalBuying: 'Total buying',
  totalSelling: 'Total selling',
  months: 'Months',
  monthlyNet: 'Monthly net flow',
  foreignFoot: (counted: string, missing: string) =>
    `Monthly, aggregated from the same series the full foreign-flow page uses, so the two figures cannot disagree · ${counted} sessions with an actual reading`
    + (missing ? `, and ${missing} sessions with no data that were not counted` : '') + '. The company and sector breakdown is on the ',

  chartCanvasLabel: (n: string, max: string) => `${n} periods · maximum ${max}`,
  chartSessions: 'sessions',
  chartPerSession: 'per session',
  chartUnmeasured: 'unmeasured',
  chartHint: 'Hover or tap a column for the exact value',
  copyImage: 'Copy Image',
  downloadPng: 'Download PNG',
  copied: 'Image copied',
  downloaded: 'Downloaded',
  copyFailed: 'Copy failed · use download',
}
