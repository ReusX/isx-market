'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { useApp } from '@/context/AppContext'
import SiteFooter from '@/components/layout/SiteFooter'

// ── IraqSM terminal dark palette ──────────────────────────────────────────────
const K = {
  bg:        '#1E252F',
  sidebar:   '#191E24',
  surf2:     '#222933',
  surf3:     '#363D47',
  hover:     '#222933',
  activeBg:  'rgba(48,138,224,0.14)',
  border:    '#2E353F',
  brand:     '#308AE0',
  brandSoft: 'rgba(48,138,224,0.16)',
  ink:       '#E0E4ED',
  ink2:      '#A0A8B4',
  ink3:      '#8A929E',
  ink4:      '#6A727E',
  badge:     '#266EC3',
  badgeTxt:  '#FFFFFF',
}

// ── SVG icon ──────────────────────────────────────────────────────────────────
function Icon({ d, size = 14, sw = 1.6 }: { d: string; size?: number; sw?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  )
}

const IC = {
  home:     'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z',
  bars:     'M18 20V10M12 20V4M6 20v-6',
  chart:    'M3 3v18h18 M7 16l4-4 4 4 4-8',
  news:     'M4 6h16M4 12h16M4 18h10',
  shield:   'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  star:     'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  fx:       'M7 16V4m0 0L4 7m3-3l3 3 M17 8v12m0 0l3-3m-3 3l-3-3',
  search:   'M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z',
  chevD:    'M6 9l6 6 6-6',
  chevU:    'M18 15l-6-6-6 6',
  menu:     'M3 12h18M3 6h18M3 18h18',
  bell:     'M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 01-3.46 0',
  user:     'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2 M12 11a4 4 0 100-8 4 4 0 000 8z',
  settings: 'M12 20a8 8 0 100-16 8 8 0 000 16z M12 14a2 2 0 100-4 2 2 0 000 4z',
  scatter:  'M3 3l18 18M3 21L21 3',
  stats:    'M3 3v18h18 M7 14l3-3 3 3 4-6 M7 14v4 M10 11v7 M13 14v4 M17 8v10',
}

// ── Nav tree (mirrors Koyfin section structure) ───────────────────────────────
const NAV: {
  id: string; label?: string; collapsible?: boolean;
  items: { href: string; icon: keyof typeof IC; ar: string; badge?: string }[]
}[] = [
  {
    id: 'main',
    items: [
      { href: '/',       icon: 'home',   ar: 'الرئيسية',        badge: 'الآن' },
    ],
  },
  {
    id: 'favorites', label: 'المفضلة', collapsible: true,
    items: [
      { href: '/news',   icon: 'news',   ar: 'أخبار السوق',     badge: 'أخبار' },
      { href: '/market', icon: 'bars',   ar: 'حركة السوق',      badge: 'حركة'  },
      { href: '/pulse',  icon: 'stats',  ar: 'نبض السوق',       badge: 'مباشر' },
      { href: '/screener', icon: 'search', ar: 'فارز الأسهم',   badge: 'جديد'  },
      { href: '/heatmap',  icon: 'bars',   ar: 'خريطة السوق',   badge: 'جديد'  },
    ],
  },
  {
    id: 'myisx', label: 'منصتي', collapsible: true,
    items: [
      { href: '/portfolio',  icon: 'scatter',ar: 'محفظتي',          badge: 'جديد'   },
      { href: '/alerts',     icon: 'bell',   ar: 'تنبيهات الأسعار', badge: 'جديد'   },
      { href: '/watchlist',  icon: 'star',   ar: 'قوائم المتابعة', badge: 'متابعة' },
      { href: '/charts',     icon: 'chart',  ar: 'رسوماتي',         badge: 'رسم'    },
      { href: '/statistics', icon: 'stats',  ar: 'الإحصائيات',      badge: 'جديد'   },
    ],
  },
  {
    id: 'market', label: 'نظرة السوق', collapsible: true,
    items: [
      { href: '/market', icon: 'bars', ar: 'لوحات السوق'  },
      { href: '/fx',     icon: 'fx',   ar: 'سعر الصرف'    },
    ],
  },
  {
    id: 'tools', label: 'أدوات البحث', collapsible: true,
    items: [
      { href: '/charts',  icon: 'chart', ar: 'الرسوم البيانية', badge: 'رسم' },
      { href: '/gold',    icon: 'fx',    ar: 'سعر الذهب'                      },
    ],
  },
]

