'use client'

import { useState, type ReactNode } from 'react'
import { SiteShell } from './SiteShell'
import { AUTH_ERRORS, ERROR_EN, type AuthErrorId } from '@/lib/auth'
import '@/styles/auth-page.css'

/**
 * The auth family's primitives on the site shell — the same props the
 * screens already use, so the behaviour (the real Supabase calls, the
 * Phase 0 fixes) ports without a change. A centred card at reading width
 * under the ordinary nav: a signed-out page is still the same product.
 */
export type Lang = 'ar' | 'en'

export function AuthShell({ title, lede, children, footer }: { title: string; lede?: ReactNode; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  return (
    <SiteShell>
      <main className="ath id-full">
        <div className="ath-card">
          <header className="ath-head">
            <h1 className="id-h1">{title}</h1>
            {lede ? <p className="ath-lede">{lede}</p> : null}
          </header>
          {children}
          {footer ? <footer className="ath-foot id-cap">{footer}</footer> : null}
        </div>
      </main>
    </SiteShell>
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
