'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useApp } from '@/context/AppContext'
import SiteFooter from '@/components/layout/SiteFooter'
import StarMark from '@/components/brand/StarMark'

// ── IraqSM terminal dark palette ──────────────────────────────────────────────
// Maps to the CSS theme tokens in globals.css so the shell flips with the
// light/dark theme instead of being pinned to dark hex values.
const K = {
  bg:        'var(--bg)',
  sidebar:   'var(--sidebar)',
  surf2:     'var(--surf2)',
  surf3:     'var(--surf3)',
  hover:     'var(--surf2)',
  activeBg:  'var(--brand-soft)',
  border:    'var(--line)',
  brand:     'var(--brand)',
  brandSoft: 'var(--brand-soft)',
  ink:       'var(--ink)',
  ink2:      'var(--ink2)',
  ink3:      'var(--ink3)',
  ink4:      'var(--ink4)',
  badge:     'var(--badge)',
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
  home:      'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z',
  bars:      'M18 20V10M12 20V4M6 20v-6',
  chart:     'M3 3v18h18 M7 16l4-4 4 4 4-8',
  news:      'M4 6h16M4 12h16M4 18h10',
  building:  'M3 21h18 M5 21V7l7-4 7 4v14 M9 21v-5h6v5 M9 10h.01 M15 10h.01', // listed companies
  star:      'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  fx:        'M7 16V4m0 0L4 7m3-3l3 3 M17 8v12m0 0l3-3m-3 3l-3-3',
  search:    'M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z',
  chevD:     'M6 9l6 6 6-6',
  chevU:     'M18 15l-6-6-6 6',
  menu:      'M3 12h18M3 6h18M3 18h18',
  bell:      'M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 01-3.46 0',
  user:      'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2 M12 11a4 4 0 100-8 4 4 0 000 8z',
  stats:     'M3 3v18h18 M7 14l3-3 3 3 4-6 M7 14v4 M10 11v7 M13 14v4 M17 8v10',
  grid:      'M4 4h7v7H4z M13 4h7v7h-7z M13 13h7v7h-7z M4 13h7v7H4z',   // heatmap (treemap)
  pulse:     'M3 12h4l2 6 4-12 2 6h6',                                   // market breadth
  filter:    'M4 5h16M7 12h10M10 19h4',                                  // screener
  briefcase: 'M3 8h18v12H3z M8 8V5a2 2 0 012-2h4a2 2 0 012 2v3',         // portfolio
  coin:      'M12 3a9 9 0 100 18 9 9 0 000-18z M8 10h8M8 14h8',          // gold
  oil:       'M12 2s6 7 6 11a6 6 0 11-12 0c0-4 6-11 6-11z',              // oil drop
}

// ── Nav tree · icon names map to the design's pure-CSS .shortcut-icon shapes ──
const NAV: {
  id: string; label?: string;
  items: { href: string; icon: string; ar: string; badge?: string }[]
}[] = [
  {
    id: 'market', label: 'السوق',
    items: [
      { href: '/market',     icon: 'chart',  ar: 'حركة السوق'  },
      { href: '/screener',   icon: 'filter', ar: 'فارز الأسهم' },
      { href: '/statistics', icon: 'stats',  ar: 'الإحصائيات'  },
      { href: '/heatmap',    icon: 'grid',   ar: 'خريطة السوق' },
      { href: '/pulse',      icon: 'pulse',  ar: 'نبض السوق'   },
      { href: '/companies',  icon: 'building', ar: 'الشركات'   },
    ],
  },
  {
    id: 'platform', label: 'منصتي',
    items: [
      { href: '/portfolio', icon: 'briefcase', ar: 'محفظتي',          badge: 'جديد' },
      { href: '/watchlist', icon: 'watchlist', ar: 'قوائم المتابعة' },
      { href: '/alerts',    icon: 'bell',      ar: 'تنبيهات الأسعار', badge: 'جديد' },
    ],
  },
  {
    id: 'tools', label: 'أدوات',
    items: [
      { href: '/fx',   icon: 'exchange', ar: 'سعر الصرف' },
      { href: '/gold', icon: 'gold',     ar: 'سعر الذهب' },
      { href: '/oil',  icon: 'oil',      ar: 'سعر النفط' },
    ],
  },
]

