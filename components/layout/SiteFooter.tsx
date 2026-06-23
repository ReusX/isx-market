'use client'

import Link from 'next/link'
import { useApp } from '@/context/AppContext'

const COLS: { title: [string, string]; links: { href: string; ar: string; en: string }[] }[] = [
  {
    title: ['السوق', 'Market'],
    links: [
      { href: '/market',     ar: 'حركة السوق',   en: 'Market' },
      { href: '/pulse',      ar: 'نبض السوق',    en: 'Pulse' },
      { href: '/screener',   ar: 'فارز الأسهم',  en: 'Screener' },
      { href: '/charts',     ar: 'المخططات',     en: 'Charts' },
      { href: '/statistics', ar: 'الإحصائيات',   en: 'Statistics' },
    ],
  },
  {
    title: ['أدوات', 'Tools'],
    links: [
      { href: '/gold', ar: 'سعر الذهب',  en: 'Gold' },
      { href: '/fx',   ar: 'الدينار/الدولار', en: 'IQD ⇄ USD' },
      { href: '/news', ar: 'الأخبار',    en: 'News' },
      { href: '/companies', ar: 'الشركات', en: 'Companies' },
    ],
  },
  {
    title: ['الموقع', 'Site'],
    links: [
      { href: '/about',   ar: 'من نحن',        en: 'About' },
      { href: '/contact', ar: 'تواصل معنا',    en: 'Contact' },
      { href: '/privacy', ar: 'الخصوصية',      en: 'Privacy' },
      { href: '/legal',   ar: 'إشعار قانوني',  en: 'Legal' },
    ],
  },
]

export default function SiteFooter() {
  const { lang } = useApp()
  const ar = lang === 'ar'
  const year = new Date().getFullYear()

  return (
    <footer style={{
      borderTop: '1px solid var(--line)', background: 'var(--surf)',
      marginTop: 48, padding: '40px 24px 28px',
    }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1.4fr) repeat(3, 1fr)', gap: 32 }}>
          {/* Brand */}
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)', marginBottom: 10 }}>
              IQWealth
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--ink4)', lineHeight: 1.8, margin: 0, maxWidth: 280 }}>
              {ar
                ? 'منصّة مجانية للمستثمر العراقي — بيانات يومية من المصادر الرسمية، تحليل، وأدوات بحث.'
                : 'A free platform for the Iraqi investor — daily data from official sources, analysis, and research tools.'}
            </p>
          </div>

          {/* Link columns */}
          {COLS.map(col => (
            <div key={col.title[1]}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
                {ar ? col.title[0] : col.title[1]}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {col.links.map(l => (
                  <Link key={l.href} href={l.href} style={{ fontSize: 13, color: 'var(--ink2)', textDecoration: 'none' }}>
                    {ar ? l.ar : l.en}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div style={{
          marginTop: 36, paddingTop: 20, borderTop: '1px solid var(--line)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 12, color: 'var(--ink4)' }}>
            © {year} {ar ? 'IQWealth · صُمّم بواسطة أحمد بلحة' : 'IQWealth · Built by Ahmed Balaha'}
          </span>
          <span style={{ fontSize: 11, color: 'var(--ink5)', maxWidth: 460, textAlign: ar ? 'left' : 'right' }}>
            {ar
              ? 'البيانات لأغراض إعلامية ولا تُعدّ نصيحة استثمارية.'
              : 'Data is for informational purposes and is not investment advice.'}
          </span>
        </div>
      </div>
    </footer>
  )
}
