'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useApp } from '@/context/AppContext'

export default function BottomNav() {
  const pathname = usePathname()
  const { lang } = useApp()
  const ar = lang === 'ar'

  const tabs = [
    { href: '/',            icon: '🏠', labelAr: 'الرئيسية', labelEn: 'Home'      },
    { href: '/market',      icon: '📊', labelAr: 'السوق',    labelEn: 'Market'    },
    { href: '/rewards/spin',icon: '🎡', labelAr: 'دوّر',     labelEn: 'Spin',  special: true },
    { href: '/quests',      icon: '⭐', labelAr: 'المهمات',  labelEn: 'Quests'    },
    { href: '/profile',     icon: '👤', labelAr: 'الملف',    labelEn: 'Profile'   },
  ]

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
        const active = tab.href === '/'
          ? pathname === '/'
          : pathname.startsWith(tab.href)

        return (
          <Link
            key={tab.href}
            href={tab.href}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              paddingTop: tab.special ? 0 : 6,
              paddingBottom: 6,
              color: active ? 'var(--brand)' : 'var(--ink4)',
              textDecoration: 'none',
              position: 'relative',
            }}
          >
            {tab.special ? (
              <div style={{
                width: 46, height: 46,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #4F6BFF, #A855F7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22,
                boxShadow: '0 4px 16px rgba(79,107,255,0.5)',
                marginTop: -22,
                border: '3px solid var(--bg)',
              }}>
                {tab.icon}
              </div>
            ) : (
              <span style={{ fontSize: 22, lineHeight: 1 }}>{tab.icon}</span>
            )}
            <span style={{
              fontSize: 9,
              fontWeight: active ? 700 : 500,
              letterSpacing: '0.01em',
              color: active ? 'var(--brand)' : 'var(--ink4)',
            }}>
              {ar ? tab.labelAr : tab.labelEn}
            </span>
            {active && !tab.special && (
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
