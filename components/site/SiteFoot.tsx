'use client'

import Link from 'next/link'
import { StarMark } from '@/components/brand/StarMark'
import { useLocale } from '@/context/LocaleContext'
import { DOORS } from './SiteNav'

/** The foot of every rebuilt page: the mark, the four doors, the small print. */
export function SiteFoot() {
  const { t, href: L } = useLocale()
  const doors = t.home.landing.doors
  return (
    <footer className="iqf id-full">
      <div className="iqf-row">
        <Link href={L('/')} className="iqf-brand" aria-label={t.site.brandHome}><StarMark size={20} /><span>IQWealth</span></Link>
        <nav className="iqf-doors" aria-label={t.site.menu}>
          {DOORS.map((d) => <Link key={d.id} href={L(d.route)}>{doors[d.id].name}</Link>)}
        </nav>
      </div>
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
