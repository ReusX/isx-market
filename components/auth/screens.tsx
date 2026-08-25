'use client'

import { useEffect, useState } from 'react'
import { useLocale } from '@/context/LocaleContext'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useApp } from '@/context/AppContext'
import { createClient } from '@/lib/supabase/client'
import {
  AuthShell, Field, PasswordField, AuthError, Submit, Outcome,
} from '@/components/auth/AuthShell'
import {
  checkEmail, checkPassword, checkConfirm, authErrorId, RESEND_COOLDOWN,
  BENEFITS, BENEFITS_EN, type AuthErrorId, type FieldError,
} from '@/lib/auth'

/**
 * The auth family — the approved presentation on the real Supabase calls.
 *
 * The view is the design's. The behaviour is production's, including the
 * Phase 0 fixes that must not regress: the reset link points at /auth/reset
 * rather than /profile, the resend has a real cooldown, and the recovery
 * session is waited for rather than exchanged by hand.
 *
 * `?next=` is deliberately NOT implemented. Nothing in the product currently
 * sends a signed-out user to a login URL — every personal route renders its
 * own signed-out state inline — so there is no handoff to preserve, and adding
 * one means adding an open-redirect surface for a flow nobody uses yet.
 */

const ar = (l: string) => l === 'ar'

/* ── Login ────────────────────────────────────────────────────────────────── */
export function LoginScreen() {
  const { user } = useApp()
  const { locale, href: L } = useLocale()
  const router = useRouter()
  const isAr = locale === 'ar'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailErr, setEmailErr] = useState<FieldError>(null)
  const [pwErr, setPwErr] = useState<FieldError>(null)
  const [formError, setFormError] = useState<AuthErrorId | null>(null)
  const [busy, setBusy] = useState(false)

  // Already signed in? This page has nothing to offer.
  useEffect(() => { if (user) router.replace(L('/profile')) }, [user, router])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const ee = checkEmail(email, locale), pe = checkPassword(password, locale)
    setEmailErr(ee); setPwErr(pe)
    if (ee || pe) return
    setBusy(true); setFormError(null)
    try {
      const { error } = await createClient().auth.signInWithPassword({ email, password })
      if (error) { setFormError(authErrorId(error)); return }
      router.replace(L('/profile'))
    } catch (err) {
      setFormError(authErrorId(err))
    } finally { setBusy(false) }
  }

  return (
    <AuthShell
      title={isAr ? 'تسجيل الدخول' : 'Sign in'}
      lede={isAr ? 'للوصول إلى محفظتك وقوائمك عبر أجهزتك.' : 'To reach your portfolio and watchlist across your devices.'}
      footer={
        <p>
          {isAr ? 'ليس لديك حساب؟' : 'New to IQWealth?'}{' '}
          <Link href={L('/signup')}>{isAr ? 'إنشاء حساب' : 'Create an account'}</Link>
        </p>
      }>
      {formError ? (
        <AuthError id={formError} locale={locale}
          action={formError === 'unconfirmed'
            ? <Link href={L(`/verify-email?email=${encodeURIComponent(email)}`)}>
                {isAr ? 'إعادة إرسال الرابط' : 'Resend link'}
              </Link>
            : formError === 'credentials'
              ? <Link href={L("/forgot-password")}>{isAr ? 'نسيت كلمة المرور؟' : 'Forgot your password?'}</Link>
              : undefined} />
      ) : null}

      <form className="au-form" onSubmit={submit} noValidate>
        <Field id="email" label={isAr ? 'البريد الإلكتروني' : 'Email'} type="email"
          value={email} onChange={setEmail} error={emailErr} ltr inputMode="email"
          autoComplete="email" autoFocus disabled={busy}
          onBlur={() => setEmailErr(checkEmail(email, locale))} />
        <PasswordField id="password" label={isAr ? 'كلمة المرور' : 'Password'}
          value={password} onChange={setPassword} error={pwErr}
          autoComplete="current-password" disabled={busy} locale={locale}
          hint={<Link href={L("/forgot-password")}>{isAr ? 'نسيت كلمة المرور؟' : 'Forgot your password?'}</Link>} />
        <Submit busy={busy} busyLabel={isAr ? 'جارٍ الدخول' : 'Signing in…'}>
          {isAr ? 'تسجيل الدخول' : 'Sign in'}
        </Submit>
      </form>
    </AuthShell>
  )
}

