'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLocale } from '@/context/LocaleContext'
import { splitLocale } from '@/lib/i18n/paths'
import { NavIcon } from './SiteNav'

/**
 * A door's own pages, as a sidebar.
 *
 * Every page inside a door wears this on its start side: the door's name
 * at the top, then its pages, the current one filled. On a phone it turns
 * into a row of pills above the content, so the same list serves both.
 */
export type RailItem = { label: string; route: string }

export function DoorRail({ door, items }: { door: 'markets' | 'banking' | 'economy' | 'learn'; items: RailItem[] }) {
  const { t, href: L } = useLocale()
  const { route } = splitLocale(usePathname() ?? '/')
  const name = t.home.landing.doors[door].name
  return (
    <aside className="iqr" aria-label={name}>
      <p className="iqr-door"><NavIcon name={door} />{name}</p>
      <nav className="iqr-list">
        {items.map((it) => {
          const on = route === it.route || route.startsWith(`${it.route}/`)
          return <Link key={it.route} href={L(it.route)} className="iqr-item" aria-current={on ? 'page' : undefined}>{it.label}</Link>
        })}
      </nav>
    </aside>
  )
}
