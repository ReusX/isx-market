/**
 * Every canonical URL the site emits, from one place.
 *
 * Before this, the origin was typed by hand in 24 `canonical:` declarations,
 * ~20 `openGraph.url`s, a dozen JSON-LD `@id`s, and three separate `const BASE`
 * definitions (app/sitemap.ts, components/seo/Breadcrumbs.tsx,
 * app/c/[sym]/layout.tsx). Seventy-nine hardcoded origins in all. One typo in
 * any of them is an indexing bug that nothing catches, because a wrong
 * canonical still renders a perfectly good page.
 *
 * ── On locales ───────────────────────────────────────────────────────────────
 * The locale project is now LIVE, and this file is where its URL rules are
 * enforced. Arabic sits at the site root and English under `/en`; Arabic was
 * deliberately NOT moved to `/ar`, so every URL already in Google's index keeps
 * the address it has.
 *
 * Two rules matter more than the rest, because breaking either is invisible on
 * screen and expensive in the index:
 *
 *   1. EVERY page self-canonicalises to its OWN language's URL. An English page
 *      never canonicalises to the Arabic one just because they share a data
 *      source — that asks Google to drop the English page entirely.
 *   2. An `hreflang` pair is only emitted for routes the registry in
 *      `lib/i18n/routes.ts` says exist in BOTH languages. It is not enough for
 *      the URL to resolve: `/en/news/[slug]` would resolve happily while
 *      serving an Arabic article body, and claiming that as the English
 *      alternate is the exact failure the registry exists to prevent.
 */

import { DEFAULT_LOCALE, hreflangOf, type Locale } from './i18n/locale'
import { localePath } from './i18n/paths'
import { isPaired } from './i18n/routes'

export const SITE = 'https://iraqsm.com'

/** `/market`, `market` and `/market/` all normalise to `/market`; '' and '/' to ''. */
function normalise(path: string): string {
  if (!path || path === '/') return ''
  const withSlash = path.startsWith('/') ? path : `/${path}`
  return withSlash.endsWith('/') ? withSlash.slice(0, -1) : withSlash
}

/**
 * Absolute URL for a route, in a locale.
 *
 * `path` is always the LOCALE-FREE route (`/market`), never a built one
 * (`/en/market`) — the prefix is this function's job. Callers that omit the
 * locale get Arabic, which is what all 134 pre-locale call sites meant, so
 * none of them had to change.
 */
export function absUrl(path: string, locale: Locale = DEFAULT_LOCALE): string {
  return `${SITE}${normalise(localePath(path, locale))}`
}

/**
 * The `alternates` block for a page's metadata: the self-canonical, plus the
 * hreflang set when — and only when — a real pair exists.
 *
 * `x-default` points at the Arabic URL. This is an Iraqi market product whose
 * audience reads Arabic; English is the accommodation, not the neutral default.
 *
 * It stays a function rather than an inline object because the canonical is the
 * single most consequential string a page emits and it should be derived, never
 * typed — eight pages in this repo were self-canonicalising to the wrong URL,
 * and every one of them looked fine on screen.
 */
export function seoAlternates(path: string, locale: Locale = DEFAULT_LOCALE) {
  const canonical = absUrl(path, locale)
  if (!isPaired(path)) return { canonical }
  return {
    canonical,
    languages: {
      [hreflangOf('ar')]: absUrl(path, 'ar'),
      [hreflangOf('en')]: absUrl(path, 'en'),
      'x-default': absUrl(path, 'ar'),
    },
  }
}
