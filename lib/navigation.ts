/**
 * The redesigned information architecture — one definition, used by the
 * sidebar, the mobile sheet and the footer.
 *
 * Before this, navigation was declared inline in `components/layout/AppShell.tsx`
 * and again in `components/layout/SiteFooter.tsx`, which is how a route ends up
 * present in one and missing from the other.
 *
 * ── Routes deliberately ABSENT, and why ───────────────────────────────────
 * None of these is deleted in production. They are absent from the redesigned
 * navigation, which is a different decision from deletion and is recorded as
 * such in DESIGN_DECISION_LOG.md.
 *
 *   دليل الشركات (/companies)  re-listed companies that global search, حركة
 *                              السوق, فارز الأسهم and the sector surfaces
 *                              already reach. A route must earn its existence.
 *                              ⚠ It is also the target of two live 301s.
 *   /banks                     the same list, filtered.
 *   تنبيهات الأسعار (/alerts)  owner's decision. Out of the redesign and out
 *                              of the planned authenticated scope. Nothing
 *                              replaces it. The production route stays live
 *                              but UNLINKED as a compatibility surface.
 *   /research                  a second CMS feed with no distinct job beside
 *                              /news.
 *   /charts                    cancelled. Its job splits between the company
 *                              chart and the expanded index chart, both
 *                              reached from where the data already is.
 *   /analysis                  its removal is still OPEN under the route
 *                              migration matrix, so it is not exposed here
 *                              either way.
 *
 * Privacy and Legal are footer destinations by design, not sidebar items.
 *
 * ── Structure here, WORDS in the dictionary ───────────────────────────────
 * This file used to carry the Arabic labels inline. It no longer carries any
 * labels at all: an item is an id, an href and a place in the tree, and its
 * name comes from the per-locale `nav` dictionary, keyed by that id. A label that
 * exists in one language only is a route that vanishes when you switch, and
 * inline strings here made that the default outcome rather than a mistake.
 *
 * `href` is the LOCALE-FREE route. The shell prefixes it via `useLocale().href`.
 */

export type NavIcon =
  | 'home' | 'chart' | 'filter' | 'grid' | 'stats' | 'pulse' | 'news'
  | 'briefcase' | 'watchlist' | 'exchange' | 'gold' | 'oil' | 'learn'

/** Group ids. The visible heading for each is `t.nav.groups[id]`. */
export type NavGroup = 'market' | 'personal' | 'tools' | 'learn'

/** Item ids. Each is a key of `t.nav`. */
export type NavId =
  | 'home' | 'market' | 'screener' | 'stats' | 'heatmap' | 'pulse' | 'news'
  | 'portfolio' | 'watchlist' | 'fx' | 'gold' | 'oil' | 'learn'

export type NavigationItem = {
  id: NavId
  /** Locale-free route. */
  href: string
  icon: NavIcon
  group: NavGroup
  /** Requires a session. Signed-out users still see it — it is how they learn
   *  the product has it — but it routes through auth rather than pretending. */
  personal?: boolean
}

export const HOME: NavigationItem = { id: 'home', href: '/', icon: 'home', group: 'market' }

export const navigationItems: NavigationItem[] = [
  { id: 'market',    href: '/market',     icon: 'chart',     group: 'market' },
  { id: 'screener',  href: '/screener',   icon: 'filter',    group: 'market' },
  { id: 'stats',     href: '/statistics', icon: 'stats',     group: 'market' },
  { id: 'heatmap',   href: '/heatmap',    icon: 'grid',      group: 'market' },
  { id: 'pulse',     href: '/pulse',      icon: 'pulse',     group: 'market' },
  { id: 'news',      href: '/news',       icon: 'news',      group: 'market' },

  { id: 'portfolio', href: '/portfolio',  icon: 'briefcase', group: 'personal', personal: true },
  { id: 'watchlist', href: '/watchlist',  icon: 'watchlist', group: 'personal', personal: true },

  { id: 'fx',        href: '/fx',         icon: 'exchange',  group: 'tools' },
  { id: 'gold',      href: '/gold',       icon: 'gold',      group: 'tools' },
  { id: 'oil',       href: '/oil',        icon: 'oil',       group: 'tools' },

  { id: 'learn',     href: '/learn',      icon: 'learn',     group: 'learn' },
]

export const navigationGroups: NavGroup[] = ['market', 'personal', 'tools', 'learn']

export function getNavigationGroups() {
  return navigationGroups.map((group) => ({
    group,
    items: navigationItems.filter((item) => item.group === group),
  }))
}

/** Secondary destinations. Footer and mobile sheet, never the rail. */
export type InfoId = 'about' | 'contact' | 'privacy' | 'legal'
export const INFO_LINKS: { id: InfoId; href: string }[] = [
  { id: 'about',   href: '/about' },
  { id: 'contact', href: '/contact' },
  { id: 'privacy', href: '/privacy' },
  { id: 'legal',   href: '/legal' },
]

/**
 * Active-route test, run against the LOCALE-FREE route.
 *
 * `/` matches only itself — without the guard every route is "under" the
 * homepage and the whole rail lights up at once. Comparing locale-free routes
 * is what makes `/en/market` light up the Market row: comparing raw pathnames
 * would have matched nothing at all on the English side.
 */
export function isActiveHref(href: string, route: string): boolean {
  if (href === '/') return route === '/'
  return route === href || route.startsWith(`${href}/`)
}
