import type { pulse as ar } from '../ar/pulse'

/**
 * The English pulse.
 *
 * `Comparable` is the load-bearing word and it is used consistently: every
 * share statistic on this page divides by the companies that HAVE a prior
 * close to compare against, not by everything that traded. `No prior close` is
 * its own fourth state and never collapses into `Unchanged`.
 *
 * The rule sentences take the live thresholds, exactly as the Arabic ones do.
 */
export const pulse: typeof ar = {
  title:   'Market Pulse',
  sessionOf: (d: string) => `${d} session`,
  allShares: 'All shares',

  noSessionTitle: 'No session data published yet',
  noSessionNote:  'Breadth is computed from the official bulletin after the session closes.',
  failedTitle: 'Couldn’t load the session data',
  failedNote:  'You can try again, or go back to the Market page.',
  retry: 'Try again',

  showRule: 'Show the classification rule',
  hideRule: 'Hide the classification rule',
  ruleWord: 'Rule',

  upByCount:  'Advancing by count',
  upByVolume: 'Advancing by volume',
  ofComparable: (up: string, total: string) => `${up} of ${total} comparable`,
  sharesUnit: 'shares',

  breadthVsLiquidity: 'Breadth & Liquidity',
  adRatio: (r: string) => `Advance/decline ratio ${r} : 1`,
  noRatio: 'The ratio cannot be computed — nothing declined',

  up: 'Advancing',
  flat: 'Unchanged',
  down: 'Declining',
  noPrior: 'No comparison',
  noPriorLong: 'No prior close',
  onRising: 'On advancers',
  onFalling: 'On decliners',
  traded: 'Traded',

  skewAligned: 'Advancing shares take about the same share of volume as they do of the count — a consistent move.',
  skewWith: (pts: string) => `Advancing shares take ${pts} percentage points more of the volume than of the count — liquidity is with the move.`,
  skewAgainst: (pts: string) => `Advancing shares take ${pts} percentage points less of the volume than of the count — the rise is broader than it is backed.`,
  noPriorNote: (n: string, plural: boolean) =>
    `${n} ${plural ? 'companies' : 'company'} traded in this session with no comparable prior close, so ${plural ? 'they have' : 'it has'} no direction.`,

  participation: 'Participation',
  tradedOfListed: (listed: string) => `companies traded, of ${listed} listed`,
  tradedNoListed: 'companies traded',
  tradedValue: 'Trading value',
  tradeCount:  'Trades',
  highsLows:   '52-week highs / lows',
  listed:      'Listed',
  prevSession: 'Previous session',
  difference:  'Difference',
  points:      'points',
  participationLabel: (pct: string, traded: string, listed: string) =>
    `${pct} percent participation · ${traded} of ${listed}`,

  verdictLabel: 'Session verdict',
  timeframe: 'Timeframe',
  verdictJoin: (headline: string, qualifier: string) => `, ${qualifier}`,

  subhead: 'Market breadth and participation, beneath the index level',
  ratioDash: 'Advance/decline ratio',
  noRatioHelp: 'The ratio cannot be computed because nothing declined in this session.',
  countField: 'Companies traded',
  countUnit:  'companies',
  volumeField:'Directional trading volume',
  volumeTotalLabel: 'directional volume',
  /* Leading space and a capital: this continues `noPriorNote`, and the two
     were rendered adjacent in the JSX with nothing between them — which read
     as «…so they have no direction.are shown separately…» in English. */
  noPriorTail: ' They are shown separately and were not counted as unchanged; they do not enter the count shares above.',
  vsPrevSession: 'vs the previous session',
  companySuffix: ' companies',
  tradedGap: (index: string, rows: string) =>
    `The session bulletin reports ${index} companies traded, while the price record holds ${rows} rows. The figures above are computed from the price record.`,
  advMinusDec: 'Advancing minus declining',
  netBreadthHelpLong:
    'Net breadth = advancing companies minus declining ones in the session. The historical record compares each company with the last close it actually traded at, not with the previous session’s close, so it does not separate out companies with no prior close.',
  concentrationFoot:
    'Ranked by trading value in the session. The data carries no ISX60 constituent weights, so companies’ contribution to the index move is not shown.',

  netBreadth: 'Net Breadth by Session',
  netBreadthHelp: 'Net breadth = the number of advancing companies minus the number declining',
  netBreadthWord: 'Net breadth',
  pinnedHint: 'Session pinned — click again to release',
  latestHint: (n: string) => `Latest session on record · ${n} sessions shown`,
  sessionBarLabel: (date: string, net: string, up: string, down: string) =>
    `${date}: net breadth ${net}, ${up} advancing, ${down} declining`,

  sectorBreadth: 'Sector Breadth',
  sectorNote:    'How companies within each sector moved, not the sector’s return',
  upToDown:      'Advancing : declining',
  sectorHint:    'Hover or click a sector to see its spread · clicking pins it',
  sectorBarLabel: (label: string, up: string, flat: string, down: string, noPrior: string, traded: string) =>
    `${label}: ${up} advancing, ${flat} unchanged, ${down} declining, ${noPrior} with no comparison, of ${traded} traded`,

  concentration: 'Trading Concentration',
  concentrationNote: 'By trading value, not by index movement',
  concentrationNA: 'Session trading value is unavailable, so concentration cannot be computed',
  concentrationTop: 'of the session’s trading value went through just 5 companies',
  ofSessionValue: 'of session value',
  movement: 'Move',
  concentrationHint: 'Hover a company to see its share · clicking opens its page',
  companyValueLabel: (name: string, value: string) => `${name} · trading value ${value} dinars`,
  sliceLabel: (txt: string, pct: string) => `${txt} · ${pct} percent`,

  verdict: {
    broadSupported: {
      headline: 'Broad advance',
      qualifier: 'backed by a larger share of volume than of count',
      rule: (broad: string, _weak: string, skew: string) =>
        `A session is called broadly positive when more than ${broad} of comparable companies rise, and the liquidity skew is called clear when the gap between advancing shares’ share of volume and their share of the count exceeds ${skew} percentage points. Both held this session, and the skew favoured advancing shares.`,
    },
    broadUnsupported: {
      headline: 'Positive breadth',
      qualifier: 'but liquidity leans towards declining shares',
      rule: (broad: string, _weak: string, skew: string) =>
        `A session is called broadly positive when more than ${broad} of comparable companies rise, and the liquidity skew is called clear when the gap exceeds ${skew} percentage points. Both held, but the skew favoured declining shares, so the session is not called a backed advance.`,
    },
    broadNeutral: {
      headline: 'Positive breadth',
      qualifier: 'with no clear liquidity skew',
      rule: (broad: string, _weak: string, skew: string) =>
        `A session is called broadly positive when more than ${broad} of comparable companies rise. The gap between advancing shares’ share of volume and their share of the count did not exceed ${skew} percentage points, so the advance is called neither backed nor unbacked.`,
    },
    weakSupported: {
      headline: 'Broad weakness',
      qualifier: 'with most trading volume on declining shares',
      rule: (_broad: string, weak: string, skew: string) =>
        `Breadth is called negative when the proportion of rising companies is ${weak} or less of the comparable set, and the liquidity skew is called clear when the gap exceeds ${skew} percentage points. Both held, and the skew favoured declining shares.`,
    },
    weakNeutral: {
      headline: 'Negative breadth',
      qualifier: 'with no clear liquidity skew',
      rule: (_broad: string, weak: string, skew: string) =>
        `Breadth is called negative when the proportion of rising companies is ${weak} or less of the comparable set. The gap between advancing shares’ share of volume and their share of the count did not exceed ${skew} percentage points.`,
    },
    balanced: {
      headline: 'Balanced session',
      qualifier: 'with no clear direction in breadth',
      rule: (broad: string, weak: string, _skew: string) =>
        `A session is called balanced when the share of advancing companies stays between ${weak} and ${broad} of the comparable set, so neither the positive nor the negative breadth condition is met.`,
    },
  },

  /* ── The rebuilt page (redesign) ── see the Arabic file for the rules. */
  page: {
    eyebrow: 'Markets',
    lede: 'The index tells you which way the market moved. This page tells you whether the move was real: how many companies took part, where the volume went, and how few stocks the session rests on.',
    session: (date: string) => `Session of ${date}`,
    because: (co: string, vol: string) => `${co} of companies rose \u00b7 ${vol} of the volume was on them`,
    showRule: 'How we reached this reading',
    noSession: 'No valid session data is available.',

    readings: 'Session readings',
    cols: { reading: 'Reading', pair: 'Compared', share: 'Share' },
    breadth: 'Breadth',
    breadthA: (n: string) => `${n} rose`,
    breadthB: (n: string) => `${n} fell`,
    liquidity: 'Liquidity',
    liquidityA: (v: string) => `${v} on rising shares`,
    liquidityB: (v: string) => `${v} on falling shares`,
    participation: 'Participation',
    participationA: (n: string) => `${n} companies traded`,
    participationB: (n: string) => `of ${n} listed`,
    concentration: 'Concentration',
    concentrationA: (v: string) => `${v} in the 5 biggest`,
    concentrationB: (v: string) => `of ${v} traded`,
    flatNote: (n: string) => `${n} flat`,
    noPriorNote: (n: string) => `${n} unmeasured`,
    noPriorWhy: 'A company that traded today but not in the previous session has no measurable direction, so it is not counted as flat and never enters a denominator here.',

    history: 'Breadth across sessions',
    historyNote: 'Risers minus fallers each session, with the cumulative line summing them from the start of the period. The source here is the daily breadth table, which compares each company with its own previous close rather than with the previous session.',
    timeframe: 'Period',
    adLine: 'Cumulative line',
    adLineNote: 'Net breadth summed from the start of the selected period. Rising means the market is broadening session after session; falling means the opposite \u2014 even when the index says otherwise.',
    latest: 'Latest session',

    sectors: 'Breadth by sector',
    sectorsNote: 'Within each sector: how many of its companies rose and how many fell. A company whose sector is unknown is left out of the table rather than filed under a guess.',
    sectorCols: { sector: 'Sector', up: 'Rose', down: 'Fell', flat: 'Flat', none: 'Unmeasured', traded: 'Traded' },

    gap: (index: string, rows: string) => `The exchange bulletin reports ${index} companies traded; we hold ${rows} rows for this session.`,

    about: {
      title: 'About these figures',
      body: [
        'The index is one number, and it can rise because a single large stock rose while most of the market fell. This page takes that apart: how many companies moved each way, how much volume stood behind each direction, and how many companies took part at all.',
        'The rule on every line is two numbers compared, not one number displayed. \u201cEight companies rose\u201d means nothing on its own; \u201ceight rose against thirty that fell\u201d means a weak session.',
        'A company that traded today but not in the previous session has no measurable direction, so it is not counted as flat. It appears under \u201cunmeasured\u201d and is excluded from every denominator on this page \u2014 because a missing measurement is not a zero.',
        'The page does not show each stock\u2019s contribution to the index move: that needs the index constituent weights, which this product does not hold. A number that cannot be computed is neither shown nor implied.',
      ],
    },
  },
}
