import type { ar } from '../ar'
import { nav } from './nav'
import { shell } from './shell'
import { system } from './system'
import { glossary } from './glossary'
import { info } from './info'
import { data } from './data'
import { home } from './home'
import { market } from './market'

/** The English dictionary. Typed against Arabic — see `../ar/index.ts`. */
export const en: typeof ar = { nav, shell, system, glossary, info, data, home, market }
