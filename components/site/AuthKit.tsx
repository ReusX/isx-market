'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { SiteShell } from './SiteShell'
import { AUTH_ERRORS, ERROR_EN, AUTH_PITCH, BENEFITS, BENEFITS_EN, type AuthErrorId } from '@/lib/auth'
import { useLocale } from '@/context/LocaleContext'
import { isNativeApp } from '@/lib/nativePush'
import '@/styles/econ-page.css'
import '@/styles/auth-page.css'

/**
 * The auth family's primitives on the site shell — the same props the
 * screens already use, so the behaviour (the real Supabase calls, the
 * Phase 0 fixes) ports without a change. A centred card at reading width
 * under the ordinary nav: a signed-out page is still the same product.
 */
export type Lang = 'ar' | 'en'

/* Small ink drawings for the three reasons, in the board's .fx-ill hand. */
const PERK_ILL = [
  <path key="p" d="M8 22h48v30H8zM22 22v-6h20v6M8 34h48" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />,
  <path key="w" d="M6 32s10-16 26-16 26 16 26 16-10 16-26 16S6 32 6 32zM32 38a6 6 0 1 0 0-12 6 6 0 0 0 0 12z" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />,
  <path key="s" d="M14 18h36M14 32h36M14 46h36M24 14v8M40 28v8M30 42v8" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />,
]

/**
 * Every auth screen on the board: the reasons for an account on one side
 * (with a sample portfolio card, marked as an example), the form as the key
 * card on the other. On a phone the form comes first.
 */
export function AuthShell({ title, lede, children, footer }: { title: string; lede?: ReactNode; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const { locale } = useLocale()
  const ar = locale === 'ar'
  const P = ar ? AUTH_PITCH.ar : AUTH_PITCH.en
  return (
    <SiteShell>
      <main className="ath id-full" data-world="lapis" data-level="accent">
        <div className="fx-frame ath-frame">
          <div className="fx-board ath-board">
            <aside className="fx-lead ath-lead">
              <p className="fx-title">{P.eyebrow}</p>
              <p className="ath-pitch">{P.title}</p>
              <ul className="ath-perks">
                {(ar ? BENEFITS : BENEFITS_EN).map((b, i) => (
                  <li key={b.title}>
                    <svg className="ath-ill" viewBox="0 0 64 64" aria-hidden="true">{PERK_ILL[i % PERK_ILL.length]}</svg>
                    <span><strong>{b.title}</strong><small>{b.note}</small></span>
                  </li>
                ))}
              </ul>
              <div className="id-print is-calm ath-sample" aria-hidden="true">
                <span className="ath-sample-tag">{P.sample}</span>
                <small>{P.sampleLabel}</small>
                <b className="id-num"><bdi>2,169,200</bdi> <span>{P.sampleUnit}</span></b>
                <span className="id-chg is-up id-num"><bdi>+0.09%</bdi></span>
              </div>
            </aside>
            <div className="id-print is-key fx-calc ath-card">
              <header className="ath-head">
                <h1 className="ath-title">{title}</h1>
                {lede ? <p className="ath-lede">{lede}</p> : null}
              </header>
              {children}
              {footer ? <footer className="ath-foot id-cap">{footer}</footer> : null}
            </div>
          </div>
        </div>
      </main>
    </SiteShell>
  )
}

/**
 * «Continue with Google / Facebook» — Supabase OAuth, back through
 * /auth/callback (which already waits for the session and sends the reader
 * to /profile). Each button serves both sign-in and sign-up: the provider
 * creates the account on first use, and the on_auth_user_created trigger
 * gives it a profiles row. Hidden inside the Android app, where Google and
 * Facebook refuse OAuth in a webview; the app keeps email and phone.
 */
type Provider = 'google' | 'facebook'
const OAUTH_LABEL: Record<Provider, { ar: string; en: string }> = {
  google: { ar: 'المتابعة باستخدام Google', en: 'Continue with Google' },
  facebook: { ar: 'المتابعة باستخدام فيسبوك', en: 'Continue with Facebook' },
}
const OAUTH_MARK: Record<Provider, ReactNode> = {
  google: (
    <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  ),
  facebook: (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path fill="#fff" d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.5c-1.5 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.62 23.1 24 18.1 24 12.07z" />
    </svg>
  ),
}

/* Facebook is wired (Supabase provider on, Meta app «IQWealth» 3175118426020419)
   but its Meta app is not published yet — add 'facebook' back here once it is. */
const SHOWN: Provider[] = ['google']

export function OAuthButtons({ locale }: { locale: Lang }) {
  const [busy, setBusy] = useState<Provider | null>(null)
  const [failed, setFailed] = useState(false)
  const [native, setNative] = useState(false)
  useEffect(() => { setNative(isNativeApp()) }, [])
  const ar = locale === 'ar'
  const go = async (provider: Provider) => {
    setBusy(provider); setFailed(false)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const { error } = await createClient().auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) throw error
    } catch {
      setFailed(true); setBusy(null)
    }
  }
  if (native) return null
  return (
    <div className="ath-oauth">
      {SHOWN.map((pv) => (
        <button key={pv} type="button" className={`ath-oauth-btn is-${pv}`} onClick={() => go(pv)} disabled={busy != null} aria-busy={busy === pv}>
          {OAUTH_MARK[pv]}
          <span>{busy === pv ? '…' : OAUTH_LABEL[pv][ar ? 'ar' : 'en']}</span>
        </button>
      ))}
      {failed ? <p className="ath-err id-cap" role="alert">{ar ? 'تعذّر الاتصال الآن. جرّب البريد أو الهاتف.' : 'Could not connect right now. Try email or phone.'}</p> : null}
      <p className="ath-or" aria-hidden="true"><span>{ar ? 'أو' : 'or'}</span></p>
    </div>
  )
}

