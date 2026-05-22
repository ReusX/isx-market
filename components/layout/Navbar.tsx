'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useApp } from '@/context/AppContext'
import { fmtPts } from '@/lib/ranks'

export default function Navbar() {
  const { lang, setLang, user, profile, signOut, openAuth } = useApp()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const ar = lang === 'ar'

  return (
    <>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
        height: 'var(--nav-h)',
        background: 'rgba(11,14,20,0.97)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--line)',
        display: 'flex', alignItems: 'center',
      }}>
        <div style={{
          maxWidth: 1440, margin: '0 auto', width: '100%',
          display: 'flex', alignItems: 'center',
          padding: '0 24px', gap: 8,
        }}>
          {/* Logo */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, marginInlineEnd: 24, flexShrink: 0 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 900, color: '#fff',
            }}>₿</div>
            <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--ink)' }}>
              {ar ? 'بورصة العراق' : 'ISX Market'}
            </span>
          </Link>

          {/* Nav links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
            {[
              { href: '/market',     ar: 'السوق',      en: 'Market' },
              { href: '/charts',     ar: 'المخططات',   en: 'Charts' },
              { href: '/fx',         ar: 'IQD ⇄ USD',  en: 'IQD ⇄ USD' },
              { href: '/leaderboard',ar: 'المتصدرون',  en: 'Leaderboard' },
            ].map(l => (
              <Link key={l.href} href={l.href} style={{
                padding: '6px 12px', borderRadius: 8,
                fontSize: 13, fontWeight: 600, color: 'var(--ink3)',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--ink)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink3)')}
              >
                {ar ? l.ar : l.en}
              </Link>
            ))}
          </div>

          {/* Game chips — shown when logged in */}
          {user && profile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginInlineEnd: 8 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '4px 9px', borderRadius: 999,
                background: 'rgba(245,200,75,0.12)', border: '1px solid rgba(245,200,75,0.27)',
                fontSize: 11, fontWeight: 700, color: 'var(--gold)', fontFamily: 'var(--font-mono)',
              }}>🔥{profile.streak ?? 0}</div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '4px 10px 4px 7px', borderRadius: 999,
                background: 'var(--surf)', border: '1px solid var(--line)',
              }}>
                <div style={{
                  width: 14, height: 14, borderRadius: '50%',
                  background: 'var(--gold-grad)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 7, fontWeight: 800, color: '#5a3a00', flexShrink: 0,
                }}>₽</div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--gold)' }}>
                  {fmtPts(profile.points)}
                </span>
              </div>
            </div>
          )}

          {/* Right actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {user ? (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setUserMenuOpen(v => !v)}
                  style={{
                    width: 34, height: 34, borderRadius: '50%',
                    background: 'var(--brand)', color: '#fff',
                    fontWeight: 700, fontSize: 13, border: 'none',
                  }}
                >
                  {(profile?.username ?? user?.email ?? '?')[0].toUpperCase()}
                </button>
                {userMenuOpen && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 8px)', insetInlineEnd: 0,
                    background: 'var(--surf2)', border: '1px solid var(--line)',
                    borderRadius: 12, padding: 6, minWidth: 180, zIndex: 200,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                  }}>
                    <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--line)', marginBottom: 4 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{profile?.username ?? user?.email?.split('@')[0]}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink4)', marginTop: 2 }}>{user?.email}</div>
                    </div>
                    <Link href="/profile" onClick={() => setUserMenuOpen(false)}
                      style={{ display: 'block', padding: '8px 12px', fontSize: 13, borderRadius: 8, color: 'var(--ink2)' }}>
                      {ar ? 'الملف الشخصي' : 'Profile'}
                    </Link>
                    <Link href="/wallet" onClick={() => setUserMenuOpen(false)}
                      style={{ display: 'block', padding: '8px 12px', fontSize: 13, borderRadius: 8, color: 'var(--ink2)' }}>
                      {ar ? 'المحفظة' : 'Wallet'}
                    </Link>
                    <button onClick={() => { signOut(); setUserMenuOpen(false) }}
                      style={{
                        display: 'block', width: '100%', textAlign: 'start',
                        padding: '8px 12px', fontSize: 13, borderRadius: 8,
                        color: 'var(--dn)', background: 'none', border: 'none', marginTop: 4,
                      }}>
                      {ar ? 'تسجيل الخروج' : 'Sign Out'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => openAuth('signin')}
                style={{
                  padding: '7px 16px', background: 'var(--brand)', border: 'none',
                  borderRadius: 9, color: '#fff', fontWeight: 700, fontSize: 13,
                  fontFamily: 'inherit',
                }}
              >
                {ar ? 'دخول' : 'Sign In'}
              </button>
            )}

            <button
              onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
              style={{
                padding: '6px 12px', background: 'var(--surf)', border: '1px solid var(--line)',
                borderRadius: 8, color: 'var(--ink2)', fontSize: 12, fontWeight: 700,
              }}
            >
              {ar ? 'EN' : 'عر'}
            </button>
          </div>
        </div>
      </nav>

    </>
  )
}