// ── AppShell ──────────────────────────────────────────────────────────────────
export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, profile, openAuth, signOut, theme, toggleTheme } = useApp()
  const [collapsedPref, setCollapsed] = useState(false)
  const [search, setSearch] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    market: true, platform: true, tools: true,
  })
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isMobile, setIsMobile]     = useState(false)

  /*
   * The "/" shortcut the input advertises with a <kbd> badge. It had no handler
   * at all — the badge was decoration on a box that did nothing.
   */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return
      const el = e.target as HTMLElement | null
      // Don't steal the keystroke from someone typing in a field.
      if (el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable)) return
      e.preventDefault()
      searchRef.current?.focus()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

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


  return (
    <div className={`app-layout${collapsed ? ' sidebar-collapsed' : ''}`}>

      {/* Backdrop is declared BEFORE the drawer on purpose. iOS WebKit
          composites a backdrop-filter layer above later-painted siblings
          regardless of z-index, which left the open drawer blurred and
          swallowing taps. Painting it first makes the order unambiguous. */}
      {drawerOpen && (
        <div className="app-backdrop" onClick={() => setDrawerOpen(false)} aria-hidden="true" />
      )}

      {/* ── Sidebar · design markup (side-navigation) ── */}
      <aside
        className={`side-navigation${drawerOpen ? ' open' : ''}`}
        aria-label="التنقل الرئيسي"
      >
        <div className="side-navigation-head">
          <Link className="side-brand" href="/" aria-label="IQWealth الرئيسية">
            <span className="side-brand-mark"><StarMark size={20} color="var(--nav-active)" /></span>
            <span className="side-brand-name">IQWealth</span>
          </Link>
          <button
            className="sidebar-toggle"
            type="button"
            onClick={() => { isMobile ? setDrawerOpen(false) : toggleSidebar() }}
            aria-label={collapsed ? 'توسيع القائمة الجانبية' : 'طي القائمة الجانبية'}
            aria-expanded={!collapsed}
            title={collapsed ? 'توسيع القائمة' : 'طي القائمة'}
          >
            {/* RTL: the chevron points toward the edge the panel folds into. */}
            <span aria-hidden="true">{collapsed ? '\u00AB' : '\u00BB'}</span>
          </button>
        </div>

        <nav className="side-navigation-scroll">
          <Link
            className={`side-navigation-link home-link${pathname === '/' ? ' active' : ''}`}
            href="/"
            aria-current={pathname === '/' ? 'page' : undefined}
            onClick={() => setDrawerOpen(false)}
          >
            <span className="shortcut-icon home" aria-hidden="true" />
            <span className="side-navigation-label">الرئيسية</span>
          </Link>

          {NAV.map(section => (
            <section className="side-navigation-group" aria-label={section.label} key={section.id}>
              <h2>{section.label}</h2>
              {/* A real <ul>, not a stack of bare links. Flattened to text, the
                  old markup ran adjacent labels together with no separator —
                  Google scraped "خريطة السوقنبض السوق" straight out of here and
                  published it as the /companies snippet. List items break. */}
              <ul className="side-navigation-list">
                {section.items.map(item => {
                  const active = pathname === item.href || pathname.startsWith(item.href + '/')
                  return (
                    <li key={item.href}>
                      <Link
                        className={`side-navigation-link${active ? ' active' : ''}`}
                        href={item.href}
                        aria-current={active ? 'page' : undefined}
                        title={collapsed ? item.ar : undefined}
                        onClick={() => setDrawerOpen(false)}
                      >
                        <span className={`shortcut-icon ${item.icon}`} aria-hidden="true" />
                        <span className="side-navigation-label">{item.ar}</span>
                        {item.badge ? <span className="nav-badge">{item.badge}</span> : null}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </nav>

        {user ? (
          <Link className="side-navigation-account" href="/profile">
            <span className="side-account-avatar">{initial}</span>
            <span className="side-account-copy">
              <strong>{profile?.username ?? user?.email?.split('@')[0]}</strong>
              <small>الحساب المجاني</small>
            </span>
          </Link>
        ) : (
          <button className="side-navigation-account" type="button" onClick={() => openAuth('signup')}>
            <span className="side-account-avatar is-guest">
              <Icon d={IC.user} size={13} />
            </span>
            <span className="side-account-copy">
              <strong className="is-link">تسجيل الدخول</strong>
              <small>أنشئ حسابك المجاني</small>
            </span>
          </button>
        )}
      </aside>

      {/* ── Main content ── */}
      <div className="app-main">

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
            <StarMark size={22} color="var(--ink)" />
            <span style={{ fontWeight: 800, fontSize: 14, color: K.ink, whiteSpace: 'nowrap' }}>
              IQWealth
            </span>
          </Link>

          {/* Global search */}
          {/*
            A real <form>, not a decorative box. This input had no handler of
            any kind: typing in it did nothing, Enter did nothing, and the "/"
            badge pointed at a shortcut that did not exist — on every page.

            It submits to /market?q=…, which is also the endpoint the WebSite
            SearchAction in app/layout.tsx has been advertising to Google. That
            declaration was false until now; /market ignored the parameter.
          */}
          <form
            className="desktop-only"
            role="search"
            action="/market"
            onSubmit={e => {
              e.preventDefault()
              const q = search.trim()
              router.push(q ? `/market?q=${encodeURIComponent(q)}` : '/market')
              searchRef.current?.blur()
            }}
            style={{ flex: 1, maxWidth: 480, position: 'relative', display: 'flex', alignItems: 'center' }}
          >
            <span style={{
              position: 'absolute', insetInlineStart: 10,
              color: K.ink4, pointerEvents: 'none', display: 'flex',
            }}>
              <Icon d={IC.search} size={13} />
            </span>
            <input
              ref={searchRef}
              name="q"
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              aria-label="ابحث عن شركة أو رمز"
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
          </form>

          <div style={{ flex: 1 }} />

          {/* Theme toggle (dark ⇄ light) */}
          <button
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}
            title={theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}
            style={{
              background: 'none', border: 'none', color: K.ink4,
              cursor: 'pointer', padding: 4, display: 'flex',
              transition: 'color 0.12s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = K.ink)}
            onMouseLeave={e => (e.currentTarget.style.color = K.ink4)}
          >
            {theme === 'dark' ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
              </svg>
            )}
          </button>

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
