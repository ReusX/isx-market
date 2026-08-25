import { DEFAULT_LOCALE, isLocale, type Locale } from './locale'
import { existsIn } from './routes'

/**
 * Translating between a pathname and a (locale, route) pair.
 *
 * Arabic is unprefixed and English is under `/en`, so the two directions are
 * not symmetric and every one of these functions has to say which side it is
 * on. Getting this wrong is not a visual bug — it is a canonical pointing at
 * the wrong language.
 */

/** `/en/market` → `{ locale: 'en', route: '/market' }`; `/market` → `{ 'ar', '/market' }`. */
export function splitLocale(pathname: string): { locale: Locale; route: string } {
  const clean = pathname.split(/[?#]/)[0] || '/'
  const parts = clean.split('/').filter(Boolean)
  if (parts.length && isLocale(parts[0]) && parts[0] !== DEFAULT_LOCALE) {
    const rest = parts.slice(1).join('/')
    return { locale: parts[0] as Locale, route: rest ? `/${rest}` : '/' }
  }
  return { locale: DEFAULT_LOCALE, route: clean === '' ? '/' : clean }
}

/** The locale a pathname is served in. */
export function localeOf(pathname: string): Locale {
  return splitLocale(pathname).locale
}

/** The locale-free route of a pathname. */
export function routeOf(pathname: string): string {
  return splitLocale(pathname).route
}

/** `('/market', 'en')` → `/en/market`; `('/', 'en')` → `/en`; anything ar → itself. */
export function localePath(route: string, locale: Locale): string {
  const r = route.startsWith('/') ? route : `/${route}`
  if (locale === DEFAULT_LOCALE) return r
  return r === '/' ? '/en' : `/en${r}`
}

/**
 * Where the language switch should send someone standing on `pathname`.
 *
 * The rule the brief sets is "equivalent route, not always Home". So the first
 * choice is always the same route in the other language. When that route does
 * not exist in the target language — an Arabic-only CMS article, say — we walk
 * UP the path to the nearest ancestor that does, which lands an English reader
 * on `/en/news` rather than on `/en`. Only a route with no translatable
 * ancestor at all falls back to the target-language home.
 *
 * It never manufactures a URL: every destination it returns is a route the
 * registry says exists in that locale.
 */
export function switchPath(pathname: string, to: Locale): string {
  const { route } = splitLocale(pathname)
  if (existsIn(route, to)) return localePath(route, to)

  const parts = route.split('/').filter(Boolean)
  for (let i = parts.length - 1; i > 0; i--) {
    const ancestor = `/${parts.slice(0, i).join('/')}`
    if (existsIn(ancestor, to)) return localePath(ancestor, to)
  }
  return localePath('/', to)
}
