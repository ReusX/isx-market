import type { news as ar } from '../ar/news'

export const news: typeof ar = {
  title: 'News',
  itemsSince: (n: string, day: string) => `${n} items since ${day}`,
  standfirst: 'Company filings and market news',
  kindGroup: 'Item type',
  searchFull: 'Search by headline, company, ticker or source',
  sectorFilter: 'Filter by sector',
  coverage: (n: string, from: string, to: string) =>
    `The filings index available here covers ${n} published documents, from ${from} to ${to}. Not every filing in that period is available.`,
  showMore: 'Show more',
  searchLabel: 'Search news',
  searchPlaceholder: 'Search headlines and companies…',
  sector: 'Sector',
  allSectors: 'All sectors',
  matching: 'matching items',
  items: 'items',
  ofTotal: (n: string) => `of ${n}`,
  removeKind: 'Remove type filter',
  removeSector: 'Remove sector filter',
  clearSearch: 'Clear search',
  reset: 'Reset',

  kinds: {
    all:     'All',
    filing:  'Company filings',
    article: 'News',
  },
  sources: {
    filing:  'Iraq Securities Commission',
    article: 'IQWealth editorial',
  },
  financialStatements: 'Financial statements',

  articlesDown: 'Editorial news is temporarily unavailable',
  filingsDown:  'Company filings are temporarily unavailable',
  articlesFailedTitle: 'Couldn’t load editorial news',
  articlesFailedNote:  'The filings below are current. Editorial news comes from a separate source.',
  filingsFailedTitle:  'Couldn’t load the filings index',
  filingsFailedNote:   'The editorial news below is current. Filings come from a separate source.',

  emptyTitle: 'Nothing published yet',
  emptyNote:  'Filings appear as soon as the Securities Commission publishes them, and news as it is written.',
  noMatch: (q: string) => `No results matching “${q}”`,
  noneInFilter: 'No items in this filter',
  tryCompany: 'Try a company name, a ticker, or a word from the headline.',
  tryOtherFilter: 'Try a different type or sector.',
  filingLink: (kind: string, name: string, headline: string) => `${kind}: ${name} ${headline} · opens a PDF on the Securities Commission website`,
  market: 'Market',

  /**
   * ⚠ Shown ONLY on the English page, beside an item whose body is Arabic.
   *
   * The brief allows Arabic-only articles to stay discoverable from `/en/news`
   * provided their source language is clear. This is that marker. The Arabic
   * page has no counterpart — it would be telling an Arabic reader that an
   * Arabic article is in Arabic.
   */
  arabicArticle: 'In Arabic',
}
