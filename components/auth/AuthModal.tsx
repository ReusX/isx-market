'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// Note: does NOT import useApp · AppContext imports this file, so importing
// useApp here would create a circular dependency. Lang is passed as a prop instead.
interface Props { onClose: () => void; defaultTab?: 'signin' | 'signup'; lang?: string }

type Tab = 'signin' | 'signup'

export default function AuthModal({ onClose, defaultTab = 'signin', lang = 'ar' }: Props) {
  const [tab, setTab] = useState<Tab>(defaultTab)
  const [email, setEmail] = useState('')
  const [password, setPass] = useState('')
  const [username, setUser] = useState('')
  const [refCode, setRef] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<'signup' | 'reset' | null>(null)
  // Seconds left before the mail can be sent again. Supabase rate-limits resends
  // server-side; without a cooldown the button just collects 429s and the user
  // reads them as "it is broken" rather than "wait a moment".
  const [cooldown, setCooldown] = useState(0)
  const [resent, setResent] = useState(false)
  const ar = lang === 'ar'
  const sb = createClient()
  const firstFieldRef = useRef<HTMLInputElement>(null)

  // Escape closes; focus lands on the first field so the keyboard works.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    firstFieldRef.current?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

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
            streak: 0,
          })
        }
        setDone('signup')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  // Tick the resend cooldown down to zero.
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  /*
   * «تحقق من بريدك» was a terminal state: `auth.resend` was called nowhere in
   * the repository, so a confirmation mail that never arrived left the user with
   * no path forward at all — not even a second attempt.
   */
  async function resend() {
    if (cooldown > 0 || !email) return
    setError(null)
    setResent(false)
    setLoading(true)
    try {
      if (done === 'signup') {
        const { error } = await sb.auth.resend({
          type: 'signup',
          email,
          options: { emailRedirectTo: `${window.location.origin}/profile` },
        })
        if (error) throw error
      } else {
        const { error } = await sb.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/reset`,
        })
        if (error) throw error
      }
      setResent(true)
      setCooldown(60)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function resetPassword() {
    if (!email) {
      setError(ar ? 'أدخل بريدك الإلكتروني أولاً' : 'Enter your email first')
      return
    }
    setError(null)
    setLoading(true)
    try {
      // /profile has no password field. The link has to land somewhere that can
      // actually call updateUser, which is what /auth/reset exists to do.
      const { error } = await sb.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset`,
      })
      if (error) throw error
      setDone('reset')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div
        className="auth-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
        onClick={e => e.stopPropagation()}
      >
        <div className="auth-head">
          <div>
            <strong id="auth-title">{ar ? 'مرحباً بك في IQWealth' : 'Welcome to IQWealth'}</strong>
            <span>{ar ? 'تابع السوق وأنشئ قوائمك الخاصة' : 'Track the market and build your watchlists'}</span>
          </div>
          <button type="button" className="auth-close" onClick={onClose} aria-label={ar ? 'إغلاق' : 'Close'}>×</button>
        </div>

        {done ? (
          <div className="auth-done">
            <strong>
              {done === 'signup'
                ? (ar ? 'تحقق من بريدك الإلكتروني' : 'Check your email')
                : (ar ? 'أرسلنا رابط إعادة التعيين' : 'Reset link sent')}
            </strong>
            <span>
              {done === 'signup'
                ? (ar ? 'أرسلنا لك رابط التأكيد.' : 'We sent you a confirmation link.')
                : (ar ? 'افتح الرابط لاختيار كلمة مرور جديدة.' : 'Open it to choose a new password.')}
            </span>
            {/* The address is Latin text; it reads backwards without an island. */}
            <span dir="ltr" className="auth-sent-to">{email}</span>

            {error ? <div className="auth-error" role="alert">{error}</div> : null}
            {resent ? (
              <span role="status" className="gain">
                {ar ? 'أُرسل مرة أخرى ✓' : 'Sent again ✓'}
              </span>
            ) : null}

            <button type="button" className="auth-link" onClick={resend} disabled={loading || cooldown > 0}>
              {cooldown > 0
                ? (ar ? `إعادة الإرسال بعد ${cooldown} ثانية` : `Resend in ${cooldown}s`)
                : (ar ? 'لم يصلك البريد؟ أعد الإرسال' : "Didn't get the email? Resend")}
            </button>
          </div>
        ) : (
          <>
            <div className="seg-control auth-tabs" role="group">
              {(['signin', 'signup'] as Tab[]).map(t => (
                <button
                  key={t}
                  type="button"
                  className={tab === t ? 'seg-btn is-active' : 'seg-btn'}
                  aria-pressed={tab === t}
                  onClick={() => { setTab(t); setError(null) }}
                >
                  {t === 'signin' ? (ar ? 'دخول' : 'Sign in') : (ar ? 'حساب جديد' : 'Sign up')}
                </button>
              ))}
            </div>

            <form className="auth-form" onSubmit={submit}>
              {tab === 'signup' ? (
                <label className="tool-field">
                  <span>{ar ? 'اسم المستخدم' : 'Username'}</span>
                  <input type="text" required value={username} onChange={e => setUser(e.target.value)} autoComplete="username" />
                </label>
              ) : null}

              <label className="tool-field">
                <span>{ar ? 'البريد الإلكتروني' : 'Email'}</span>
                <input
                  ref={tab === 'signin' ? firstFieldRef : undefined}
                  type="email"
                  required
                  dir="ltr"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </label>

              <label className="tool-field">
                <span>{ar ? 'كلمة المرور' : 'Password'}</span>
                <input
                  type="password"
                  required
                  minLength={6}
                  dir="ltr"
                  value={password}
                  onChange={e => setPass(e.target.value)}
                  autoComplete={tab === 'signin' ? 'current-password' : 'new-password'}
                />
              </label>

              {tab === 'signup' ? (
                <label className="tool-field">
                  <span>{ar ? 'رمز الإحالة (اختياري)' : 'Referral code (optional)'}</span>
                  <input type="text" maxLength={8} dir="ltr" value={refCode} onChange={e => setRef(e.target.value.toUpperCase())} />
                </label>
              ) : null}

              {error ? <div className="auth-error" role="alert">{error}</div> : null}

              <button type="submit" className="auth-submit" disabled={loading}>
                {loading ? '…' : tab === 'signin'
                  ? (ar ? 'دخول' : 'Sign in')
                  : (ar ? 'إنشاء حساب' : 'Create account')}
              </button>

              {tab === 'signin' ? (
                <button type="button" className="auth-link" onClick={resetPassword} disabled={loading}>
                  {ar ? 'نسيت كلمة المرور؟' : 'Forgot your password?'}
                </button>
              ) : (
                <p className="auth-note">
                  {ar ? 'انضم إلى مجتمع مستثمري IQWealth' : 'Join the IQWealth investor community'}
                </p>
              )}
            </form>
          </>
        )}
      </div>
    </div>
  )
}
