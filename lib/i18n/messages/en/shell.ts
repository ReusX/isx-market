import type { shell as ar } from '../ar/shell'

export const shell: typeof ar = {
  menu:            'Menu',
  navMain:         'Main navigation',
  navMobile:       'Navigation',
  brandHome:       'IQWealth · Home',
  collapse:        'Collapse sidebar',
  expand:          'Expand sidebar',
  toLight:         'Switch to light mode',
  toDark:          'Switch to dark mode',
  account:         'Account',
  signIn:          'Sign in',
  signInLong:      'Sign in · create a free account',

  search: {
    trigger:     'Search a company or ticker…',
    dialog:      'Company search',
    placeholder: 'Search a company or ticker…',
    results:     'Results',
    close:       'Close',
    hint:        'Type a company name or its ticker.',
    empty:       (q: string) => `No results for “${q}”.`,
    keyMove:     'to move',
    keyOpen:     'to open',
    keyClose:    'to close',
  },

  language: {
    toEnglish: 'English — switch to the English version',
    toArabic:  'العربية — التبديل إلى النسخة العربية',
    group:     'Language',
  },

  footer: {
    blurb:      'A free platform for Iraqi investors · daily data from official sources, analysis and research tools.',
    disclaimer: 'Data is provided for information only and is not investment advice.',
  },
}
