'use client'

import { useEffect, useState } from 'react'
import { useLocale } from '@/context/LocaleContext'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useApp } from '@/context/AppContext'
import { createClient } from '@/lib/supabase/client'
import {
  AuthShell, Field, PasswordField, AuthError, Submit, Outcome,
} from './AuthKit'
import {
  checkEmail, checkPassword, checkConfirm, checkPhone, checkCode, normalizePhone, identityKind,
  authErrorId, RESEND_COOLDOWN, BENEFITS, BENEFITS_EN, type AuthErrorId, type FieldError,
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

/* ── The code step · six digits, by email or SMS ──────────────────────────
   Sign-up with confirmation on ends here: the account exists, the session
   does not, and the reader types the code Supabase sent. `verifyOtp` with
   the right `type` turns it into a session; `resend` asks for another
   code behind a real cooldown. The same step serves email («signup») and
   phone («sms»). If the email template still carries a link, the link
   works too — this page never blocks it. */
export function CodeStep({ email, phone, onDone }: { email?: string; phone?: string; onDone: () => void }) {
  const { locale } = useLocale()
  const isAr = locale === 'ar'
  const [code, setCode] = useState('')
  const [codeErr, setCodeErr] = useState<FieldError>(null)
  const [formError, setFormError] = useState<AuthErrorId | null>(null)
  const [busy, setBusy] = useState(false)
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN)
  const [resent, setResent] = useState(false)
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])
  const target = phone ?? email ?? ''

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const ce = checkCode(code, locale); setCodeErr(ce); if (ce) return
    setBusy(true); setFormError(null)
    try {
      const sb = createClient()
      const { data, error } = phone
        ? await sb.auth.verifyOtp({ phone, token: code.trim(), type: 'sms' })
        : await sb.auth.verifyOtp({ email: email as string, token: code.trim(), type: 'signup' })
      if (error) { setFormError(authErrorId(error)); return }
      if (data.session) onDone()
      else setFormError('unknown')
    } catch (err) { setFormError(authErrorId(err)) } finally { setBusy(false) }
  }
  async function resend() {
    setBusy(true); setFormError(null); setResent(false)
    try {
      const sb = createClient()
      const { error } = phone
        ? await sb.auth.resend({ type: 'sms', phone })
        : await sb.auth.resend({ type: 'signup', email: email as string, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } })
      if (error) { setFormError(authErrorId(error)); return }
      setResent(true); setCooldown(RESEND_COOLDOWN)
    } catch (err) { setFormError(authErrorId(err)) } finally { setBusy(false) }
  }

  return (
    <AuthShell title={isAr ? 'أدخل رمز التحقق' : 'Enter the verification code'}
      lede={<>{phone ? (isAr ? 'أرسلنا رمزاً من ستة أرقام برسالة نصية إلى ' : 'We texted a six-digit code to ') : (isAr ? 'أرسلنا رمزاً من ستة أرقام إلى ' : 'We emailed a six-digit code to ')}<bdi dir="ltr">{target}</bdi>{isAr ? '.' : '.'}</>}>
      {formError ? <AuthError id={formError} locale={locale} /> : null}
      {resent ? <p className="id-note"><b>{isAr ? 'أُرسل رمز جديد.' : 'A new code is on its way.'}</b></p> : null}
      <form className="ath-form" onSubmit={submit} noValidate>
        <Field id="code" label={isAr ? 'الرمز' : 'Code'} value={code} onChange={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
          error={codeErr} ltr inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus disabled={busy} />
        <Submit busy={busy} busyLabel={isAr ? 'جارٍ التحقق' : 'Verifying…'}>{isAr ? 'تأكيد' : 'Verify'}</Submit>
        <p className="id-cap ath-resend">
          {cooldown > 0
            ? (isAr ? `يمكنك طلب رمز جديد بعد ${cooldown} ثانية.` : `You can request a new code in ${cooldown}s.`)
            : <button type="button" className="id-link ath-linkbtn" onClick={resend} disabled={busy}>{isAr ? 'إرسال رمز جديد' : 'Send a new code'}</button>}
        </p>
      </form>
    </AuthShell>
  )
}

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

  /* One field takes either identity: an address or an Iraqi/E.164 number. */
  const checkIdentity = (v: string): FieldError => {
    const k = identityKind(v)
    if (k) return null
    if (!v.trim()) return isAr ? 'أدخل بريدك الإلكتروني أو رقم هاتفك.' : 'Enter your email or phone number.'
    return v.includes('@') ? checkEmail(v, locale) : checkPhone(v, locale)
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const ee = checkIdentity(email), pe = checkPassword(password, locale)
    setEmailErr(ee); setPwErr(pe)
    if (ee || pe) return
    setBusy(true); setFormError(null)
    try {
      const { error } = identityKind(email) === 'phone'
        ? await createClient().auth.signInWithPassword({ phone: normalizePhone(email), password })
        : await createClient().auth.signInWithPassword({ email: email.trim(), password })
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
                {isAr ? 'أدخل رمز التحقق' : 'Enter the verification code'}
              </Link>
            : formError === 'credentials'
              ? <Link href={L("/forgot-password")}>{isAr ? 'نسيت كلمة المرور؟' : 'Forgot your password?'}</Link>
              : undefined} />
      ) : null}

      <form className="ath-form" onSubmit={submit} noValidate>
        <Field id="email" label={isAr ? 'البريد الإلكتروني أو رقم الهاتف' : 'Email or phone number'} type="text"
          value={email} onChange={setEmail} error={emailErr} ltr inputMode="email"
          autoComplete="username" autoFocus disabled={busy}
          onBlur={() => setEmailErr(checkIdentity(email))} />
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
  const [method, setMethod] = useState<'email' | 'phone'>('email')
  const [phone, setPhone] = useState('')
  const [phoneErr, setPhoneErr] = useState<FieldError>(null)

  useEffect(() => { if (user && !sent) router.replace(L('/profile')) }, [user, sent, router])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const byPhone = method === 'phone'
    const ee = byPhone ? null : checkEmail(email, locale), fe = byPhone ? checkPhone(phone, locale) : null
    const pe = checkPassword(password, locale), ce = checkConfirm(password, confirm, locale)
    setEmailErr(ee); setPhoneErr(fe); setPwErr(pe); setCErr(ce)
    if (ee || fe || pe || ce) return
    setBusy(true); setFormError(null)
    try {
      const { data, error } = byPhone
        ? await createClient().auth.signUp({ phone: normalizePhone(phone), password })
        : await createClient().auth.signUp({
            email, password,
            options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
          })
      if (error) { setFormError(authErrorId(error)); return }
      /* The project may not require email confirmation (Supabase Auth →
         "Confirm email" off): then signUp answers with a live session and
         no message is ever sent. Saying «we sent you a link» in that case
         was a lie the reader could wait on forever. A session means in;
         the «check your email» state is for the confirming configuration. */
      if (data.session) { router.replace(L('/profile')); return }
      setSent(true)
    } catch (err) {
      setFormError(authErrorId(err))
    } finally { setBusy(false) }
  }

  if (sent) {
    return <CodeStep email={method === 'email' ? email.trim() : undefined} phone={method === 'phone' ? normalizePhone(phone) : undefined} onDone={() => router.replace(L('/profile'))} />
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

      <div className="ath-wide">
        <form className="ath-form" onSubmit={submit} noValidate>
          <div className="id-pills ath-method" role="group" aria-label={isAr ? 'طريقة التسجيل' : 'Sign-up method'}>
            <button type="button" className="id-pill is-sm" aria-pressed={method === 'email'} onClick={() => setMethod('email')}>{isAr ? 'البريد الإلكتروني' : 'Email'}</button>
            <button type="button" className="id-pill is-sm" aria-pressed={method === 'phone'} onClick={() => setMethod('phone')}>{isAr ? 'رقم الهاتف' : 'Phone number'}</button>
          </div>
          {method === 'phone' ? (
            <Field id="phone" label={isAr ? 'رقم الهاتف' : 'Phone number'} type="tel"
              value={phone} onChange={setPhone} error={phoneErr} ltr inputMode="numeric"
              autoComplete="tel" autoFocus disabled={busy}
              hint={isAr ? 'مثال: 07701234567 · سيصلك رمز تحقق برسالة نصية.' : 'e.g. 07701234567 · a verification code arrives by SMS.'}
              onBlur={() => setPhoneErr(checkPhone(phone, locale))} />
          ) : (
            <Field id="email" label={isAr ? 'البريد الإلكتروني' : 'Email'} type="email"
              value={email} onChange={setEmail} error={emailErr} ltr inputMode="email"
              autoComplete="email" autoFocus disabled={busy}
              onBlur={() => setEmailErr(checkEmail(email, locale))} />
          )}
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

        <ul className="ath-benefits">
          {(isAr ? BENEFITS : BENEFITS_EN).map(b => (
            <li key={b.title}><strong>{b.title}</strong><span>{b.note}</span></li>
          ))}
        </ul>
      </div>
    </AuthShell>
  )
}

