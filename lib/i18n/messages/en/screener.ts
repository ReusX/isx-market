import type { screener as ar } from '../ar/screener'

export const screener: typeof ar = {
  title:      'Stock Screener',
  standfirst: 'Filter Iraq Stock Exchange companies by performance, liquidity, valuation and foreign flow.',

  workspace:  'Screening tools',
  searchLabel: 'Search companies',
  searchPlaceholder: 'Search by company name or ticker…',
  clearSearch: 'Clear search',
  sectorLabel: 'Filter by sector',
  allSectors:  'All sectors',
  periodLabel: 'Comparison period',
  changeOver:  'Change over',
  advanced:    'Advanced filters',
  filters:     'Filters',
  quickStarts: 'Quick starts',

  min: 'Min',
  max: 'Max',
  minOf: (metric: string) => `${metric} — minimum`,
  maxOf: (metric: string) => `${metric} — maximum`,
  clearFilterOf: (metric: string) => `Clear ${metric} filter`,

  tokenSector: 'Sector',
  tokenSearch: 'Search',
  removeSector: 'Remove sector filter',
  removeSearch: 'Remove search',
  removeFilterOf: (metric: string) => `Remove ${metric} filter`,
  noFilters: 'No filters applied · showing the whole market',
  reset: 'Reset',
  matchingOf: 'matching of',
  invalidRange: (metrics: string) => `Minimum is above maximum in: ${metrics} — nothing will match.`,

  listingLabel: 'Listing status',
  active:    'Active',
  suspended: 'Suspended',

  peFailed: 'P/E data failed to load. Every other metric is complete; sorting by P/E is unavailable for now.',
  loadFailedTitle: 'Couldn’t load screening data',
  loadFailedNote:  'We couldn’t reach the company metrics. Your filters are kept and will be applied when you retry.',
  retry: 'Try again',

  resultsLabel: 'Screening results',
  caption: (n: string) => `Screener results · ${n} companies`,
  colCompany:   'Company',
  colPrice:     'Price',
  colChange:    'Change',
  colPe:        'P/E',
  colBand:      '52-Week Range',
  colLiquidity: 'Daily Liquidity',
  colForeign:   'Foreign Net 30d',
  colMcap:      'Market Cap',
  colSector:    'Sector',

  sortedAsc:  'sorted ascending',
  sortedDesc: 'sorted descending',
  notSorted:  'not sorted',
  noMeasure:  'no measurement available',
  noReference:'no reference close for this period',
  peUnavailable: 'no financials, or the company is not profitable',
  peLoadFailed:  'failed to load',

  emptyTitle: 'No matching companies',
  emptyNote:  'No company met all of the conditions at once. Try widening your narrowest one rather than clearing everything.',
  emptySearch:'search',
  emptyReset: 'Reset filters',

  filtersCompose: 'Filters compose — a company must satisfy all of them. A company with no value for a metric is excluded from filters on that metric, and stays eligible for every other one · “Change” follows the period selected above.',
  footnote:
    'Metrics are computed from each share’s most recent official bulletin · liquidity = 20-session average daily trading value · '
    + 'market cap = last price × issued shares · P/E is trailing twelve months and is shown only for profitable companies whose '
    + 'financials are available · the source carries no dividend or book-value data.',

  suspendedNote: (days: string) =>
    `Shares with no trade in over ${days} days · their performance and valuation metrics are computed from a stale price, and no market cap is given.`,
  listSeparator: ', ',

  sheetClose: 'Close',
  sheetMatching: 'matching',
  show: 'Show',
  results: 'results',
}
