import type { nav as ar } from '../ar/nav'

/**
 * English navigation.
 *
 * Written as an English product would name these sections, not as a rendering
 * of the Arabic. «الدولار في العراق» is `USD/IQD` because that is the pair an
 * English reader scans for; «مستكشف الأسهم» is `Stock Screener` because that is
 * the established English term for the tool, even though «screener» is exactly
 * the word the Arabic side deliberately moved away from.
 */
export const nav: typeof ar = {
  home:      'Home',
  market:    'Market',
  screener:  'Stock Screener',
  stats:     'Market Statistics',
  heatmap:   'Market Map',
  pulse:     'Market Pulse',
  news:      'News',
  portfolio: 'Portfolio',
  watchlist: 'Watchlist',
  fx:        'USD/IQD',
  gold:      'Gold',
  oil:       'Oil',
  learn:     'Learn',

  groups: {
    market:   'Market Data',
    personal: 'Personal',
    tools:    'Tools',
    learn:    'Learn',
  },

  info: {
    heading: 'Site',
    about:   'About',
    contact: 'Contact',
    privacy: 'Privacy',
    legal:   'Legal notice',
  },
}
