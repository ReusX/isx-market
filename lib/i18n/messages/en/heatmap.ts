import type { heatmap as ar } from '../ar/heatmap'

export const heatmap: typeof ar = {
  title:      'Market Map',
  legendLine: (period: string) => ({ size: 'market cap', colour: `${period} change`, group: 'sector' }),
  sizeIs:     'Tile size =',
  colourIs:   'Colour =',
  groupIs:    'Grouped by',
  changeOf:   (period: string) => `${period} change`,
  sector:     'sector',
  marketCap:  'market cap',

  lastSession: 'Last session',
  companies:   'Companies',
  tradedIn:    'Traded in session',

  periodLabel: 'Change period',
  crumbLabel:  'Map path',
  allSectors:  'All sectors',
  searchPlaceholder: 'Find a company on the map…',
  searchLabel: 'Search the map',
  clearSearch: 'Clear search',

  coverage: (traded: string, included: string, date: string, olderArea: string,
             noCap: string, stale: string, unknownAge: string) =>
    `${traded} of ${included} mapped companies traded in the ${date} session; the rest are drawn from their last published close — ${olderArea} of the area. `
    + `Excluded: ${noCap} with no share count, ${stale} priced more than 60 days ago`
    + (unknownAge ? `, ${unknownAge} with an unknown last-trade date` : '') + '.',

  sectorsLabel: 'Market sectors',
  sectorOf:     (name: string) => `${name} sector companies`,

  loadFailedTitle: 'Couldn’t load the map data',
  loadFailedNote:  'The company metrics didn’t arrive. Try reloading, or browse',
  loadFailedLink:  'the Market',
  emptyTitle: 'No companies qualify for the map',
  emptyNote:  'No company has both a computable market cap and a price newer than 60 days.',

  legendChange: 'Change',
  bandsLabel:   'Highlight companies by size of move',
  scaleNote:    (cap: string, period: string) => `The colour scale runs to ±${cap}% over the ${period} period`,
  close:        'Close',
  highlightBand: (band: string) => `Highlight companies within ${band}`,
  noReading:  'no reading',
  noReadingPeriod: 'no reading for this period',

  companyUnit: 'companies',
  nodeLabel: (name: string, n: string, reading: string) => `${name}, ${n} companies, ${reading}`,
  nodeTitle: (name: string, pct: string, cap: string, n: string, missing: string) =>
    `${name} · ${pct} · ${cap} IQD · ${n} companies${missing ? ` · ${missing} with no reading` : ''}`,
  tileLabel: (name: string, ticker: string, reading: string, cap: string) =>
    `${name} ${ticker}, ${reading}, market cap ${cap} dinars`,
  tileTitle: (name: string, ticker: string, reading: string, price: string) =>
    `${name} · ${ticker} · ${reading} · ${price} IQD`,

  panelOf:  (name: string) => `${name} details`,
  marketCapCol: 'Market cap',
  lastPrice:'Last price',
  currency: 'IQD',
  tradedValue: 'Trading value',
  volume:   'Volume',
  trades:   'Trades',
  changeIn: (period: string) => `${period} change`,
  tradedFrom: (date: string) => `Trading figures are from the ${date} session.`,
  notTraded:  (date: string) => `Did not trade in the latest session · last actual trade ${date}.`,
  noTradeData:'No trading figures are available for this company.',
  openCompany:'Open the company page',
}
