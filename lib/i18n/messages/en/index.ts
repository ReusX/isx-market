import type { ar } from '../ar'
import { nav } from './nav'
import { shell } from './shell'
import { system } from './system'
import { glossary } from './glossary'
import { info } from './info'

/** The English dictionary. Typed against Arabic — see `../ar/index.ts`. */
export const en: typeof ar = { nav, shell, system, glossary, info }
