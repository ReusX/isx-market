import type { market as ar } from '../ar/market'

/**
 * The English board.
 *
 * `Advancing` / `Declining` for the breadth counts, `Gainers` / `Losers` for
 * the leaderboard tabs — the two are different questions and English market
 * writing uses different words for them.
 *
 * `Latest bulletin`, not `Live` and not `Today`. Same rule, same reason.
 */
export const market: typeof ar = {
  title:        'Market',
  bulletin:     'Latest bulletin',
  session:      'Session',
  traded:       'Traded',
  companies:    'Companies',
  of:           'of',

  summaryLabel: 'Session Performance',
  breadth:      'Market Breadth',
  tradedValue:  'Trading Value',
  volume:       'Trading Volume',
  trades:       'Trades',
  mostActive:   'Most Active',
  unitShares:   'shares',

  up:      'Advancing',
  flat:    'Unchanged',
  down:    'Declining',
  noPrior: 'No prior close',

  filterTabs:   'Company filter',
  tabAll:       'All',
  tabGainers:   'Gainers',
  tabLosers:    'Losers',
  tabActive:    'Most Active',

  searchLabel:  'Search companies',
  searchPlaceholder: 'Search by company name or ticker…',
  clearSearch:  'Clear search',
  sectorLabel:  'Filter by sector',
  listingLabel: 'Listing status',
  active:       'Active',
  suspended:    'Suspended',
  watchlist:    'Watchlist',
  clearFilters: 'Clear filters',
  countUnit:    'companies',

  suspendedNote: (days: string) =>
    `Shares with no trade in over ${days} days. The price shown is the last actual trade on its own date, not a current quote — which is why no market cap is given.`,

  loadFailedTitle: 'Couldn’t load the market board',
  loadFailedNote:  'We couldn’t reach the session data.',
  retry:           'Try again',

  tableLabel: 'Company table',
  rank:       'Rank',
  watch:      'Watch',
  colCompany: 'Company',
  colPrice:   'Last Price',
  colChange:  'Change',
  colPct:     'Change %',
  colVolume:  'Volume',
  colValue:   'Trading Value',
  colTrades:  'Trades',
  colMcap:    'Market Cap',
  colTrend:   '7-session trend',

  rowSuspended: 'suspended',
  rowNoTrade:   'not traded',

  sortedAsc:  'sorted ascending',
  sortedDesc: 'sorted descending',
  notSorted:  'not sorted',
  noValue:    'not available',
  breadthReading: (up: string, flat: string, down: string, na: string, traded: string) =>
    `${up} advancing, ${flat} unchanged, ${down} declining, ${na} with no prior close, of ${traded} traded`,
  caption:    (date: string, n: string) => `Iraq Stock Exchange share movement for the ${date} session · ${n} companies`,
  watchOf:    (sym: string) => `Watch ${sym}`,

  footnote: (date: string) =>
    `Prices from the official Iraq Stock Exchange bulletin for the ${date} session · market cap = last price × issued shares · companies that did not trade in the session show their last actual price, with no change and no volume.`,

  empty: {
    title:  'No matching companies',
    note:   'No company in this session matched the filters currently applied.',
    search: 'search',
    tab:    { all: '', gainers: 'Gainers', losers: 'Losers', active: 'Most Active' },
    move:   { all: '', up: 'Advancing', flat: 'Unchanged', down: 'Declining', na: 'No prior close' },
    watchlist: 'Watchlist',
    reset:  'Clear all filters',
  },
  page: {
    eyebrow:   'Markets',
    lede:      'Every company listed on the Iraq Stock Exchange: last price, change and traded value — one session, most active first.',
    index:     'ISX60 index',
    tradedOf:  (n: string, total: string) => `${n} of ${total} companies traded`,
    sessionOf: (date: string) => `Session of ${date}`,
    rail: { market: 'Market', companies: 'Companies', screener: 'Screener', heatmap: 'Heatmap', statistics: 'Statistics', pulse: 'Pulse' },
    showing:   (n: string) => `${n} companies`,
    board: {
      title:    'Companies',
      price:    'Price',
      d1:       '24h',
      d7:       '7 days',
      d30:      '30 days',
      volume:   'Volume',
      shares:   'Shares',
      mcap:     'Market cap',
      untraded: 'Did not trade this session',
      streak:   (n: number) => `No trade for ${n} sessions`,
      showAll:  (n: string) => `Show all companies (${n})`,
      showLess: 'Show less',
      sortNote: 'Sorted by volume',
    },
    breadth:   { label: 'Company moves', up: 'advancing', down: 'declining', flat: (n: string) => `${n} unchanged` },
    untraded:  'Not traded',
    noChange:  'No change',
    emptyTitle: 'No results',
    emptyNote:  'Try another name or clear the filter.',
    loadFailed: 'The market could not be loaded. Try again shortly.',
    chart: {
      title:   'ISX60 index',
      which:   'Index',
      series:  { isx60: 'ISX60', rsisx: 'RSISX' },
      ranges:  { m1: '1M', m3: '3M', y1: '1Y', y3: '3Y', all: 'All' },
      high:    'High',
      low:     'Low',
      since:   (d: string) => `since ${d}`,
      label:   'ISX60 index chart',
      empty:   'Index data is unavailable.',
      full:    'View full chart',
    },
    flow: {
      title:   'Foreign investor flow',
      buy:     'Buy',
      sell:    'Sell',
      net:     'Net',
      netBuy:  'Net buying',
      netSell: 'Net selling',
      even:    'Balanced',
      periods: { session: 'Session', month: 'Last 20 sessions' },
      label:   (buy: string, sell: string) => `Foreign buying ${buy}, foreign selling ${sell}`,
      empty:   'Foreign flow data is unavailable.',
      full:    'Full foreign-flow statistics',
      note:    'Each side\u2019s share of total foreign trading.',
      strip:   'Hover a session to show it in the ring · log scale',
    },
  },
}
