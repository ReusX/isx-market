'use client'

export const dynamic = 'force-dynamic'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocale } from '@/context/LocaleContext'
import { useRouter } from 'next/navigation'
import { useApp } from '@/context/AppContext'
import { createClient } from '@/lib/supabase/client'

/*
 * Where a password-reset link lands.
 *
 * Until now `resetPasswordForEmail` pointed at /profile, and `updateUser` was
 * called nowhere in the repository — so the link dropped the user into a
 * recovery session on a page with no password field and no way out. This is the
 * missing half of that flow.
 *
 * Getting the session is the fiddly part. The browser client is created by
 * `createBrowserClient`, which runs PKCE with `detectSessionInUrl`, so it
 * consumes `?code=` (or a `#access_token` hash, on projects still using the
 * implicit flow) on its own, asynchronously, as the page loads. We therefore do
 * not exchange anything by hand — we wait, via both `onAuthStateChange` and one
 * `getSession()` read, because whichever fires first is a race we do not get to
 * decide. Only when a session exists is the form shown.
 *
 * Deliberately visual-minimum. It reuses the shell's existing classes and gets
 * its real design in the auth phase; shipping a page that works beats leaving
 * the flow broken until the redesign reaches it.
 */

type Phase = 'checking' | 'ready' | 'invalid' | 'saved'

const MIN_LEN = 8

export default function ResetPasswordPage() {
  const { locale } = useLocale()
  const ar = locale === 'ar'
  const router = useRouter()
  const sb = createClient()

  const [phase, setPhase] = useState<Phase>('checking')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [linkError, setLinkError] = useState<string | null>(null)
  const settled = useRef(false)

  // ── wait for the recovery session ────────────────────────────────────────
  useEffect(() => {
    // Supabase reports a dead link in the query string or the hash depending on
    // the flow, and an expired code is the single most likely way to arrive
    // here. Read it before anything else so the user is told why, rather than
    // being shown a form that cannot work.
    const search = new URLSearchParams(window.location.search)
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const err = search.get('error_description') || search.get('error')
      || hash.get('error_description') || hash.get('error')
    if (err) {
      settled.current = true
      setLinkError(err.replace(/\+/g, ' '))
      setPhase('invalid')
      return
    }

    const settle = (hasSession: boolean) => {
      if (settled.current) return
      settled.current = true
      setPhase(hasSession ? 'ready' : 'invalid')
    }

    const { data: sub } = sb.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || session) {
        settle(true)
      }
    })

    // The listener alone is not enough: if the exchange completed before this
    // effect ran, no event is coming.
    sb.auth.getSession().then(({ data }) => { if (data.session) settle(true) })

    // And neither is enough if the link carried nothing at all — somebody
    // opening /auth/reset directly gets no event and no session, forever.
    const giveUp = setTimeout(() => settle(false), 4000)

    return () => { sub.subscription.unsubscribe(); clearTimeout(giveUp) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const submit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < MIN_LEN) {
      setError(ar ? `كلمة المرور يجب أن تكون ${MIN_LEN} أحرف على الأقل` : `Password must be at least ${MIN_LEN} characters`)
      return
    }
    if (password !== confirm) {
      setError(ar ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match')
      return
    }

    setSaving(true)
    try {
      const { error } = await sb.auth.updateUser({ password })
      if (error) throw error
      setPhase('saved')
      // The recovery session is a real session, so the user is now signed in.
      setTimeout(() => router.push('/profile'), 1600)
    } catch (err) {
      setError(err instanceof Error ? err.message : (ar ? 'تعذّر حفظ كلمة المرور' : 'Could not save the password'))
    } finally {
      setSaving(false)
    }
  }, [password, confirm, ar, sb, router])

  return (
    <main className="terminal-shell app-page">
      <h1 className="sr-only">{ar ? 'كلمة مرور جديدة' : 'New password'}</h1>

      {phase === 'checking' ? (
        <div className="app-card reset-card">
          <div className="skeleton reset-skeleton" />
        </div>
      ) : null}

      {phase === 'invalid' ? (
        <div className="empty-state">
          <strong>{ar ? 'الرابط لم يعد صالحاً' : 'This link is no longer valid'}</strong>
          <span>
            {ar
              ? 'روابط إعادة التعيين تنتهي صلاحيتها بعد فترة قصيرة، وتُستخدم مرة واحدة فقط. اطلب رابطاً جديداً وافتحه من نفس المتصفح.'
              : 'Reset links expire after a short while and work only once. Request a new one and open it in the same browser.'}
          </span>
          {/* The reason, verbatim from Supabase, in an LTR island — it is
              English regardless of the interface language. */}
          {linkError ? (
            <span dir="ltr" className="reset-reason">{linkError}</span>
          ) : null}
        </div>
      ) : null}

      {phase === 'saved' ? (
        <div className="empty-state">
          <strong>{ar ? 'تم تغيير كلمة المرور' : 'Password changed'}</strong>
          <span>{ar ? 'جارٍ نقلك إلى حسابك…' : 'Taking you to your account…'}</span>
        </div>
      ) : null}

      {phase === 'ready' ? (
        <div className="app-card reset-card">
          <strong>{ar ? 'اختر كلمة مرور جديدة' : 'Choose a new password'}</strong>
          <form className="auth-form" onSubmit={submit}>
            {/* Passwords are typed left-to-right in every language. */}
            <label className="tool-field">
              <span>{ar ? 'كلمة المرور الجديدة' : 'New password'}</span>
              <input
                type="password"
                dir="ltr"
                autoComplete="new-password"
                autoFocus
                value={password}
                onChange={e => setPassword(e.target.value)}
                minLength={MIN_LEN}
                required
              />
            </label>

            <label className="tool-field">
              <span>{ar ? 'تأكيد كلمة المرور' : 'Confirm password'}</span>
              <input
                type="password"
                dir="ltr"
                autoComplete="new-password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                minLength={MIN_LEN}
                required
              />
            </label>

            {error ? <div className="auth-error" role="alert">{error}</div> : null}

            <button type="submit" className="auth-submit" disabled={saving}>
              {saving ? '…' : (ar ? 'حفظ كلمة المرور' : 'Save password')}
            </button>
          </form>
        </div>
      ) : null}
    </main>
  )
}
