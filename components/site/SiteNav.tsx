'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { StarMark } from '@/components/brand/StarMark'
import { LanguageSwitch } from '@/components/shell/LanguageSwitch'
import { ThemeToggle } from '@/components/shell/ThemeToggle'
import { useApp } from '@/context/AppContext'
import { useLocale } from '@/context/LocaleContext'
import { splitLocale } from '@/lib/i18n/paths'

/**
 * The site navigation of the redesign · the four doors as pills.
 *
 * One component, two surfaces. On the homepage hero (`on="hero"`) the pills
 * are white on blue; on every other page (`on="page"`) they sit on the cream
 * and carry a hairline. The door that owns the current route is marked.
 *
 * The four doors are the whole top level. Anything a reader can reach is
 * behind one of them, so there is no second row, no "more", no sidebar.
 */
export const DOORS = [
  { id: 'markets', route: '/',        owns: ['/', '/market', '/companies', '/c/', '/screener', '/heatmap', '/statistics', '/pulse', '/portfolio', '/watchlist', '/alerts', '/analysis'] },
  { id: 'banking', route: '/banks',   owns: ['/banks'] },
  { id: 'economy', route: '/fx',      owns: ['/fx', '/gold', '/oil', '/silver', '/currencies', '/cbi-window'] },
  { id: 'learn',   route: '/learn',   owns: ['/learn', '/news', '/research'] },
] as const

const ICON: Record<string, React.ReactNode> = {
  markets: <path d="M3 17l5-6 4 4 5-7 4 3" />,
  banking: <><path d="M3 10h18M5 10v8M9 10v8M15 10v8M19 10v8M3 18h18" /><path d="M12 3l9 7H3z" /></>,
  economy: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></>,
  learn: <><path d="M4 5h6a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H4z" /><path d="M20 5h-6a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h7z" /></>,
  login: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
}
export function NavIcon({ name }: { name: keyof typeof ICON }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICON[name]}
    </svg>
  )
}

export function SiteNav({ on = 'page' }: { on?: 'hero' | 'page' }) {
  const { t, href: L } = useLocale()
  const { user } = useApp()
  const { route } = splitLocale(usePathname() ?? '/')
  const [open, setOpen] = useState(false)
  const doors = t.home.landing.doors
  const current = DOORS.find((d) => d.owns.some((o) => o === '/' ? route === '/' : route === o || route.startsWith(o.endsWith('/') ? o : `${o}/`)))?.id

  return (
    <header className={`iqn is-${on} ${open ? 'is-open' : ''}`.trim()}>
      <Link href={L('/')} className="iqn-logo" aria-label={t.site.brandHome} onClick={() => setOpen(false)}>
        <StarMark size={22} color="currentColor" />
        <span>IQWealth</span>
      </Link>

      <nav className="iqn-doors" aria-label={t.site.menu}>
        {DOORS.map((d) => (
          <Link key={d.id} href={L(d.route)} className="iqn-pill" aria-current={current === d.id ? 'page' : undefined} onClick={() => setOpen(false)}>
            <NavIcon name={d.id} />{doors[d.id].name}
          </Link>
        ))}
      </nav>

      <div className="iqn-tools">
        <LanguageSwitch />
        <ThemeToggle className="iqn-pill is-icon" />
        {user
          ? <Link href={L('/profile')} className="iqn-pill is-strong" aria-label={t.site.account}><NavIcon name="login" /><span className="iqn-hide-sm">{t.site.account}</span></Link>
          : <Link href={L('/login')} className="iqn-pill is-strong"><NavIcon name="login" /><span className="iqn-hide-sm">{t.site.signIn}</span></Link>}
        <button type="button" className="iqn-pill is-icon iqn-burger" aria-expanded={open} aria-label={open ? t.site.close : t.site.menu} onClick={() => setOpen((v) => !v)}>
          <NavIcon name={open ? 'close' : 'menu'} />
        </button>
      </div>
    </header>
  )
}
