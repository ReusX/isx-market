import type { data as ar } from '../ar/data'

export const data: typeof ar = {
  unavailable:   'Unavailable',
  noActivity:    'No activity',
  retry:         'Try again',
  moduleFailed:  (what: string) => `Couldn’t load ${what}`,
  restOfPageOk:  'The rest of the page is working.',

  why: {
    noPriorClose:    'No prior close',
    noPriorSession:  'No previous session to compare against',
    noPriceOrShares: 'No price or share count available',
    notEnoughHistory:'Not enough history',
  },

  modules: {
    isx60:       'the ISX60 index',
    foreignFlow: 'foreign investor flow',
    breadth:     'market breadth',
    activity:    'market activity',
    sectors:     'sector performance',
    prices:      'company prices',
  },
}
