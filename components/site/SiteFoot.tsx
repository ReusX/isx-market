'use client'

import Link from 'next/link'
import { StarMark } from '@/components/brand/StarMark'
import { useLocale } from '@/context/LocaleContext'
import { DOORS } from './SiteNav'
import { existsIn } from '@/lib/i18n/routes'

/**
 * The foot of every rebuilt page: the mark, the four doors, a link map of
 * every main page grouped by door, the small print.
 *
 * The map is not decoration. The old shell's sidebar linked every main page
 * from every page; the new rail links only the active door's pages, so
 * without this a crawler on /fx would find no path to /news or /portfolio.
 */
const MAP = {
  markets: ['/', '/market', '/companies', '/screener', '/heatmap', '/statistics', '/statistics/foreign-flow', '/statistics/ownership', '/statistics/shareholders', '/pulse'],
  banking: ['/banks', '/banks/deposits', '/banks/loans'],
  economy: ['/fx', '/gold', '/silver', '/oil'],
  learn: ['/learn', '/news', '/research'],
  tools: ['/portfolio', '/watchlist', '/alerts'],
} as const
export function SiteFoot() {
  const { t, locale, href: L } = useLocale()
  const doors = t.home.landing.doors
  return (
    <footer className="iqf id-full">
      <div className="iqf-row">
        <Link href={L('/')} className="iqf-brand" aria-label={t.site.brandHome}><StarMark size={20} /><span>IQWealth</span></Link>
        <nav className="iqf-doors" aria-label={t.site.menu}>
          {DOORS.map((d) => <Link key={d.id} href={L(d.route)}>{doors[d.id].name}</Link>)}
        </nav>
      </div>
      <nav className="iqf-map" aria-label={t.site.sitemap}>
        {(Object.keys(MAP) as (keyof typeof MAP)[]).map((k) => (
          <div key={k} className="iqf-col">
            <p className="iqf-col-h">{k === 'tools' ? t.site.tools : doors[k].name}</p>
            {MAP[k].map((r) => {
              const label = t.site.pages[r as keyof typeof t.site.pages]
              /* Arabic-only pages get no link from the English foot. */
              if (!label || !existsIn(r, locale)) return null
              return <Link key={r} href={L(r)}>{label}</Link>
            })}
          </div>
        ))}
      </nav>
      <p className="iqf-note">{t.site.footNote}</p>
      <div className="iqf-row iqf-small">
        <span>{t.site.rights(String(new Date().getFullYear()))}</span>
        <nav aria-label={t.site.legal}>
          <Link href={L('/about')}>{t.site.about}</Link>
          <Link href={L('/contact')}>{t.site.contact}</Link>
          <Link href={L('/privacy')}>{t.site.privacy}</Link>
          <Link href={L('/legal')}>{t.site.legal}</Link>
        </nav>
      </div>
    </footer>
  )
}
