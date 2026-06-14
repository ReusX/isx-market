'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
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
    <div style={{ maxWidth: 600, margin: '80px auto', textAlign: 'center', padding: '0 24px' }}>
      <div className="skeleton" style={{ width: 64, height: 64, borderRadius: '50%', margin: '0 auto 16px' }} />
      <div className="skeleton" style={{ width: 160, height: 18, borderRadius: 8, margin: '0 auto 8px' }} />
      <div className="skeleton" style={{ width: 120, height: 14, borderRadius: 8, margin: '0 auto' }} />
    </div>
  )

  if (!user) return (
    <div style={{ maxWidth: 600, margin: '80px auto', textAlign: 'center', padding: '0 24px' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>👤</div>
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>
        {ar ? 'يجب تسجيل الدخول' : 'Sign in required'}
      </div>
      <button onClick={() => openAuth('signin')} style={{
        padding: '9px 20px', background: 'var(--brand)', borderRadius: 10,
        fontSize: 13, fontWeight: 700, color: '#fff', border: 'none', fontFamily: 'inherit',
      }}>
        {ar ? 'تسجيل الدخول' : 'Sign In'}
      </button>
    </div>
  )

  if (!profile) return (
    <div style={{ maxWidth: 600, margin: '40px auto', padding: '0 24px' }}>
      {[80, 120, 80].map((h, i) => (
        <div key={i} className="skeleton" style={{ height: h, borderRadius: 16, marginBottom: 12 }} />
      ))}
    </div>
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

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '24px' }}>
      {/* Avatar & name */}
      <div style={{
        background: 'var(--surf)', border: '1px solid var(--line)',
        borderRadius: 20, padding: '24px', marginBottom: 16,
        display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'var(--brand)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 24, fontWeight: 800, color: '#fff', flexShrink: 0,
        }}>
          {(profile.username ?? user.email ?? '?')[0].toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          {editing ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input value={username} onChange={e => setUsername(e.target.value)} autoFocus
                style={{
                  padding: '7px 10px', borderRadius: 8, background: 'var(--surf3)',
                  border: '1px solid var(--brand)', color: 'var(--ink)', fontFamily: 'inherit',
                  fontSize: 15, fontWeight: 700, outline: 'none', width: 160,
                }} />
              <button onClick={saveUsername} disabled={saving} style={{
                padding: '7px 14px', background: 'var(--brand)', borderRadius: 8,
                border: 'none', color: '#fff', fontWeight: 700, fontSize: 12, fontFamily: 'inherit',
              }}>
                {saving ? '...' : (ar ? 'حفظ' : 'Save')}
              </button>
              <button onClick={() => { setEditing(false); setUsername(profile.username ?? '') }} style={{
                padding: '7px 12px', background: 'var(--surf3)', borderRadius: 8,
                border: 'none', color: 'var(--ink3)', fontSize: 12, fontFamily: 'inherit',
              }}>✕</button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontWeight: 800, fontSize: 18 }}>{profile.username}</span>
              {saved && <span style={{ fontSize: 11, color: 'var(--up)' }}>✓</span>}
              <button onClick={() => setEditing(true)} style={{
                background: 'none', border: '1px solid var(--line)', borderRadius: 6,
                padding: '3px 9px', fontSize: 11, color: 'var(--ink4)', fontFamily: 'inherit', cursor: 'pointer',
              }}>
                {ar ? 'تعديل' : 'Edit'}
              </button>
            </div>
          )}
          <div style={{ fontSize: 12, color: 'var(--ink4)', marginTop: 4 }}>{user.email}</div>
        </div>
      </div>

      {/* Referral */}
      <div style={{ background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 14, padding: '16px', marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>
          {ar ? '👥 رمز الإحالة' : '👥 Referral Code'}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          <div style={{
            flex: 1, padding: '10px 14px', background: 'var(--surf3)',
            borderRadius: 10, fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 16,
            letterSpacing: '0.15em', color: profile.referral_code ? 'var(--gold)' : 'var(--ink4)',
          }}>
            {profile.referral_code ?? (ar ? 'جاري الإنشاء...' : 'Generating...')}
          </div>
          <button onClick={copyCode} disabled={!profile.referral_code} style={{
            padding: '10px 16px', borderRadius: 10, border: '1px solid var(--line)',
            background: copied ? 'var(--up)' : 'var(--surf3)',
            color: copied ? '#fff' : 'var(--ink3)',
            fontSize: 12, fontFamily: 'inherit', fontWeight: 700,
            transition: 'all 0.2s', cursor: profile.referral_code ? 'pointer' : 'not-allowed',
          }}>
            {copied ? '✓' : (ar ? 'نسخ' : 'Copy')}
          </button>
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink4)', lineHeight: 1.6 }}>
          {ar
            ? 'شارك رمزك مع أصدقائك وادعهم للانضمام إلى منصة بورصة العراق'
            : 'Share your code and invite friends to join Iraq Stock Market'}
        </div>
      </div>

      {/* Sign out */}
      <button onClick={signOut} style={{
        width: '100%', padding: '11px', borderRadius: 12,
        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
        color: 'var(--dn)', fontWeight: 700, fontSize: 14, fontFamily: 'inherit', cursor: 'pointer',
      }}>
        {ar ? 'تسجيل الخروج' : 'Sign Out'}
      </button>
    </div>
  )
}