export function Field({ id, label, type = 'text', value, onChange, error, hint, autoComplete, ltr, maxLength, inputMode, autoFocus, disabled, onBlur }: {
  id: string; label: string; type?: string; value: string; onChange: (v: string) => void
  error?: string | null; hint?: ReactNode; autoComplete?: string; ltr?: boolean
  maxLength?: number; inputMode?: 'text' | 'email' | 'numeric'; autoFocus?: boolean; disabled?: boolean; onBlur?: () => void
}) {
  return (
    <div className={`ath-field ${error ? 'is-bad' : ''}`.trim()}>
      <label htmlFor={id} className="id-cap">{label}</label>
      <input id={id} className="id-input" type={type} value={value} disabled={disabled} dir={ltr ? 'ltr' : undefined}
        inputMode={inputMode} autoComplete={autoComplete} maxLength={maxLength} autoFocus={autoFocus}
        aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
        onChange={(e) => onChange(e.target.value)} onBlur={onBlur} />
      {error ? <p className="ath-err id-cap" id={`${id}-err`} role="alert">{error}</p>
        : hint ? <p className="ath-hint id-cap" id={`${id}-hint`}>{hint}</p> : null}
    </div>
  )
}

export function PasswordField(p: {
  id: string; label: string; value: string; onChange: (v: string) => void
  error?: string | null; hint?: ReactNode; autoComplete?: string; autoFocus?: boolean; disabled?: boolean; onBlur?: () => void; locale: Lang
}) {
  const [shown, setShown] = useState(false)
  const ar = p.locale === 'ar'
  return (
    <div className={`ath-field ${p.error ? 'is-bad' : ''}`.trim()}>
      <label htmlFor={p.id} className="id-cap">{p.label}</label>
      <div className="ath-pw">
        <input id={p.id} className="id-input" type={shown ? 'text' : 'password'} value={p.value} dir="ltr"
          disabled={p.disabled} autoComplete={p.autoComplete} autoFocus={p.autoFocus}
          aria-invalid={Boolean(p.error)} aria-describedby={p.error ? `${p.id}-err` : p.hint ? `${p.id}-hint` : undefined}
          onChange={(e) => p.onChange(e.target.value)} onBlur={p.onBlur} />
        <button type="button" className="id-btn is-sm" onClick={() => setShown((s) => !s)} aria-pressed={shown}
          aria-label={shown ? (ar ? 'إخفاء كلمة المرور' : 'Hide password') : (ar ? 'إظهار كلمة المرور' : 'Show password')}>
          {shown ? (ar ? 'إخفاء' : 'Hide') : (ar ? 'إظهار' : 'Show')}
        </button>
      </div>
      {p.error ? <p className="ath-err id-cap" id={`${p.id}-err`} role="alert">{p.error}</p>
        : p.hint ? <p className="ath-hint id-cap" id={`${p.id}-hint`}>{p.hint}</p> : null}
    </div>
  )
}

export function AuthError({ id, action, locale = 'ar' }: { id: AuthErrorId; action?: ReactNode; locale?: Lang }) {
  const e = (locale === 'ar' ? AUTH_ERRORS : ERROR_EN)[id]
  return (
    <div className="id-note ath-error" role="alert">
      <b>{e.title}</b>{e.hint ? <> · {e.hint}</> : null}
      {action ? <div className="ath-error-act">{action}</div> : null}
    </div>
  )
}

export function Submit({ children, busy, busyLabel, disabled }: { children: ReactNode; busy?: boolean; busyLabel: string; disabled?: boolean }) {
  return (
    <button type="submit" className="id-btn is-primary ath-submit" disabled={busy || disabled} aria-busy={busy}>
      {busy ? busyLabel : children}
    </button>
  )
}

export function Outcome({ tone = 'neutral', title, children, actions }: { tone?: 'neutral' | 'good' | 'bad'; title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <div className={`ath-outcome is-${tone}`}>
      <span className="ath-mark" aria-hidden="true">{tone === 'good' ? '✓' : tone === 'bad' ? '△' : '✉'}</span>
      <h2 className="id-h3">{title}</h2>
      <div className="ath-outcome-body id-body">{children}</div>
      {actions ? <div className="ath-outcome-acts">{actions}</div> : null}
    </div>
  )
}
