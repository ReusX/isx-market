import type { home as ar } from '../ar/home'

/**
 * The English homepage.
 *
 * `Latest Market Session`, not `Today` and not `Live` — the data is the last
 * published bulletin and the heading is not allowed to imply otherwise. Same
 * rule as the Arabic side, same reason.
 *
 * `Gainers` / `Losers` on the tabs, `Advancers` / `Decliners` in the breadth
 * counts. Those are the terms an English market report uses in each of those
 * two places, and using one word for both would make the leaderboard sound
 * like a breadth statistic.
 */
export const home: typeof ar = {
  eyebrow:      'Market overview',
  title:        'Latest Market Session',
  greeting:     (salutation: string, name: string) => `${salutation}, ${name}`,
  morning:      'Good morning',
  evening:      'Good evening',
  summaryLabel: 'Iraqi market summary',

  index: {
    eyebrow:  'Iraq market index',
    periods:  'Time period',
    low:      'Period low',
    high:     'Period high',
    session:  (d: string) => `Last session ${d}`,
    expanded: 'expanded chart',
    fullChart:'Full chart',
    rangeAll: 'All',
    expandedLabel: 'Expanded ISX60 chart',
    plotLabel: (range: string) => `ISX60 index plot · ${range} · use the arrow keys to read points`,
  },

  flow: {
    title:     'Foreign Investor Flow',
    sub:       'International liquidity',
    none:      'No foreign flow data for this session.',
    balanced:  'Foreign flow balanced',
    netBuy:    'Net foreign buying',
    netSell:   'Net foreign selling',
    staleNote: 'Flow data is older than the index session.',
    buyLine:   (share: string) => `of foreign trading was buying · ${share}`,
    close:     'Foreign buying and selling were close to even',
    sessionOf: (d: string) => `Session ${d}`,
    more:      'View Flow Details',
    details:   'Details',
    barLabel:  (buy: string, sell: string) => `Foreign buying ${buy} dinars, foreign selling ${sell} dinars`,
    buySeg:    (v: string, share: string) => `Foreign buying ${v} dinars, ${share} percent`,
    sellSeg:   (v: string, share: string) => `Foreign selling ${v} dinars, ${share} percent`,
    splitLabel:(buy: string, sell: string) => `${buy} percent buying and ${sell} percent selling`,
    readBuy:   'foreign buying',
    readSell:  'foreign selling',
    ofForeign: 'of foreign trading',
    shareLine: (pct: string, buying: boolean) =>
      `${pct} of foreign trading was ${buying ? 'buying' : 'selling'}`,
  },

  breadth: {
    title:   'Market Performance',
    details: 'View Market',
    up:      'Advancing',
    flat:    'Unchanged',
    down:    'Declining',
    na:      'No prior close',
    positive:'Advancing',
    ofListed:(n: string) => `of ${n} listed`,
    traded:  (n: string) => `${n} companies traded`,
    reading: (up: string, flat: string, down: string, na: string, traded: string) =>
      `${up} advancing, ${flat} unchanged, ${down} declining, ${na} with no prior close, of ${traded} companies traded`,
  },

  activity: {
    eyebrow: 'Market session',
    title:   'Market Activity',
    value:   'Trading Value',
    volume:  'Trading Volume',
    trades:  'Trades',
    unitShares: 'sh',
    unitTrades: 'trades',
    unitIqd:    'IQD',
    trendOf:    (what: string) => `${what} trend`,
    more:    'View Statistics',
  },

  sectors: {
    eyebrow: 'Sector performance',
    title:   'Market by Sector',
    map:     'Full map',
    reading: (name: string, dir: string, pct: string) => `${name}, ${dir} ${pct} percent`,
    up:      'up',
    down:    'down',
  },

  movers: {
    eyebrow:  'Market board',
    title:    'Key Companies',
    all:      'All companies',
    search:   'Search for a company',
    searchPlaceholder: 'Search for a company…',
    tablist:  'Company filter',
    tabMcap:  'Market Cap',
    tabGainers:'Gainers',
    tabLosers:'Losers',
    tabActive:'Most Active',

    colCompany: 'Company',
    colPrice:   'Last Price',
    colChange:  'Change',
    colVolume:  'Volume',
    colTrend:   '7-session trend',
    captionCap:     (n: string) => `${n} companies ranked by market cap · a snapshot of the register`,
    captionSession: (n: string, d: string) => `${n} companies in the ${d} session`,
    close:          'Close',
    valueCapMode:   'Market Cap',
    valueTradeMode: 'Trading Value',

    capNote:
      'Market cap = last traded price × shares issued, the same figure shown on the Market and Companies pages · '
      + 'a snapshot of the register, not an official ranking. Companies with no price or no share count are excluded, not counted as zero.',
  },
}