/* ── Verify email · the code step, reachable from a sign-in that says
   «not confirmed» and from the link in the sign-up email ────────────── */
export function VerifyEmailScreen() {
  const { locale, href: L } = useLocale()
  const router = useRouter()
  const isAr = locale === 'ar'
  const [email, setEmail] = useState('')
  const [emailErr, setEmailErr] = useState<FieldError>(null)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('email')
    if (q && !checkEmail(q, locale)) { setEmail(q); setReady(true) }
  }, [locale])
  if (ready) return <CodeStep email={email.trim()} onDone={() => router.replace(L('/profile'))} />
  return (
    <AuthShell title={isAr ? 'تفعيل الحساب' : 'Activate your account'}
      lede={isAr ? 'اكتب البريد الذي سجّلت به لنرسل رمز التحقق.' : 'Enter the email you signed up with and we will send the code.'}>
      <form className="ath-form" onSubmit={(e) => { e.preventDefault(); const ee = checkEmail(email, locale); setEmailErr(ee); if (!ee) setReady(true) }} noValidate>
        <Field id="email" label={isAr ? 'البريد الإلكتروني' : 'Email'} type="email" value={email} onChange={setEmail} error={emailErr} ltr inputMode="email" autoComplete="email" autoFocus />
        <Submit busyLabel="">{isAr ? 'متابعة' : 'Continue'}</Submit>
      </form>
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
        <form className="ath-form" onSubmit={submit} noValidate>
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
