import Link from 'next/link'
import { getNavigationGroups, INFO_LINKS } from '@/lib/navigation'

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

  return (
    <footer className="ft">
      <div className="ft-top">
        <div className="ft-brand">
          <strong>IQWealth</strong>
          <p>منصّة مجانية للمستثمر العراقي · بيانات يومية من المصادر الرسمية، تحليل، وأدوات بحث.</p>
        </div>

        {groups.map(({ group, items }) => (
          <nav className="ft-col" key={group} aria-label={group}>
            <h2>{group}</h2>
            <ul>
              {items.map((item) => (
                <li key={item.id}><Link href={item.href}>{item.label}</Link></li>
              ))}
            </ul>
          </nav>
        ))}

        <nav className="ft-col" aria-label="الموقع">
          <h2>الموقع</h2>
          <ul>
            {INFO_LINKS.map((l) => (
              <li key={l.href}><Link href={l.href}>{l.label}</Link></li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="ft-bottom">
        <span>© {new Date().getFullYear()} IQWealth</span>
        <span>البيانات لأغراض إعلامية ولا تُعدّ نصيحة استثمارية.</span>
      </div>
    </footer>
  )
}
