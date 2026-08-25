import { nav } from './nav'
import { shell } from './shell'
import { system } from './system'
import { glossary } from './glossary'
import { info } from './info'
import { data } from './data'
import { home } from './home'

/**
 * The Arabic dictionary — and, because `en` is typed as `typeof ar`, the
 * SCHEMA for the English one.
 *
 * That single line is the completeness gate. A key added here and forgotten in
 * `../en` is a type error at build time, not a page that quietly renders
 * `home.title` to an English reader. It also works in the other direction: a
 * key removed here but left in `en` fails too, so the dictionaries cannot
 * drift apart in either direction.
 */
export const ar = { nav, shell, system, glossary, info, data, home }
