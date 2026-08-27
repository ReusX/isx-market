'use client'

import Link from 'next/link'
import { getNavigationGroups, INFO_LINKS } from '@/lib/navigation'
import { useLocale } from '@/context/LocaleContext'

/**
 * The footer.
 *
 * Restrained by design: the navigation groups it already has, one «الموقع»
 * column for the secondary destinations, and ONE disclaimer sentence.
 *
 * The disclaimer lives here and at `/legal`, and nowhere else. A fourth alarm
 * box on every page trains people to stop reading alarm boxes.
 *
 * Its links come from `lib/navigation.ts`, the same source as the rail — the
 * old footer declared its own copy, which is how a route ends up in one and
 * not the other.
 */
export function SiteFooter() {
  const groups = getNavigationGroups()
  const { t, href: L } = useLocale()

  return (
    <footer className="ft">
      <div className="ft-top">
        <div className="ft-brand">
          <strong>IQWealth</strong>
          <p>{t.shell.footer.blurb}</p>
        </div>

        {groups.map(({ group, items }) => (
          <nav className="ft-col" key={group} aria-label={t.nav.groups[group]}>
            <h2>{t.nav.groups[group]}</h2>
            <ul>
              {items.map((item) => (
                <li key={item.id}><Link href={L(item.href)}>{t.nav[item.id]}</Link></li>
              ))}
            </ul>
          </nav>
        ))}

        <nav className="ft-col" aria-label={t.nav.info.heading}>
          <h2>{t.nav.info.heading}</h2>
          <ul>
            {INFO_LINKS.map((l) => (
              <li key={l.href}><Link href={L(l.href)}>{t.nav.info[l.id]}</Link></li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="ft-bottom">
        <span>© {new Date().getFullYear()} IQWealth</span>
        <span>{t.shell.footer.disclaimer}</span>
      </div>
    </footer>
  )
}
