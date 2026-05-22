'use client'

import Link from 'next/link'
import { useApp } from '@/context/AppContext'

export default function Footer() {
  const { lang } = useApp()
  const ar = lang === 'ar'

  return (
    <footer style={{
      borderTop: '1px solid var(--line)',
      background: 'rgba(11,14,20,0.97)',
      marginTop: 64,
      paddingBottom: 80, // room for mobile bottom nav
    }}>
      <div style={{
        maxWidth: 1200, margin: '0 auto',
        padding: '48px 24px 32px',
      }}>
        {/* Top row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 40,
          marginBottom: 48,
        }}>

          {/* Brand */}
          <div>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <img src="/favicon-192.png" alt="ISX" width={32} height={32} style={{ borderRadius: 8 }} />
              <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--ink)' }}>
                {ar ? 'بورصة العراق' : 'ISX Market'}
              </span>
            </Link>
            <p style={{ fontSize: 12, color: 'var(--ink4)', lineHeight: 1.7, margin: 0 }}>
              {ar
                ? 'منصة الاستثمار في بورصة العراق. بيانات حية، تحليل موضوعي، لا تعقيد.'
                : 'Iraq Stock Exchange tracker. Live data, honest analysis, zero noise.'}
            </p>

            {/* Social */}
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <a
                href="https://www.instagram.com/iraqsmcom"
                target="_blank" rel="noopener noreferrer"
                aria-label="Instagram"
                style={{
                  width: 34, height: 34, borderRadius: 10,
                  background: 'var(--surf2)', border: '1px solid var(--line)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--ink3)', fontSize: 16, textDecoration: 'none',
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#E1306C')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--line)')}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                </svg>
              </a>
              <a
                href="https://www.facebook.com/Iraqstockmarket/"
                target="_blank" rel="noopener noreferrer"
                aria-label="Facebook"
                style={{
                  width: 34, height: 34, borderRadius: 10,
                  background: 'var(--surf2)', border: '1px solid var(--line)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--ink3)', fontSize: 16, textDecoration: 'none',
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#1877F2')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--line)')}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Platform */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
              {ar ? 'المنصة' : 'Platform'}
            </div>
            {[
              { href: '/market',      ar: 'السوق',        en: 'Market' },
              { href: '/charts',      ar: 'المخططات',     en: 'Charts' },
              { href: '/news',        ar: 'الأخبار',       en: 'News' },
              { href: '/research',    ar: 'أبحاث',         en: 'Research' },
              { href: '/leaderboard', ar: 'المتصدرون',     en: 'Leaderboard' },
              { href: '/fx',          ar: 'IQD ⇄ USD',     en: 'IQD ⇄ USD' },
            ].map(l => (
              <Link key={l.href} href={l.href} style={{ display: 'block', fontSize: 13, color: 'var(--ink3)', marginBottom: 10, textDecoration: 'none' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--ink)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink3)')}
              >
                {ar ? l.ar : l.en}
              </Link>
            ))}
          </div>

          {/* Points & Wallet */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
              {ar ? 'النقاط والمحفظة' : 'Points & Wallet'}
            </div>
            {[
              { href: '/wallet', ar: 'محفظتي',          en: 'My Wallet' },
              { href: '/spin',   ar: 'العجلة اليومية',   en: 'Daily Spin' },
              { href: '/points', ar: 'نظام النقاط',      en: 'Points System' },
              { href: '/quests', ar: 'المهام',            en: 'Quests' },
            ].map(l => (
              <Link key={l.href} href={l.href} style={{ display: 'block', fontSize: 13, color: 'var(--ink3)', marginBottom: 10, textDecoration: 'none' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--ink)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink3)')}
              >
                {ar ? l.ar : l.en}
              </Link>
            ))}
          </div>

          {/* Company */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
              {ar ? 'الشركة' : 'Company'}
            </div>
            {[
              { href: '/about',   ar: 'من نحن',          en: 'About Us' },
              { href: '/contact', ar: 'تواصل معنا',       en: 'Contact' },
              { href: '/privacy', ar: 'سياسة الخصوصية',  en: 'Privacy Policy' },
              { href: '/legal',   ar: 'إخلاء المسؤولية', en: 'Legal' },
            ].map(l => (
              <Link key={l.href} href={l.href} style={{ display: 'block', fontSize: 13, color: 'var(--ink3)', marginBottom: 10, textDecoration: 'none' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--ink)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink3)')}
              >
                {ar ? l.ar : l.en}
              </Link>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{
          borderTop: '1px solid var(--line)',
          paddingTop: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 12,
        }}>
          <p style={{ fontSize: 11, color: 'var(--ink5)', margin: 0 }}>
            {ar
              ? `© ${new Date().getFullYear()} ISX Market. جميع الحقوق محفوظة.`
              : `© ${new Date().getFullYear()} ISX Market. All rights reserved.`}
          </p>
          <p style={{ fontSize: 11, color: 'var(--ink5)', margin: 0, textAlign: 'center' }}>
            {ar
              ? 'المعلومات الواردة هنا لأغراض إعلامية فقط وليست نصيحة استثمارية.'
              : 'Information on this site is for informational purposes only and is not investment advice.'}
          </p>
        </div>
      </div>
    </footer>
  )
}
