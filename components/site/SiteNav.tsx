'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { StarMark } from '@/components/brand/StarMark'
import { LanguageSwitch } from './LanguageSwitch'
import { ThemeToggle } from './ThemeToggle'
import { useApp } from '@/context/AppContext'
import { useLocale } from '@/context/LocaleContext'
import { splitLocale } from '@/lib/i18n/paths'

/**
 * The site navigation (identity v3) · the four doors as one segmented
 * control, drawn like the board's dark/light switch: an outlined pill whose
 * current door is filled. On phones the doors move to a bottom tab bar, as
 * on board 2, page 8. The door that owns the current route is marked.
 *
 * The four doors are the whole top level. Anything a reader can reach is
 * behind one of them, so there is no second row and no "more"; the pages of a door are its rail.
 */
export const DOORS = [
  { id: 'markets', route: '/',        owns: ['/', '/market', '/companies', '/c/', '/screener', '/heatmap', '/statistics', '/pulse', '/portfolio', '/watchlist', '/alerts'] },
  { id: 'banking', route: '/banks',   owns: ['/banks'] },
  { id: 'economy', route: '/fx',      owns: ['/fx', '/gold', '/oil', '/silver', '/currencies', '/cbi-window'] },
  /* Learn is «قريباً» for now: the pill stays so the four doors read as the
     product, but it is not a link. /news still lives under it. */
  { id: 'learn',   route: '/learn',   owns: ['/learn', '/news', '/research'] },
] as const

const ICON: Record<string, React.ReactNode> = {
  markets: <path d="M3 17l5-6 4 4 5-7 4 3" />,
  banking: <><path d="M3 10h18M5 10v8M9 10v8M15 10v8M19 10v8M3 18h18" /><path d="M12 3l9 7H3z" /></>,
  economy: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></>,
  learn: <><path d="M4 5h6a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H4z" /><path d="M20 5h-6a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h7z" /></>,
  login: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
}
export function NavIcon({ name }: { name: keyof typeof ICON }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICON[name]}
    </svg>
  )
}

export function SiteNav({ on = 'page' }: { on?: 'page' }) {
  const { t, href: L } = useLocale()
  const { user } = useApp()
  const { route } = splitLocale(usePathname() ?? '/')
  const doors = t.home.landing.doors
  const current = DOORS.find((d) => d.owns.some((o) => o === '/' ? route === '/' : route === o || route.startsWith(o.endsWith('/') ? o : `${o}/`)))?.id
  const me = route === '/profile' || route === '/login'

  return (
    <>
      <header className={`iqn is-${on}`}>
        <Link href={L('/')} className="iqn-logo" aria-label={t.site.brandHome}>
          <StarMark size={20} color="currentColor" />
          <span>IQWealth</span>
        </Link>

        <nav className="iqn-doors" aria-label={t.site.menu}>
          {DOORS.map((d) => (
            <Link key={d.id} href={L(d.route)} className="iqn-door" aria-current={current === d.id ? 'page' : undefined}>
              <NavIcon name={d.id} />{doors[d.id].name}
            </Link>
          ))}
        </nav>

        <div className="iqn-tools">
          <LanguageSwitch />
          <ThemeToggle className="iqn-pill is-icon" />
          {user
            ? <Link href={L('/profile')} className="iqn-pill iqn-me" aria-label={t.site.account}><NavIcon name="login" /><span>{t.site.account}</span></Link>
            : <Link href={L('/login')} className="iqn-pill iqn-me"><NavIcon name="login" /><span>{t.site.signIn}</span></Link>}
        </div>
      </header>

      {/* Phone (board 2, page 8): the doors leave the top bar for a tab bar
          at the thumb. The same links, so a crawler sees one navigation. */}
      <nav className="iqn-tabs" aria-label={t.site.menu}>
        {DOORS.map((d) => (
          <Link key={d.id} href={L(d.route)} className="iqn-tab" aria-current={current === d.id ? 'page' : undefined}>
            <NavIcon name={d.id} /><span>{t.site.tabs[d.id]}</span>
          </Link>
        ))}
        <Link href={L(user ? '/profile' : '/login')} className="iqn-tab" aria-current={me ? 'page' : undefined}>
          <NavIcon name="login" /><span>{user ? t.site.account : t.site.signIn}</span>
        </Link>
      </nav>
    </>
  )
}
