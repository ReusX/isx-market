'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// Note: does NOT import useApp — AppContext imports this file, so importing
// useApp here would create a circular dependency. Lang is passed as a prop instead.
interface Props { onClose: () => void; defaultTab?: 'signin' | 'signup'; lang?: string }

type Tab = 'signin' | 'signup'

export default function AuthModal({ onClose, defaultTab = 'signin', lang = 'ar' }: Props) {
  const [tab, setTab]         = useState<Tab>(defaultTab)
  const [email, setEmail]     = useState('')
  const [password, setPass]   = useState('')
  const [username, setUser]   = useState('')
  const [refCode, setRef]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [done, setDone]       = useState(false)
  const ar                    = lang === 'ar'
  const sb                    = createClient()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (tab === 'signin') {
        const { error } = await sb.auth.signInWithPassword({ email, password })
        if (error) throw error
        onClose()
      } else {
        const { data, error } = await sb.auth.signUp({ email, password })
        if (error) throw error
        if (data.user) {
          // Create profile row
          await sb.from('profiles').upsert({
            id: data.user.id,
            email,
            username: username || email.split('@')[0],
            referral_code: Math.random().toString(36).slice(2, 8).toUpperCase(),
            referred_by: refCode || null,
            points: 0,
            streak: 0,
          })
          // Award referrer bonus if valid ref code
          if (refCode) {
            const { data: ref } = await sb.from('profiles')
              .select('id, points').eq('referral_code', refCode.toUpperCase()).single()
            if (ref) {
              await sb.from('profiles').update({ points: (ref.points ?? 0) + 500 }).eq('id', ref.id)
            }
          }
        }
        setDone(true)
      }
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '10px 12px',
    background: 'var(--surf3)', border: '1px solid var(--line2)',
    borderRadius: 10, color: 'var(--ink)', fontSize: 13,
    fontFamily: 'inherit', outline: 'none',
  }
  const btn: React.CSSProperties = {
    width: '100%', padding: '11px', background: 'var(--brand)',
    border: 'none', borderRadius: 10, color: '#fff',
    fontWeight: 700, fontSize: 14, fontFamily: 'inherit',
    opacity: loading ? 0.6 : 1,
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surf2)', border: '1px solid var(--line2)',
          borderRadius: 20, padding: 28, width: '100%', maxWidth: 380,
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              width: 38, height: 38, borderRadius: 11, flexShrink: 0,
              background: 'var(--brand-soft)', border: '1px solid var(--line2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <img src="/favicon-192.png" alt="ISX" width={22} height={22} style={{ borderRadius: 5 }} />
            </span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--ink)' }}>
                {ar ? 'مرحباً بك في بورصة العراق' : 'Welcome to ISX'}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--ink4)', marginTop: 2 }}>
                {ar ? 'تابع السوق وأنشئ قوائمك الخاصة' : 'Track the market and build your watchlists'}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--ink3)', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', background: 'var(--surf3)', borderRadius: 10,
          padding: 3, marginBottom: 20, gap: 3,
        }}>
          {(['signin', 'signup'] as Tab[]).map(t => (
            <button key={t} onClick={() => { setTab(t); setError(null) }}
              style={{
                flex: 1, padding: '8px', borderRadius: 8, border: 'none',
                background: tab === t ? 'var(--surf2)' : 'none',
                color: tab === t ? 'var(--ink)' : 'var(--ink3)',
                fontWeight: 700, fontSize: 13, fontFamily: 'inherit',
                boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.3)' : 'none',
              }}
            >
              {t === 'signin'
                ? (ar ? 'دخول' : 'Sign In')
                : (ar ? 'حساب جديد' : 'Sign Up')}
            </button>
          ))}
        </div>

        {done ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📧</div>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>
              {ar ? 'تحقق من بريدك الإلكتروني' : 'Check your email'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink3)' }}>
              {ar
                ? 'أرسلنا لك رابط التأكيد'
                : 'We sent you a confirmation link'}
            </div>
          </div>
        ) : (
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {tab === 'signup' && (
              <input
                style={inp} type="text" required
                placeholder={ar ? 'اسم المستخدم' : 'Username'}
                value={username} onChange={e => setUser(e.target.value)}
              />
            )}
            <input
              style={inp} type="email" required
              placeholder={ar ? 'البريد الإلكتروني' : 'Email'}
              value={email} onChange={e => setEmail(e.target.value)}
            />
            <input
              style={inp} type="password" required minLength={6}
              placeholder={ar ? 'كلمة المرور (٦ أحرف+)' : 'Password (6+ chars)'}
              value={password} onChange={e => setPass(e.target.value)}
            />
            {tab === 'signup' && (
              <input
                style={inp} type="text" maxLength={8}
                placeholder={ar ? 'رمز الإحالة (اختياري)' : 'Referral code (optional)'}
                value={refCode} onChange={e => setRef(e.target.value.toUpperCase())}
              />
            )}
            {error && (
              <div style={{
                padding: '8px 12px', background: 'rgba(239,68,68,0.12)',
                border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8,
                fontSize: 12, color: 'var(--dn)',
              }}>{error}</div>
            )}
            <button type="submit" disabled={loading} style={btn}>
              {loading ? '…' : tab === 'signin'
                ? (ar ? 'دخول' : 'Sign In')
                : (ar ? 'إنشاء حساب' : 'Create Account')}
            </button>
            {tab === 'signup' && (
              <p style={{ fontSize: 10, color: 'var(--ink4)', textAlign: 'center', margin: 0 }}>
                {ar
                  ? 'انضم إلى مجتمع مستثمري بورصة العراق'
                  : 'Join the Iraq Stock Market investor community'}
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
