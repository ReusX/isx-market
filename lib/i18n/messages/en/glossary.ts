import type { glossary as ar } from '../ar/glossary'

/**
 * The English half of the glossary.
 *
 * `Advancers` / `Decliners`, not `Gainers` / `Losers` — the homepage tabs are
 * a leaderboard and use Gainers/Losers, but a breadth count on the market board
 * is advancers and decliners, which is what those figures are called in every
 * English market report. Both live in the dictionary; neither is improvised
 * at the call site.
 */
export const glossary: typeof ar = {
  marketCap:   'Market Cap',
  tradingValue:'Trading Value',
  volume:      'Volume',
  trades:      'Trades',
  lastPrice:   'Last Price',
  lastTraded:  'Last Traded',
  change:      'Change',
  price:       'Price',
  pe:          'P/E',
  advancers:   'Advancers',
  decliners:   'Decliners',
  unchanged:   'Unchanged',
  noPrior:     'No Prior Close',
  mostActive:  'Most Active',
  foreignFlow: 'Foreign Flow',
  netFlow:     'Net Flow',
  buy:         'Buy',
  sell:        'Sell',
  session:     'Session',
  sessions:    'Sessions',
  sector:      'Sector',
  sectors:     'Sectors',
  coverage:    'Coverage',
  stale:       'Stale Prices',
  source:      'Source',
  filing:      'Filing',
  watchlist:   'Watchlist',
  portfolio:   'Portfolio',
  company:     'Company',
  companies:   'Companies',
  tradedCompanies: 'Traded Companies',
  index:       'Index',
  period:      'Period',
  median:      'Median',
  sessionAverage: 'Session Average',
  periodTotal: 'Period Total',
  ticker:      'Ticker',
}
