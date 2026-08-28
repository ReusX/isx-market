import type { Locale } from './locale'

/**
 * The bilingual route registry — which URLs exist in which language, and which
 * deliberately do not.
 *
 * This is the single table behind four things that must never disagree: the
 * language switcher's destination, the `hreflang` pair a page emits, the
 * sitemap, and the completeness gate. When they disagree you get the two
 * classic bilingual failures — a switcher that dumps everyone on the homepage,
 * and an `hreflang="en"` pointing at a page whose body is Arabic.
 *
 * ── The four classes, from the brief ──────────────────────────────────────
 *  MIRROR   a real English equivalent exists. Reciprocal hreflang, both URLs
 *           in the sitemap.
 *  CHROME   English UI around source content that stays Arabic (`/news`). Still
 *           a true equivalent of the Arabic page — the page IS the index, and
 *           its own copy is translated — so it keeps hreflang.
 *  PRIVATE  mirrored for usability, `noindex` in both languages. Auth and
 *           personal routes. English here is so a signed-in English reader can
 *           use the product, NOT a search surface.
 *  AR_ONLY  no English URL is generated at all. Two different reasons, both
 *           recorded per entry below.
 */

export type RouteClass = 'mirror' | 'chrome' | 'private' | 'ar-only'

export type RouteEntry = {
  /** Pattern with Next-style dynamic segments, e.g. `/c/[sym]`. */
  pattern: string
  cls: RouteClass
  /** Why an ar-only route is ar-only. Required for that class, so the decision
   *  is written down beside the route rather than in a commit message. */
  why?: string
}

export const ROUTES: RouteEntry[] = [
  // ── Market & data ───────────────────────────────────────────────────────
  { pattern: '/',                          cls: 'mirror' },
  { pattern: '/market',                    cls: 'mirror' },
  { pattern: '/companies',                 cls: 'mirror' },
  { pattern: '/screener',                  cls: 'mirror' },
  { pattern: '/heatmap',                   cls: 'mirror' },
  { pattern: '/pulse',                     cls: 'mirror' },
  { pattern: '/statistics',                cls: 'mirror' },
  { pattern: '/statistics/foreign-flow',   cls: 'mirror' },
  { pattern: '/statistics/ownership',      cls: 'mirror' },
  { pattern: '/statistics/shareholders',   cls: 'mirror' },
  { pattern: '/c/[sym]',                   cls: 'mirror' },
  { pattern: '/c/[sym]/financials',        cls: 'mirror' },

  // ── Rates tools ─────────────────────────────────────────────────────────
  { pattern: '/fx',                        cls: 'mirror' },
  { pattern: '/gold',                      cls: 'mirror' },
  { pattern: '/oil',                       cls: 'mirror' },

  // ── Editorial ───────────────────────────────────────────────────────────
  { pattern: '/news',                      cls: 'chrome' },
  {
    pattern: '/news/[slug]',
    cls: 'ar-only',
    why: 'The CMS holds one Arabic body per article and no English translation. '
       + 'Serving that same Arabic body at /en/news/[slug] would manufacture a '
       + 'duplicate URL and an hreflang="en" that lies about its language.',
  },
  { pattern: '/learn',                     cls: 'mirror' },
  { pattern: '/learn/trading-from-zero',   cls: 'mirror' },
  {
    pattern: '/learn/[slug]',
    cls: 'ar-only',
    why: 'Same as /news/[slug] — CMS-authored Arabic with no English translation. '
       + 'The hand-authored guide at /learn/trading-from-zero is translated and '
       + 'IS mirrored, because that copy lives in this repo.',
  },

  // ── Info & legal ────────────────────────────────────────────────────────
  { pattern: '/about',                     cls: 'mirror' },
  { pattern: '/contact',                   cls: 'mirror' },
  { pattern: '/privacy',                   cls: 'mirror' },
  { pattern: '/legal',                     cls: 'mirror' },

  // ── Personal & auth · usability mirrors, never search surfaces ──────────
  { pattern: '/portfolio',                 cls: 'private' },
  { pattern: '/watchlist',                 cls: 'private' },
  { pattern: '/profile',                   cls: 'private' },
  { pattern: '/login',                     cls: 'private' },
  { pattern: '/signup',                    cls: 'private' },
  { pattern: '/verify-email',              cls: 'private' },
  { pattern: '/forgot-password',           cls: 'private' },
  { pattern: '/auth/reset',                cls: 'private' },

  // ── Arabic-only, by decision ────────────────────────────────────────────
  {
    pattern: '/auth/callback',
    cls: 'ar-only',
    why: 'Not a page. It is the OAuth/e-mail return handler and renders no copy '
       + 'worth translating; the locale a user came from is carried on the '
       + 'redirect target instead.',
  },
  /* `/companies` is NOT here. It is a real Arabic landing page — Google
     indexes it as «الشركات المدرجة في بورصة العراق · 104 شركة حسب القطاع» —
     and it is the only crawlable path to /c/[sym], because every price table
     on the site fetches its rows in the browser. It is a `mirror` pair now,
     so /en/companies gives the English company pages the crawlable parent
     they never had. */
  ...(['/banks', '/charts', '/analysis', '/analysis/[sym]', '/research', '/research/[slug]', '/alerts']
    .map((pattern): RouteEntry => ({
      pattern,
      cls: 'ar-only',
      why: 'Pre-redesign or compatibility route, absent from the redesigned '
         + 'navigation and open under the route-retirement matrix '
         + '(docs/REMOVED_ROUTE_RETIREMENT.md). Minting an English twin of a '
         + 'route that may be retired creates a second URL to retire.',
    }))),
  {
    pattern: '/dev/foundation',
    cls: 'ar-only',
    why: 'Internal token/component reference. Not a product surface.',
  },
]

const BY_PATTERN = new Map(ROUTES.map((r) => [r.pattern, r]))

/** Turn a concrete path into its registry pattern: `/c/BBOB` → `/c/[sym]`. */
export function patternOf(path: string): string | null {
  if (BY_PATTERN.has(path)) return path
  const parts = path.split('/').filter(Boolean)
  for (const { pattern } of ROUTES) {
    const pp = pattern.split('/').filter(Boolean)
    if (pp.length !== parts.length) continue
    const hit = pp.every((seg, i) => (seg.startsWith('[') && seg.endsWith(']')) || seg === parts[i])
    if (hit) return pattern
  }
  return null
}

export function routeClass(path: string): RouteClass | null {
  const p = patternOf(path)
  return p ? BY_PATTERN.get(p)!.cls : null
}

/** Does this exact path exist in `locale`? */
export function existsIn(path: string, locale: Locale): boolean {
  const cls = routeClass(path)
  if (cls === null) return false
  return locale === 'ar' ? true : cls !== 'ar-only'
}

/** Indexable in both languages, i.e. eligible for a reciprocal hreflang pair. */
export function isPaired(path: string): boolean {
  const cls = routeClass(path)
  return cls === 'mirror' || cls === 'chrome'
}

/** Search-visible at all. `private` routes are mirrored but never indexed. */
export function isIndexable(path: string): boolean {
  const cls = routeClass(path)
  return cls === 'mirror' || cls === 'chrome' || cls === 'ar-only'
}