/* ── Sign up ──────────────────────────────────────────────────────────────── */
export function SignUpScreen() {
  const { user } = useApp()
  const { locale, href: L } = useLocale()
  const router = useRouter()
  const isAr = locale === 'ar'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [emailErr, setEmailErr] = useState<FieldError>(null)
  const [pwErr, setPwErr] = useState<FieldError>(null)
  const [cErr, setCErr] = useState<FieldError>(null)
  const [formError, setFormError] = useState<AuthErrorId | null>(null)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => { if (user && !sent) router.replace(L('/profile')) }, [user, sent, router])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const ee = checkEmail(email, locale), pe = checkPassword(password, locale)
    const ce = checkConfirm(password, confirm, locale)
    setEmailErr(ee); setPwErr(pe); setCErr(ce)
    if (ee || pe || ce) return
    setBusy(true); setFormError(null)
    try {
      const { error } = await createClient().auth.signUp({
        email, password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) { setFormError(authErrorId(error)); return }
      setSent(true)
    } catch (err) {
      setFormError(authErrorId(err))
    } finally { setBusy(false) }
  }

  if (sent) {
    return (
      <AuthShell title={isAr ? 'تحقق من بريدك الإلكتروني' : 'Check your email'}>
        <Outcome title={isAr ? 'أرسلنا رابط التحقق إلى بريدك.' : 'We sent a verification link to your email address.'}
          actions={<Link className="au-submit" href={L(`/verify-email?email=${encodeURIComponent(email)}`)}>
            {isAr ? 'لم يصل الرابط؟' : 'Didn’t get it?'}
          </Link>}>
          <p>
            {isAr ? 'أرسلنا رابط تأكيد إلى ' : 'We sent a verification link to '}
            <bdi dir="ltr">{email}</bdi>
            {isAr ? '. افتحه لتفعيل حسابك.' : '. Open it to activate your account.'}
          </p>
        </Outcome>
      </AuthShell>
    )
  }

  return (
    <AuthShell wide
      title={isAr ? 'إنشاء حساب' : 'Create an account'}
      lede={isAr ? 'أنشئ حسابك لمتابعة الشركات وإدارة محفظتك.' : 'Create an account to track companies and manage your portfolio.'}
      footer={
        <p>
          {isAr ? 'لديك حساب؟' : 'Already have an account?'}{' '}
          <Link href={L("/login")}>{isAr ? 'تسجيل الدخول' : 'Sign in'}</Link>
        </p>
      }>
      {formError ? (
        <AuthError id={formError} locale={locale}
          action={formError === 'exists'
            ? <Link href={L("/login")}>{isAr ? 'تسجيل الدخول بدلاً من ذلك' : 'Sign in instead'}</Link>
            : undefined} />
      ) : null}

      <div className="au-wide">
        <form className="au-form" onSubmit={submit} noValidate>
          <Field id="email" label={isAr ? 'البريد الإلكتروني' : 'Email'} type="email"
            value={email} onChange={setEmail} error={emailErr} ltr inputMode="email"
            autoComplete="email" autoFocus disabled={busy}
            onBlur={() => setEmailErr(checkEmail(email, locale))} />
          <PasswordField id="password" label={isAr ? 'كلمة المرور' : 'Password'}
            value={password} onChange={setPassword} error={pwErr}
            autoComplete="new-password" disabled={busy} locale={locale}
            hint={isAr ? 'ستة أحرف على الأقل.' : 'At least six characters.'} />
          <PasswordField id="confirm" label={isAr ? 'تأكيد كلمة المرور' : 'Confirm password'}
            value={confirm} onChange={setConfirm} error={cErr}
            autoComplete="new-password" disabled={busy} locale={locale} />
          <Submit busy={busy} busyLabel={isAr ? 'جارٍ الإنشاء' : 'Creating'}>
            {isAr ? 'إنشاء الحساب' : 'Create account'}
          </Submit>
        </form>

        <ul className="au-benefits">
          {(isAr ? BENEFITS : BENEFITS_EN).map(b => (
            <li key={b.title}><strong>{b.title}</strong><span>{b.note}</span></li>
          ))}
        </ul>
      </div>
    </AuthShell>
  )
}

