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
 * The archived version of this file was written for a locale migration that is
 * now DEFERRED until after the redesign is stable in production. It carried a
 * `Locale` type, an `/en` prefix branch in `absUrl`, an `ENGLISH_LIVE` flag,
 * and a `seoAlternates` that emitted a bidirectional hreflang set once that
 * flag flipped.
 *
 * All of it is gone. Not disabled — gone. A dormant `ENGLISH_LIVE = false` is
 * one boolean away from publishing `/en` canonicals for routes that do not
 * exist, and that is precisely the deploy the deferral exists to prevent. The
 * URL structure this file describes is the production one and nothing else.
 *
 * When the locale project starts, this is the right place to reintroduce it,
 * deliberately, with the routing that makes those URLs real.
 */

export const SITE = 'https://iraqsm.com'

/** `/market`, `market` and `/market/` all normalise to `/market`; '' and '/' to ''. */
function normalise(path: string): string {
  if (!path || path === '/') return ''
  const withSlash = path.startsWith('/') ? path : `/${path}`
  return withSlash.endsWith('/') ? withSlash.slice(0, -1) : withSlash
}

/** Absolute URL for a route. */
export function absUrl(path: string): string {
  return `${SITE}${normalise(path)}`
}

/**
 * The `alternates` block for a page's metadata.
 *
 * One key today. It stays a function rather than an inline object because the
 * canonical is the single most consequential string a page emits and it should
 * be derived, never typed — eight pages in this repo were self-canonicalising
 * to the wrong URL, and every one of them looked fine on screen.
 */
export function seoAlternates(path: string) {
  return { canonical: absUrl(path) }
}
