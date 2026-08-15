'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getNavigationGroups, HOME, isActiveHref, type NavIcon } from '@/lib/navigation'

/**
 * The desktop rail.
 *
 * Active state is carried by a bar, a weight change AND a colour — never
 * colour alone, so it survives greyscale and a colour-blind reader.
 *
 * Collapsed, the labels go but the icons keep their accessible names via
 * `title` + the visually-hidden label, because an icon-only rail with no names
 * is a memory test.
 */

const PATHS: Record<NavIcon, string> = {
  home: 'M3 11l9-8 9 8 M5 10v11h14V10',
  chart: 'M3 3v18h18 M7 15l4-5 3 3 5-7',
  filter: 'M3 5h18 M7 12h10 M10 19h4',
  grid: 'M3 3h8v8H3z M13 3h8v5h-8z M13 10h8v11h-8z M3 13h8v8H3z',
  stats: 'M4 20V10 M10 20V4 M16 20v-7 M22 20H2',
  pulse: 'M3 12h4l3-8 4 16 3-8h4',
  news: 'M4 4h16v16H4z M8 8h8 M8 12h8 M8 16h5',
  briefcase: 'M3 8h18v12H3z M9 8V5h6v3',
  watchlist: 'M4 5h16 M4 12h16 M4 19h10',
  exchange: 'M4 8h13l-3-3 M20 16H7l3 3',
  gold: 'M4 18h16 M6 18V9l6-4 6 4v9',
  oil: 'M7 21V9l5-6 5 6v12 M10 13h4',
  learn: 'M3 7l9-4 9 4-9 4z M7 11v5c0 1.5 2.5 3 5 3s5-1.5 5-3v-5',
}

function NavIconGlyph({ icon }: { icon: NavIcon }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[icon]} />
    </svg>
  )
}

export function SideNav({
  collapsed,
  onToggle,
}: {
  collapsed: boolean
  onToggle: () => void
}) {
  const pathname = usePathname() ?? '/'
  const groups = getNavigationGroups()

  function Row({ href, label, icon }: { href: string; label: string; icon: NavIcon }) {
    const active = isActiveHref(href, pathname)
    return (
      <Link
        href={href}
        className={`sn-link ${active ? 'is-on' : ''}`.trim()}
        aria-current={active ? 'page' : undefined}
        title={collapsed ? label : undefined}
      >
        {active ? <em aria-hidden="true" /> : null}
        <NavIconGlyph icon={icon} />
        <span className={collapsed ? 'sr-only' : 'sn-label'}>{label}</span>
      </Link>
    )
  }

  return (
    <aside className="sn" aria-label="التنقل الرئيسي">
      <div className="sn-head">
        <Link href="/" className="sn-brand" aria-label="IQWealth · الرئيسية">
          <span className="sn-mark" aria-hidden="true">IQ</span>
          <span className={collapsed ? 'sr-only' : 'sn-brand-name'}>IQWealth</span>
        </Link>
        <button
          type="button"
          className="sn-toggle"
          onClick={onToggle}
          aria-label={collapsed ? 'توسيع القائمة الجانبية' : 'طي القائمة الجانبية'}
          aria-expanded={!collapsed}
        >
          <span aria-hidden="true">{collapsed ? '«' : '»'}</span>
        </button>
      </div>

      <nav className="sn-scroll">
        <Row href={HOME.href} label={HOME.label} icon={HOME.icon} />
        {groups.map(({ group, items }) => (
          <section className="sn-group" key={group} aria-label={group}>
            <h2 className={collapsed ? 'sr-only' : undefined}>{group}</h2>
            {items.map((item) => (
              <Row key={item.id} href={item.href} label={item.label} icon={item.icon} />
            ))}
          </section>
        ))}
      </nav>
    </aside>
  )
}
