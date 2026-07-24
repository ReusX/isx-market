'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useApp } from '@/context/AppContext'
import { createClient } from '@/lib/supabase/client'

function genCode(uid: string): string {
  const prefix = uid.replace(/-/g, '').slice(0, 4).toUpperCase()
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `${prefix}${suffix}`
}

export default function ProfilePage() {
  const { lang, user, profile, authLoading, refreshProfile, signOut, openAuth } = useApp()
  const ar = lang === 'ar'
  const sb = createClient()
  const [editing,  setEditing]  = useState(false)
  const [username, setUsername] = useState(profile?.username ?? '')
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [copied,   setCopied]   = useState(false)

  useEffect(() => {
    if (!user || !profile || profile.referral_code) return
    const code = genCode(user.id)
    sb.from('profiles').update({ referral_code: code }).eq('id', user.id)
      .then(() => refreshProfile())
  }, [user, profile]) // eslint-disable-line

  const copyCode = useCallback(async () => {
    const code = profile?.referral_code
    if (!code) return
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [profile?.referral_code])

  if (authLoading) return (
    <main className="terminal-shell app-page profile-page">
      <div className="skeleton" style={{ height: 140, borderRadius: 16 }} />
    </main>
  )

  if (!user) return (
    <main className="terminal-shell app-page profile-page">
      <div className="empty-state">
        <strong>{ar ? 'يجب تسجيل الدخول' : 'Sign in required'}</strong>
        <span>{ar ? 'سجّل الدخول لحفظ قوائمك ومحفظتك وتنبيهاتك.' : 'Sign in to keep your lists, portfolio and alerts.'}</span>
        <button type="button" className="auth-submit" onClick={() => openAuth('signin')}>
          {ar ? 'تسجيل الدخول' : 'Sign in'}
        </button>
      </div>
    </main>
  )

  if (!profile) return (
    <main className="terminal-shell app-page profile-page">
      {[80, 120, 80].map((h, i) => (
        <div key={i} className="skeleton" style={{ height: h, borderRadius: 16, marginBottom: 12 }} />
      ))}
    </main>
  )

  async function saveUsername() {
    if (!username.trim() || username === profile?.username) { setEditing(false); return }
    setSaving(true)
    await sb.from('profiles').update({ username: username.trim() }).eq('id', user!.id)
    await refreshProfile()
    setSaving(false)
    setEditing(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const SHORTCUTS = [
    { href: '/watchlist', ar: 'قوائم المتابعة', en: 'Watchlists' },
    { href: '/portfolio', ar: 'محفظتي', en: 'Portfolio' },
    { href: '/alerts',    ar: 'تنبيهات الأسعار', en: 'Price alerts' },
  ]

  return (
    <main className="terminal-shell app-page profile-page">
      <section className="app-card profile-identity">
        <span className="profile-avatar" aria-hidden="true">
          {(profile.username ?? user.email ?? '?')[0].toUpperCase()}
        </span>
        <div>
          {editing ? (
            <div className="profile-name-edit">
              <input value={username} onChange={e => setUsername(e.target.value)} autoFocus aria-label={ar ? 'اسم المستخدم' : 'Username'} />
              <button type="button" className="auth-submit" onClick={saveUsername} disabled={saving}>
                {saving ? '…' : (ar ? 'حفظ' : 'Save')}
              </button>
              <button
                type="button"
                className="profile-edit-btn"
                onClick={() => { setEditing(false); setUsername(profile.username ?? '') }}
                aria-label={ar ? 'إلغاء' : 'Cancel'}
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="profile-name">
              <strong>{profile.username}</strong>
              {saved ? <span className="gain" aria-live="polite">✓</span> : null}
              <button type="button" className="profile-edit-btn" onClick={() => setEditing(true)}>
                {ar ? 'تعديل' : 'Edit'}
              </button>
            </div>
          )}
          <span className="profile-email" dir="ltr">{user.email}</span>
        </div>
      </section>

      <nav className="profile-shortcuts" aria-label={ar ? 'اختصارات' : 'Shortcuts'}>
        {SHORTCUTS.map(s => (
          <Link key={s.href} href={s.href}>{ar ? s.ar : s.en}</Link>
        ))}
      </nav>

      <section className="app-card profile-referral">
        <h2>{ar ? 'رمز الإحالة' : 'Referral code'}</h2>
        <div className="profile-referral-row">
          <code>{profile.referral_code ?? (ar ? 'جاري الإنشاء…' : 'Generating…')}</code>
          <button type="button" className="profile-copy" onClick={copyCode} disabled={!profile.referral_code}>
            {copied ? '✓' : (ar ? 'نسخ' : 'Copy')}
          </button>
        </div>
        <p>
          {ar
            ? 'شارك رمزك مع أصدقائك وادعهم للانضمام إلى منصة بورصة العراق'
            : 'Share your code and invite friends to join the platform'}
        </p>
      </section>

      <button type="button" className="profile-signout" onClick={signOut}>
        {ar ? 'تسجيل الخروج' : 'Sign out'}
      </button>
    </main>
  )
}