/* ── Verify email · resend with a real cooldown ───────────────────────────── */
export function VerifyEmailScreen() {
  const { locale, href: L } = useLocale()
  const isAr = locale === 'ar'
  const params = useSearchParams()
  const [email, setEmail] = useState(params.get('email') ?? '')
  const [cooldown, setCooldown] = useState(0)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [formError, setFormError] = useState<AuthErrorId | null>(null)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  async function resend() {
    const ee = checkEmail(email, locale)
    if (ee) { setFormError('unknown'); return }
    setBusy(true); setFormError(null)
    try {
      const { error } = await createClient().auth.resend({
        type: 'signup', email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) { setFormError(authErrorId(error)); return }
      setSent(true); setCooldown(RESEND_COOLDOWN)
    } catch (err) {
      setFormError(authErrorId(err))
    } finally { setBusy(false) }
  }

  return (
    <AuthShell title={isAr ? 'تفعيل الحساب' : 'Verify your email'}
      footer={<p><Link href={L("/login")}>{isAr ? 'العودة إلى تسجيل الدخول' : 'Back to sign in'}</Link></p>}>
      {formError ? <AuthError id={formError} locale={locale} /> : null}
      <Outcome tone={sent ? 'good' : 'neutral'}
        title={sent
          ? (isAr ? 'أُرسل رابط جديد' : 'A new link is on its way')
          : (isAr ? 'افتح الرابط المرسل إلى بريدك' : 'Open the link we emailed you')}>
        <p>
          {isAr
            ? 'لا يمكن تسجيل الدخول قبل تفعيل الحساب. إن لم يصل الرابط، تحقّق من مجلد الرسائل غير المرغوبة أو اطلب رابطاً جديداً.'
            : 'You cannot sign in until the account is activated. If the link has not arrived, check your spam folder or request a new one.'}
        </p>
        <form className="au-form" onSubmit={e => { e.preventDefault(); resend() }} noValidate>
          <Field id="verify-email" label={isAr ? 'البريد الإلكتروني' : 'Email'} type="email"
            value={email} onChange={setEmail} ltr inputMode="email" autoComplete="email" disabled={busy} />
          <Submit busy={busy} disabled={cooldown > 0}
            busyLabel={isAr ? 'جارٍ الإرسال' : 'Sending'}>
            {cooldown > 0
              ? (isAr ? `يمكن إعادة الإرسال بعد ${cooldown} ثانية` : `Resend in ${cooldown}s`)
              : (isAr ? 'إرسال رابط جديد' : 'Send a new link')}
          </Submit>
        </form>
      </Outcome>
    </AuthShell>
  )
}

/* ── Forgot password ──────────────────────────────────────────────────────── */
export function ForgotPasswordScreen() {
  const { locale, href: L } = useLocale()
  const isAr = locale === 'ar'
  const [email, setEmail] = useState('')
  const [emailErr, setEmailErr] = useState<FieldError>(null)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const ee = checkEmail(email, locale)
    setEmailErr(ee)
    if (ee) return
    setBusy(true)
    try {
      // Deliberately not surfacing the outcome: telling a stranger whether an
      // address is registered is an account-enumeration leak. The message is
      // the same either way.
      await createClient().auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset`,
      })
    } finally {
      setBusy(false); setSent(true)
    }
  }

  return (
    <AuthShell title={isAr ? 'إعادة تعيين كلمة المرور' : 'Reset your password'}
      footer={<p><Link href={L("/login")}>{isAr ? 'العودة إلى تسجيل الدخول' : 'Back to sign in'}</Link></p>}>
      {sent ? (
        <Outcome tone="good" title={isAr ? 'إن كان البريد مسجّلاً، وصله رابط' : 'If that address is registered, a link is on its way'}>
          <p>
            {isAr
              ? 'افتح الرابط من البريد لتعيين كلمة مرور جديدة. صلاحية الرابط محدودة، وقد يصل إلى مجلد الرسائل غير المرغوبة.'
              : 'Open it to set a new password. The link expires, and it may land in your spam folder.'}
          </p>
        </Outcome>
      ) : (
        <form className="au-form" onSubmit={submit} noValidate>
          <Field id="forgot-email" label={isAr ? 'البريد الإلكتروني' : 'Email'} type="email"
            value={email} onChange={setEmail} error={emailErr} ltr inputMode="email"
            autoComplete="email" autoFocus disabled={busy}
            onBlur={() => setEmailErr(checkEmail(email, locale))}
            hint={isAr ? 'سنرسل رابطاً لتعيين كلمة مرور جديدة.' : "We'll email a link to set a new password."} />
          <Submit busy={busy} busyLabel={isAr ? 'جارٍ الإرسال' : 'Sending'}>
            {isAr ? 'إرسال الرابط' : 'Send the link'}
          </Submit>
        </form>
      )}
    </AuthShell>
  )
}
