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
  page: {
    eyebrow: 'Markets',
    lede:    'The whole market in one picture: each square is a company, sized by market cap and coloured by its price change over the chosen period, grouped by sector.',
    sizeBy:  'Size by',
    sizeCap: 'Market cap',
    sizeValue: 'Traded value (20 sessions)',
    summary: (up: string, down: string, flat: string, none: string, period: string) =>
      `Over ${period}: ${up} up \u00b7 ${down} down \u00b7 ${flat} flat \u00b7 ${none} no reading`,
    excluded: (n: string) => `${n} companies are off the map: no market cap, or suspended for more than 60 days.`,
    pick:    'Click any square to see its details here.',
    about: {
      title: 'How to read the map',
      body: [
        'Each square is a company listed on the Iraq Stock Exchange. Its area is its market cap (last price \u00d7 shares) or its 20-session average traded value, as you choose. Its colour is the price change over the period: green up, coral down, deeper for larger moves.',
        'Squares are grouped by sector, and a sector\u2019s move is its companies\u2019 moves weighted by market cap. A company with no reference price for the period is hatched, not coloured, because \u201cno reading\u201d is not \u201cflat\u201d.',
        'The colour scale depends on the period: \u00b13% in a day is treated like \u00b160% in a year. Companies suspended for more than sixty days are not shown because their price no longer describes the market.',
      ],
    },
  },
}
