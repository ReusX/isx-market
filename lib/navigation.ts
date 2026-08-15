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
 */

export type NavIcon =
  | 'home' | 'chart' | 'filter' | 'grid' | 'stats' | 'pulse' | 'news'
  | 'briefcase' | 'watchlist' | 'exchange' | 'gold' | 'oil' | 'learn'

export type NavGroup = 'السوق' | 'منصتي' | 'أدوات' | 'تعلّم'

export type NavigationItem = {
  id: string
  label: string
  href: string
  icon: NavIcon
  group: NavGroup
  /** Requires a session. Signed-out users still see it — it is how they learn
   *  the product has it — but it routes through auth rather than pretending. */
  personal?: boolean
}

export const HOME: NavigationItem = {
  id: 'home', label: 'الرئيسية', href: '/', icon: 'home', group: 'السوق',
}

export const navigationItems: NavigationItem[] = [
  { id: 'market',    label: 'حركة السوق',    href: '/market',     icon: 'chart',     group: 'السوق' },
  { id: 'screener',  label: 'فارز الأسهم',   href: '/screener',   icon: 'filter',    group: 'السوق' },
  { id: 'stats',     label: 'الإحصائيات',    href: '/statistics', icon: 'stats',     group: 'السوق' },
  { id: 'heatmap',   label: 'خريطة السوق',   href: '/heatmap',    icon: 'grid',      group: 'السوق' },
  { id: 'pulse',     label: 'نبض السوق',     href: '/pulse',      icon: 'pulse',     group: 'السوق' },
  { id: 'news',      label: 'أخبار السوق',   href: '/news',       icon: 'news',      group: 'السوق' },

  { id: 'portfolio', label: 'محفظتي',        href: '/portfolio',  icon: 'briefcase', group: 'منصتي', personal: true },
  { id: 'watchlist', label: 'قوائم المتابعة', href: '/watchlist',  icon: 'watchlist', group: 'منصتي', personal: true },

  { id: 'fx',        label: 'سعر الصرف',     href: '/fx',         icon: 'exchange',  group: 'أدوات' },
  { id: 'gold',      label: 'سعر الذهب',     href: '/gold',       icon: 'gold',      group: 'أدوات' },
  { id: 'oil',       label: 'سعر النفط',     href: '/oil',        icon: 'oil',       group: 'أدوات' },

  { id: 'learn',     label: 'تعلّم',          href: '/learn',      icon: 'learn',     group: 'تعلّم' },
]

export const navigationGroups: NavGroup[] = ['السوق', 'منصتي', 'أدوات', 'تعلّم']

export function getNavigationGroups() {
  return navigationGroups.map((group) => ({
    group,
    items: navigationItems.filter((item) => item.group === group),
  }))
}

/** Secondary destinations. Footer and mobile sheet, never the rail. */
export const INFO_LINKS = [
  { label: 'من نحن',       href: '/about' },
  { label: 'تواصل معنا',   href: '/contact' },
  { label: 'الخصوصية',     href: '/privacy' },
  { label: 'إشعار قانوني', href: '/legal' },
]

/**
 * Active-route test.
 *
 * `/` matches only itself — without the guard every route is "under" the
 * homepage and the whole rail lights up at once.
 */
export function isActiveHref(href: string, pathname: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}