// ── AppShell ──────────────────────────────────────────────────────────────────
export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, profile, openAuth, signOut } = useApp()
  const [collapsedPref, setCollapsed] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    favorites: true, myisx: true, market: false, tools: false,
  })
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isMobile, setIsMobile]     = useState(false)

  // close the account menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [menuOpen])

  const initial = (profile?.username ?? user?.email ?? '?').trim()[0]?.toUpperCase() ?? '?'

  useEffect(() => {
    const saved = localStorage.getItem('kf-sidebar')
    if (saved !== null) setCollapsed(saved === '0')
  }, [])

  const toggleSidebar = useCallback(() => {
    setCollapsed(v => {
      localStorage.setItem('kf-sidebar', v ? '1' : '0')
      return !v
    })
  }, [])

  // The drawer always shows full labels on mobile, regardless of the
  // desktop collapse preference.
  const collapsed = collapsedPref && !isMobile

  const toggleSection = (id: string) => {
    setOpenSections(p => ({ ...p, [id]: !p[id] }))
  }

  // Close the mobile drawer whenever the route changes
  useEffect(() => { setDrawerOpen(false) }, [pathname])

  // Track the mobile breakpoint for drawer-specific behavior
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  // Lock body scroll while the drawer is open
  useEffect(() => {
    if (drawerOpen) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev }
    }
  }, [drawerOpen])

  const SW = collapsed ? 48 : 192

  return (
    <div style={{ display: 'flex', minHeight: '100dvh', background: K.bg, color: K.ink }}>

      {/* ── Sidebar ── */}
      <aside className={`app-sidebar${drawerOpen ? ' open' : ''}`} style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: SW, zIndex: 200,
        background: K.sidebar,
        borderInlineStart: `1px solid ${K.border}`,
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.18s cubic-bezier(0.4,0,0.2,1)',
        overflow: 'hidden',
      }}>

        {/* Header row: logo + menu toggle */}
        <div style={{
          height: 48, display: 'flex', alignItems: 'center',
          padding: collapsed ? '0 10px' : '0 10px 0 14px',
          justifyContent: collapsed ? 'center' : 'space-between',
          borderBottom: `1px solid ${K.border}`,
          flexShrink: 0, gap: 8,
        }}>
          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
              <Image src="/favicon-192.png" alt="ISX" width={22} height={22}
                style={{ borderRadius: 5, flexShrink: 0 }} />
              <span style={{
                fontWeight: 800, fontSize: 13, color: K.ink,
                whiteSpace: 'nowrap',
              }}>
                بورصة العراق
              </span>
            </div>
          )}
          <button onClick={() => { isMobile ? setDrawerOpen(false) : toggleSidebar() }} style={{
            width: 28, height: 28, borderRadius: 5,
            background: 'transparent', border: 'none',
            color: K.ink4, display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
            transition: 'color 0.12s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = K.ink)}
          onMouseLeave={e => (e.currentTarget.style.color = K.ink4)}
          >
            <Icon d={IC.menu} size={15} />
          </button>
        </div>

        {/* Nav scroll area */}
        <nav style={{
          flex: 1, overflowY: 'auto', overflowX: 'hidden',
          padding: '6px 0',
          scrollbarWidth: 'none',
        }}>
          {NAV.map(section => (
            <div key={section.id}>

              {/* Section header — only when expanded */}
              {section.label && !collapsed && (
                <div
                  onClick={() => section.collapsible && toggleSection(section.id)}
                  style={{
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px 3px',
                    fontSize: 10, fontWeight: 700,
                    color: K.ink4, letterSpacing: '0.07em',
                    cursor: section.collapsible ? 'pointer' : 'default',
                    userSelect: 'none', textTransform: 'uppercase',
                  }}
                >
                  <span>{section.label}</span>
                  {section.collapsible && (
                    <span style={{ color: K.ink4, opacity: 0.7 }}>
                      <Icon d={openSections[section.id] ? IC.chevU : IC.chevD} size={9} />
                    </span>
                  )}
                </div>
              )}

              {/* Collapsed section divider */}
              {section.label && collapsed && (
                <div style={{ height: 1, background: K.border, margin: '6px 8px' }} />
              )}

              {/* Items */}
              {(!section.collapsible || openSections[section.id] || !section.label) &&
                section.items.map(item => {
                  const active = item.href === '/'
                    ? pathname === '/'
                    : pathname === item.href || pathname.startsWith(item.href + '/')
                  return (
                    <Link
                      key={item.href + item.ar}
                      href={item.href}
                      title={collapsed ? item.ar : undefined}
                      onClick={() => setDrawerOpen(false)}
                      style={{
                        display: 'flex', alignItems: 'center',
                        height: 32, gap: 8,
                        padding: collapsed ? '0' : '0 14px',
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        color: active ? K.brand : K.ink3,
                        background: active ? K.activeBg : 'transparent',
                        borderInlineStart: active
                          ? `2px solid ${K.brand}`
                          : '2px solid transparent',
                        textDecoration: 'none',
                        fontSize: 12.5, fontWeight: active ? 600 : 400,
                        transition: 'background 0.1s, color 0.1s',
                        whiteSpace: 'nowrap',
                      }}
                      onMouseEnter={e => {
                        if (!active) e.currentTarget.style.background = K.hover
                        if (!active) e.currentTarget.style.color = K.ink2
                      }}
                      onMouseLeave={e => {
                        if (!active) e.currentTarget.style.background = 'transparent'
                        if (!active) e.currentTarget.style.color = K.ink3
                      }}
                    >
                      <span style={{ flexShrink: 0, color: active ? K.brand : K.ink4 }}>
                        <Icon d={IC[item.icon]} size={13} />
                      </span>
                      {!collapsed && (
                        <>
                          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.ar}
                          </span>
                          {item.badge && (
                            <span style={{
                              fontSize: 9, fontWeight: 700,
                              padding: '1px 5px', borderRadius: 3,
                              background: K.badge, color: K.badgeTxt,
                              flexShrink: 0,
                            }}>
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </Link>
                  )
                })
              }
            </div>
          ))}
        </nav>

        {/* Bottom user strip */}
        {user ? (
          <Link href="/profile" style={{
            borderTop: `1px solid ${K.border}`,
            padding: collapsed ? '10px 0' : '8px 12px',
            display: 'flex', alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: 8, flexShrink: 0, textDecoration: 'none',
          }}>
            <div style={{
              width: 26, height: 26, borderRadius: '50%',
              background: K.brand, color: '#fff', fontWeight: 700, fontSize: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              {initial}
            </div>
            {!collapsed && (
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: K.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {profile?.username ?? user?.email?.split('@')[0]}
                </div>
                <div style={{ fontSize: 10, color: K.ink4 }}>الحساب المجاني</div>
              </div>
            )}
          </Link>
        ) : (
          <button onClick={() => openAuth('signup')} style={{
            borderTop: `1px solid ${K.border}`,
            padding: collapsed ? '10px 0' : '8px 12px',
            display: 'flex', alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: 8, flexShrink: 0, width: '100%',
            background: 'none', border: 'none', borderTopWidth: 1,
            cursor: 'pointer', fontFamily: 'inherit', textAlign: 'start',
          }}>
            <div style={{
              width: 26, height: 26, borderRadius: '50%',
              background: K.brandSoft, color: K.brand,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Icon d={IC.user} size={13} />
            </div>
            {!collapsed && (
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: K.brand, whiteSpace: 'nowrap' }}>
                  تسجيل الدخول
                </div>
                <div style={{ fontSize: 10, color: K.ink4 }}>أنشئ حسابك المجاني</div>
              </div>
            )}
          </button>
        )}
      </aside>

      {/* ── Mobile drawer backdrop ── */}
      {drawerOpen && (
        <div className="app-backdrop" onClick={() => setDrawerOpen(false)} />
      )}

      {/* ── Main content ── */}
      <div className="app-main" style={{
        flex: 1,
        marginInlineStart: SW,
        transition: 'margin-inline-start 0.18s cubic-bezier(0.4,0,0.2,1)',
        display: 'flex', flexDirection: 'column',
        minHeight: '100dvh', minWidth: 0,
      }}>

        {/* Topbar */}
        <header style={{
          position: 'sticky', top: 0, zIndex: 100,
          height: 48, display: 'flex', alignItems: 'center',
          padding: '0 16px', gap: 12,
          background: K.sidebar,
          borderBottom: `1px solid ${K.border}`,
          flexShrink: 0,
        }}>
          {/* Mobile: hamburger to open the drawer */}
          <button
            className="app-hamburger"
            onClick={() => setDrawerOpen(true)}
            aria-label="القائمة"
            style={{
              width: 34, height: 34, borderRadius: 8, flexShrink: 0,
              background: 'transparent', border: 'none', color: K.ink,
              alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
          >
            <Icon d={IC.menu} size={20} />
          </button>

          {/* Mobile: brand logo */}
          <Link href="/" className="app-mobile-logo" style={{
            alignItems: 'center', gap: 7, flexShrink: 0, textDecoration: 'none',
          }}>
            <Image src="/favicon-192.png" alt="ISX" width={24} height={24}
              style={{ borderRadius: 6 }} />
            <span style={{ fontWeight: 800, fontSize: 14, color: K.ink, whiteSpace: 'nowrap' }}>
              بورصة العراق
            </span>
          </Link>

          {/* Global search */}
          <div className="desktop-only" style={{ flex: 1, maxWidth: 480, position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span style={{
              position: 'absolute', insetInlineStart: 10,
              color: K.ink4, pointerEvents: 'none', display: 'flex',
            }}>
              <Icon d={IC.search} size={13} />
            </span>
            <input
              placeholder="ابحث عن شركة أو رمز..."
              style={{
                width: '100%', height: 33, borderRadius: 6,
                background: K.surf2, border: `1px solid ${K.border}`,
                color: K.ink, fontSize: 12.5,
                padding: '0 10px 0 32px',
                outline: 'none', fontFamily: 'inherit', direction: 'rtl',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = K.brand)}
              onBlur={e => (e.currentTarget.style.borderColor = K.border)}
            />
            <kbd style={{
              position: 'absolute', insetInlineEnd: 8,
              fontSize: 9, color: K.ink4,
              background: K.surf3, border: `1px solid ${K.border}`,
              borderRadius: 3, padding: '1px 4px', pointerEvents: 'none',
              fontFamily: 'var(--font-mono)',
            }}>/</kbd>
          </div>

          <div style={{ flex: 1 }} />

          <button className="desktop-only" style={{
            background: 'none', border: 'none', color: K.ink4,
            cursor: 'pointer', padding: 4,
            transition: 'color 0.12s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = K.ink)}
          onMouseLeave={e => (e.currentTarget.style.color = K.ink4)}
          >
            <Icon d={IC.bell} size={15} />
          </button>

          {user ? (
            <div ref={menuRef} style={{ position: 'relative', flexShrink: 0 }}>
              <button
                onClick={() => setMenuOpen(v => !v)}
                style={{
                  width: 28, height: 28, borderRadius: '50%', border: 'none',
                  background: K.brand, color: '#fff', cursor: 'pointer',
                  fontWeight: 700, fontSize: 12, fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {initial}
              </button>
              {menuOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 8px)', insetInlineEnd: 0,
                  background: K.surf2, border: `1px solid ${K.border}`,
                  borderRadius: 12, padding: 6, minWidth: 190, zIndex: 300,
                  boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                }}>
                  <div style={{ padding: '10px 12px', borderBottom: `1px solid ${K.border}`, marginBottom: 4 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: K.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {profile?.username ?? user?.email?.split('@')[0]}
                    </div>
                    <div style={{ fontSize: 11, color: K.ink4, marginTop: 2 }}>{user?.email}</div>
                  </div>
                  {[
                    { href: '/profile', label: 'الملف الشخصي' },
                  ].map(it => (
                    <Link key={it.href} href={it.href} onClick={() => setMenuOpen(false)}
                      style={{ display: 'block', padding: '8px 12px', fontSize: 13, borderRadius: 8, color: K.ink2 }}>
                      {it.label}
                    </Link>
                  ))}
                  <button onClick={() => { signOut(); setMenuOpen(false) }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'start',
                      padding: '8px 12px', fontSize: 13, borderRadius: 8,
                      color: '#EF6E72', background: 'none', border: 'none',
                      marginTop: 4, cursor: 'pointer', fontFamily: 'inherit',
                    }}>
                    تسجيل الخروج
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => openAuth('signin')}
              style={{
                flexShrink: 0, padding: '7px 16px', background: K.brand,
                border: 'none', borderRadius: 8, color: '#fff',
                fontWeight: 700, fontSize: 12.5, fontFamily: 'inherit', cursor: 'pointer',
              }}
            >
              دخول
            </button>
          )}
        </header>

        {/* Page */}
        <main style={{ flex: 1, overflow: 'auto' }}>
          {children}
          <SiteFooter />
        </main>
      </div>
    </div>
  )
}
