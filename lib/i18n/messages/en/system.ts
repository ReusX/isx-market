import type { system as ar } from '../ar/system'

export const system: typeof ar = {
  noData:      'No data for this period',
  notEnough:   'Not enough data to calculate this metric',
  loadFailed:  'Couldn’t load data',
  retry:       'Try again',
  tryAgain:    'Try again',
  unavailable: 'Price unavailable',
  lastTraded:  (date: string) => `Last traded: ${date}`,
  notTraded:   'Not traded in the latest session',
  noResults:   'No results',
  differentSearch: 'Try a different search',
  loading:     'Loading…',

  notFound: {
    metaTitle: 'Page not found',
    title:     'There is no page at this address',
    note:      'The link may be out of date, or the ticker may be wrong.',
    home:      'Back to home',
    suggested: 'Suggested destinations',
    hintBefore: 'Or press',
    hintAfter:  'to search for a company by name or ticker.',
  },

  fault: {
    title:      'Something went wrong on our side',
    note:       'We couldn’t complete the request. This is our problem, not a mistake you made.',
    home:       'Back to home',
    hintBefore: 'If it keeps happening, tell us via',
    contact:    'Contact',
  },

  globalFault: {
    title: 'Something went wrong on our side',
    note:  'The application failed to load. This is our problem.',
    retry: 'Try again',
  },
}
