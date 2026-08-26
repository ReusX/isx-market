import type { learn as ar } from '../ar/learn'

export const learn: typeof ar = {
  article: {
    crumbs: 'Breadcrumb',
    articleNav: 'Article navigation',
    prev: 'Previous',
    next: 'Next',
    contents: 'Contents',
  },
  tickerSearch: 'Search for a company…',
  title: 'Learn',
  startHere: 'Start here',
  start: 'Start',
  latest: 'Latest guides',
  allArticles: 'All guides',
  searchLabel: 'Search the guides',
  searchPlaceholder: 'Search the guides…',
  ofTotal: (shown: string, total: string) => `${shown} of ${total}`,
  clear: 'Clear',
  clearSearch: 'Clear search',
  showMore: 'Show more',

  /* ⚠ It does not say "coming soon" — it says what will happen and when. The
     library is genuinely empty and the copy does not pretend otherwise. */
  emptyTitle: 'No guides published yet',
  emptyNote:  'Published guides will appear here.',
  libraryDown: 'The library couldn’t be loaded right now. “Start here” above is still available.',
  noResults: 'No results',
  noResultsNote: 'Try another word, or clear the search.',
  nothingToSearch: 'There are no guides to search yet.',
  libraryFailed: 'The library couldn’t be loaded, so it cannot be searched right now.',

  crumbsLabel: 'Breadcrumb',
  guideIntro: 'Want to invest on the Iraq Stock Exchange but do not know where to start? This guide explains',
  minutes: (n: string) => `${n} min read`,
  minutesPlural: (n: string) => `${n} min read`,
  lastUpdated: (d: string) => `Updated ${d}`,

  pathTitle: 'Trading shares from zero',
  pathSummary: 'A beginner’s guide: what the Iraq Stock Exchange is, how to start, and how to read a share price.',
  guideH1: 'Trading shares from zero · a beginner’s guide to the Iraq Stock Exchange',
  guideStandfirst: 'Everything you need from the beginning — from what trading is to your first order.',
  sectionsCount: (n: string) => `${n} sections`,
  pathSections: 'Sections',
  ofSections: (i: string, n: string) => `${i} of ${n}`,
  afterPath: 'After this guide',
  followMarket: 'Follow the market',
  market: 'Market',
}
