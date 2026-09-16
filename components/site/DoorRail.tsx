'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLocale } from '@/context/LocaleContext'
import { splitLocale } from '@/lib/i18n/paths'
import { NavIcon } from './SiteNav'

/**
 * Navigation WITHIN a product section — the pages of the active door.
 *
 * The top navigation is the product navigation (the four doors); this is
 * the only other navigation on the page, and it never repeats itself in
 * the content. Three shapes, one list:
 *
 *   ≥ 1280px  a 260px sidebar on the start side, sticky under the top nav;
 *             the active page a warm-white filled pill, the rest text rows.
 *   < 1280px  the sidebar leaves the grid and becomes one horizontally
 *             scrollable row above the content — never squeezed beside it.
 *   < 720px   out of the flow entirely: a «القسم» control opens the list.
 */
export type RailItem = { label: string; route: string }

export function DoorRail({ door, items }: { door: 'markets' | 'banking' | 'economy' | 'learn'; items: RailItem[] }) {
  const { t, href: L } = useLocale()
  const { route } = splitLocale(usePathname() ?? '/')
  const name = t.home.landing.doors[door].name
  const isOn = (it: RailItem) => route === it.route || route.startsWith(`${it.route}/`)
  const current = items.find(isOn)

  const list = (
    <nav className="iqr-list">
      {items.map((it) => (
        <Link key={it.route} href={L(it.route)} className="iqr-item" aria-current={isOn(it) ? 'page' : undefined}>{it.label}</Link>
      ))}
    </nav>
  )

  return (
    <>
      <aside className="iqr" aria-label={name}>
        <p className="iqr-door"><NavIcon name={door} />{name}</p>
        {list}
      </aside>
      {/* Phone: the same list behind a «القسم» control. Native <details>, so
          it needs no script and closes on navigation like any link. */}
      <details className="iqr-sheet">
        <summary className="iqr-toggle" aria-label={t.site.section}>
          <span className="iqr-toggle-k">{t.site.section}</span>
          <span className="iqr-toggle-v">{current?.label ?? name}</span>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
        </summary>
        {list}
      </details>
    </>
  )
}
