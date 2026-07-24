'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { href: '/',           icon: '🏠', ar: 'الرئيسية' },
  { href: '/market',     icon: '📊', ar: 'السوق'    },
  { href: '/companies',  icon: '🏢', ar: 'الشركات'  },
  { href: '/statistics', icon: '📈', ar: 'إحصائيات' },
  { href: '/profile',    icon: '👤', ar: 'الملف'    },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="mobile-only" style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
      background: 'rgba(17,21,30,0.96)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderTop: '1px solid var(--line)',
      display: 'flex', alignItems: 'center',
      height: 62,
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {tabs.map(tab => {
        const active = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href)
        return (
          <Link key={tab.href} href={tab.href} style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 2, paddingTop: 6, paddingBottom: 6,
            color: active ? 'var(--brand)' : 'var(--ink4)',
            textDecoration: 'none', position: 'relative',
          }}>
            <span style={{ fontSize: 20, lineHeight: 1 }}>{tab.icon}</span>
            <span style={{
              fontSize: 9, fontWeight: active ? 700 : 500,
              color: active ? 'var(--brand)' : 'var(--ink4)',
            }}>
              {tab.ar}
            </span>
            {active && (
              <div style={{
                position: 'absolute', top: 0, left: '50%',
                transform: 'translateX(-50%)',
                width: 24, height: 2,
                background: 'var(--brand)',
                borderRadius: '0 0 2px 2px',
              }} />
            )}
          </Link>
        )
      })}
    </nav>
  )
}
