'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { SideNav } from './SideNav'
import { GlobalHeader } from './GlobalHeader'
import { GlobalSearch } from './GlobalSearch'
import { MobileNav } from './MobileNav'
import { SiteFooter } from './SiteFooter'
import { ToastProvider } from '@/components/system/Toast'
import { useApp } from '@/context/AppContext'

const SIDEBAR_KEY = 'iqwealth-sidebar-collapsed'

/**
 * The application frame — rail, header, search, mobile sheet, footer.
 *
 * ══ COEXISTENCE, WHICH IS THE WHOLE POINT OF THIS PHASE ═══════════════════
 * This frame ships BEFORE any route body is migrated, so from this commit
 * until the last route is done it wraps un-migrated pages. That is intentional
 * and it works because of a clean split:
 *
 *   the FRAME    is redesigned. `.iq-shell` and its children consume the
 *                `--mv-*` tokens from styles/design-tokens.css.
 *   the CONTENT  is untouched. `<main>` renders each route exactly as before,
 *                still styled by the legacy `app/globals.css`.
 *
 * Neither reaches the other. The token layer is scoped to `.iq-page`, which no
 * un-migrated route carries, so nothing here restyles them; and the legacy
 * bare-element rules that DO reach in are neutralised by the containment block
 * for migrated areas only.
 *
 * A route migrates by adding `.iq-page` to its own root and deleting its
 * section of the legacy stylesheet. No page ever has two headers, because the
 * frame is mounted once here and no route body renders navigation of its own —
 * verified across the representative set before this landed.
 *
 * The old `components/layout/AppShell.tsx` is REPLACED, not left beside this.
 * Two shells is how you get two sidebars.
 */

/**
 * Routes that render without the frame.
 *
 * A signed-out visitor on an auth screen must not be looking at a rail full of
 * «محفظتي» and «قوائم المتابعة» — it advertises an authenticated product to
 * someone who cannot use it, and it competes with the one task on screen.
 *
 * ⚠ 404 and 500 are deliberately NOT here. A failed route whose whole job is
 * "where can I go instead?" should not also take away the answer.
 */
const BARE_ROUTES = ['/auth']

export default function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '/'
  const { user } = useApp()
  const bare = BARE_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`))

  const [collapsed, setCollapsed] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(max-width: 720px)').matches) { setCollapsed(true); return }
    const saved = window.localStorage.getItem(SIDEBAR_KEY)
    setCollapsed(saved === 'true')
  }, [])

  const toggleSidebar = useCallback(() => {
    setCollapsed((c) => {
      const next = !c
      window.localStorage.setItem(SIDEBAR_KEY, String(next))
      return next
    })
  }, [])

  /**
   * The menu button does two different things at two widths, and conflating
   * them was the original mobile-navigation bug: on a phone it opens the
   * sheet, on a desktop it collapses the rail. One handler, one check.
   */
  const onMenu = useCallback(() => {
    if (window.matchMedia('(max-width: 720px)').matches) setNavOpen(true)
    else toggleSidebar()
  }, [toggleSidebar])

  const openSearch = useCallback(() => setSearchOpen(true), [])

  if (bare) return <ToastProvider>{children}</ToastProvider>

  return (
    <ToastProvider>
      <div className={`iq-shell ${collapsed ? 'is-collapsed' : ''}`.trim()}>
        <SideNav collapsed={collapsed} onToggle={toggleSidebar} />
        <div className="iq-stage">
          <GlobalHeader onMenu={onMenu} onSearchOpen={openSearch} />
          {/* Un-migrated route bodies render here untouched. */}
          <main id="main" className="iq-main">{children}</main>
          <SiteFooter />
        </div>
      </div>

      <MobileNav
        open={navOpen}
        onClose={() => setNavOpen(false)}
        signedIn={Boolean(user)}
        onSearch={openSearch}
      />
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </ToastProvider>
  )
}
