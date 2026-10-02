'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { StarMark } from '@/components/brand/StarMark'
import { LanguageSwitch } from './LanguageSwitch'
import { ThemeToggle } from './ThemeToggle'
import { InkIcon } from './InkIcon'
import { useApp } from '@/context/AppContext'
import { useLocale } from '@/context/LocaleContext'
import { splitLocale } from '@/lib/i18n/paths'
import { usePro } from '@/lib/proClient'

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
  { id: 'markets', route: '/',        owns: ['/', '/market', '/companies', '/c/', '/screener', '/heatmap', '/statistics', '/pulse', '/news/session', '/portfolio', '/watchlist', '/alerts'] },
  { id: 'banking', route: '/banks',   owns: ['/banks'] },
  { id: 'economy', route: '/fx',      owns: ['/fx', '/gold', '/oil', '/silver', '/currencies', '/cbi-window'] },
  /* Learn is «قريباً» for now: the pill stays so the four doors read as the
     product, but it is not a link. /news still lives under it. */
  { id: 'learn',   route: '/learn',   owns: ['/learn', '/news', '/research'] },
] as const

const ICON = { markets: 'door-markets', banking: 'door-banking', economy: 'door-economy', learn: 'door-learn', login: 'account' } as const
export function NavIcon({ name }: { name: keyof typeof ICON }) {
  return <InkIcon name={ICON[name]} size={18} />
}

export function SiteNav({ on = 'page' }: { on?: 'page' }) {
  const { t, href: L } = useLocale()
  const { user } = useApp()
  const { route } = splitLocale(usePathname() ?? '/')
  const doors = t.home.landing.doors
  const current = DOORS.find((d) => d.owns.some((o) => o === '/' ? route === '/' : route === o || route.startsWith(o.endsWith('/') ? o : `${o}/`)))?.id
  const me = route === '/profile' || route === '/login'
  /* «جرّب برو» beside the account, until the reader holds a pass. */
  const pro = usePro({ signedInOnly: true })

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
          {pro.until ? (
            <Link href={L('/pro')} className="iqn-pill iqn-pro is-member">{t.pro.navMember}</Link>
          ) : (
            <Link href={L('/pro')} className="iqn-pill iqn-pro" aria-current={route === '/pro' ? 'page' : undefined}>{t.pro.navTry}</Link>
          )}
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
