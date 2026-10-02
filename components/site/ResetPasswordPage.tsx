'use client'

export const dynamic = 'force-dynamic'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocale } from '@/context/LocaleContext'
import { useRouter } from 'next/navigation'
import { useApp } from '@/context/AppContext'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { AuthShell, PasswordField, Submit, Outcome } from './AuthKit'

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
 * Drawn with the auth family's own shell and fields (AuthKit), like /login.
 */

type Phase = 'checking' | 'ready' | 'invalid' | 'saved'

const MIN_LEN = 8

export function ResetPassword() {
  const { locale, href: L } = useLocale()
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

  const title = ar ? 'كلمة مرور جديدة' : 'New password'
  return (
    <AuthShell title={title} lede={phase === 'ready' ? (ar ? 'اختر كلمة مرور جديدة' : 'Choose a new password') : undefined}>
      {phase === 'checking' ? <p className="id-cap" aria-busy="true">…</p> : null}

      {phase === 'invalid' ? (
        <Outcome tone="bad" title={ar ? 'الرابط لم يعد صالحاً' : 'This link is no longer valid'}
          actions={<Link href={L('/forgot-password')}>{ar ? 'اطلب رابطاً جديداً' : 'Request a new link'}</Link>}>
          {ar
            ? 'روابط إعادة التعيين تنتهي صلاحيتها بعد فترة قصيرة، وتُستخدم مرة واحدة فقط. اطلب رابطاً جديداً وافتحه من نفس المتصفح.'
            : 'Reset links expire after a short while and work only once. Request a new one and open it in the same browser.'}
          {/* The reason, verbatim from Supabase, in an LTR island — it is
              English regardless of the interface language. */}
          {linkError ? <span dir="ltr" className="id-cap ath-reason">{linkError}</span> : null}
        </Outcome>
      ) : null}

      {phase === 'saved' ? (
        <Outcome tone="good" title={ar ? 'تم تغيير كلمة المرور' : 'Password changed'}>
          {ar ? 'جارٍ نقلك إلى حسابك…' : 'Taking you to your account…'}
        </Outcome>
      ) : null}

      {phase === 'ready' ? (
        <form className="ath-form" onSubmit={submit} noValidate>
          <PasswordField id="reset-pw" label={ar ? 'كلمة المرور الجديدة' : 'New password'} value={password} onChange={setPassword} autoComplete="new-password" autoFocus locale={ar ? 'ar' : 'en'} />
          <PasswordField id="reset-confirm" label={ar ? 'تأكيد كلمة المرور' : 'Confirm password'} value={confirm} onChange={setConfirm} autoComplete="new-password" locale={ar ? 'ar' : 'en'} error={error} />
          <Submit busy={saving} busyLabel="…">{ar ? 'حفظ كلمة المرور' : 'Save password'}</Submit>
        </form>
      ) : null}
    </AuthShell>
  )
}
