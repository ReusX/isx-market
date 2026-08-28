import type { flow as ar } from '../ar/flow'

/**
 * English counterpart. Same discipline as the Arabic module: the main reading
 * path is labels and numbers, and every caveat lives in a `*Points`
 * disclosure or a `*Help` tooltip. This is not a translation of the Arabic
 * phrasing — it is the same meaning written the way an English financial
 * product writes it.
 */
export const flow: typeof ar = {
  /* ── Page frame ──────────────────────────────────────────────────────── */
  title: 'Foreign Investor Flow',
  standfirst: 'Buying and selling by non-Iraqi investors',
  breadcrumb: 'Market Statistics',
  periodGroup: 'Period',
  heroLabel: 'Flow summary',

  loadFailed: 'Couldn’t load the foreign-flow data',
  failedNote: 'The figures arrive with the daily trading bulletin. Try reloading,',
  backTo: 'or go back to',
  statistics: 'Market Statistics',

  /* ── Hero · session ──────────────────────────────────────────────────── */
  lastSessionChip: 'Last observed session',
  iqd: 'IQD',
  netBuy: 'Net foreign buying',
  netSell: 'Net foreign selling',
  balanced: 'Balanced flow',
  foreignTrades: 'Trades',
  companiesActive: 'Active companies',

  /* ── Hero · period ───────────────────────────────────────────────────── */
  periodChip: (label: string) => `Period · ${label}`,
  periodOnly: 'Selected period',
  buying: 'Buying',
  selling: 'Selling',
  buyContinuity: 'Buying continuity',
  buySessionsHelp: 'Buying sessions divided by observed sessions',
  buySessionsHelpLong: 'Sessions whose net flow was positive, divided by the sessions where flow was actually observed — not by every session in the period.',
  sellSessions: 'Selling sessions',
  grossActivity: 'Gross activity',
  grossHelp: 'Total foreign buying plus selling over the period',
  grossHelpLong: 'Buying plus selling, not the net. Large activity with a small net means foreign investors trading with each other.',
  missingSessions: 'No data',
  missingHelp: 'Sessions with no published foreign figures. Excluded from every ratio on this page, and never counted as zero.',

  measuredZero: 'Observed zero — not missing data.',
  sellBar: (v: string, pct: string) => `Selling ${v} dinars, ${pct} percent`,
  buyBar: (v: string, pct: string) => `Buying ${v} dinars, ${pct} percent`,

  /* ── Chart ───────────────────────────────────────────────────────────── */
  netByPeriod: 'Net flow',
  cumulativeBalance: 'Cumulative balance',
  netEach: 'Per period',
  cumulative: 'Cumulative',
  viewGroup: 'View type',
  hintNet: 'Hover or tap a column for its detail',
  hintCum: 'Hover or tap a point to read the balance',
  copyImage: 'Copy image',
  downloadPng: 'Download PNG',
  copied: 'Image copied',
  downloaded: 'Downloaded',
  copyFailed: 'Copy failed · use download',
  chartNetLabel: (n: string) => `Net foreign flow across ${n} periods`,
  chartCumLabel: (n: string) => `Cumulative foreign-flow balance across ${n} periods`,
  chartSource: (from: string, to: string) => `Source: daily trading bulletin · ${from} — ${to}`,
  howChart: 'How to read this chart',
  chartNetPoints: [
    'Each column is that period’s net alone — columns are never joined by a line.',
    'The zero line separates net buying from net selling.',
    'Unobserved sessions are left blank, never drawn as zero.',
  ],
  chartCumPoints: [
    'The line is net flow summed from the start of the selected period — not from the start of the record.',
    'The zero line separates a positive balance from a negative one.',
    'Unobserved sessions add nothing and are never counted as zero.',
  ],

  /* ── Chart readout ───────────────────────────────────────────────────── */
  yearOf: (y: string) => `${y}`,
  weekOf: (from: string, to: string, y: string) => `Week of ${from} — ${to} ${y}`,
  observed: 'Observed',
  cumulativeBalanceRead: 'Cumulative balance',
  periodNet: 'Period net',
  sessions: 'Sessions',
  noData: 'No data',
  net: 'Net',
  trades: 'Trades',
  companies: 'Companies',
  ofActivity: 'of activity',
  ofForeignActivity: 'of foreign activity',

  /* ── Companies ───────────────────────────────────────────────────────── */
  companyActivity: 'Company activity',
  rankGroup: 'Company ranking',
  companyHint: 'Hover a company for its figures',
  noCompanies: 'No companies on this side',
  noCompaniesNote: 'Try the other side, or a longer period.',
  companyScope: (ranked: string, total: string) => `${ranked} of ${total} companies with foreign activity in the period`,
  howCompanies: 'How to read these figures',
  companyPoints: [
    'The company rows sum to the period total above — same table, same dinars.',
    'A company with no activity on this side is absent from the ranking, not shown as zero.',
    'This is trading activity, not a change in ownership.',
  ],
  companyRowLabel: (name: string, buy: string, sell: string, net: string) =>
    `${name}: buying ${buy}, selling ${sell}, net ${net}`,

  /* ── Sectors ─────────────────────────────────────────────────────────── */
  capitalSpread: 'Where foreign capital sits',
  bySector: 'By sector',
  sectorHint: 'Hover a sector for its figures',
  noSectorActivity: 'No foreign activity in this period',
  noSectorNote: 'Try a longer period.',
  sectorScope: 'Aggregated from the same company rows',
  howSectors: 'How to read these figures',
  sectorPoints: [
    'The bar is gross activity (buying + selling); the coloured figure is the net.',
    'Heavy activity with a net near zero means foreign investors trading with each other.',
  ],
  sectorRowLabel: (label: string, gross: string, net: string) =>
    `${label}: activity ${gross}, net ${net}`,
  unclassified: 'Unclassified',

  /* ── Ownership · a different quantity ────────────────────────────────── */
  ownership: 'Foreign ownership',
  ownershipSub: 'What foreign investors hold — not what they traded',
  monthlySnapshot: (m: string) => `Monthly snapshot · ${m}`,
  fullOwnership: 'Ownership structure',
  majorShareholders: 'Major shareholders',
  ownershipFailed: 'Couldn’t load the ownership data',
  ownershipFailedNote: 'The flow figures above are complete — ownership is a separate monthly table.',
  foreignShare: 'Foreign share of deposited shares',
  shareUnavailable: 'Share unavailable',
  sharePct: (p: string) => `${p} percent foreign ownership`,
  companiesWithForeign: 'Companies with foreign ownership',
  ofInReport: (n: string) => `of ${n}`,
  foreignHolders: 'Foreign holders',
  highestForeign: 'Highest share',
  sharesSplit: (foreign: string, iraqi: string) => `${foreign} foreign-held · ${iraqi} Iraqi-held`,
  ownSource: (month: string) => `Source: monthly ownership report · ${month}`,
  howOwnership: 'How to read these figures',
  ownPoints: [
    'A monthly snapshot, so it does not follow the period selected above.',
    'Share = foreign shares ÷ all deposited shares across the month’s companies.',
    'Names are extracted from a scanned report and matched to the canonical register when displayed.',
  ],

  /* ── Grain and ranking ───────────────────────────────────────────────── */
  grain: {
    session: 'One column per session',
    week: 'One column per week',
    month: 'One column per month',
    year: 'One column per year',
  },
  rank: {
    netIn: 'Largest net buying',
    netOut: 'Largest net selling',
    buy: 'Largest buying',
    sell: 'Largest selling',
  },
}
