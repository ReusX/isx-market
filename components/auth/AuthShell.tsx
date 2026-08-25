"use client";

import { type ReactNode, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "@/context/LocaleContext";
import { LOCALES } from "@/lib/i18n/locale";
import { switchPath } from "@/lib/i18n/paths";
import { StarMark } from '@/components/brand/StarMark'
import { DitherArt } from "@/components/design/DitherArt";
import { useApp } from "@/context/AppContext";
import { AUTH_ERRORS, ERROR_EN, type AuthErrorId } from "@/lib/auth";
import "@/styles/auth.css";

/**
 * The shared auth shell — one system, six screens. §2
 *
 * Every auth screen is this shell plus a body. That is what makes the family
 * read as one product rather than six pages that happen to have forms: the
 * composition, the form width, the field styling, the error and success
 * treatment, the 1-bit panel and the minimal chrome are all defined once,
 * here, and never re-decided per screen.
 *
 * ── The chrome · §32 ──────────────────────────────────────────────────────
 * A signed-out visitor must not see the authenticated sidebar. `AppShell`
 * detects the auth routes and renders them bare; this supplies what replaces
 * it — the mark, a way home, and the two controls that genuinely work before
 * login (language and theme, both localStorage). Nothing else.
 *
 * ── The visual · §3 §5 §31 ────────────────────────────────────────────────
 * One scene family across all six screens, cropped differently by the panel's
 * proportions. It sits BESIDE the form, never behind it — no text over dither,
 * no animation behind inputs. On mobile it becomes a short strip above the
 * form and must never push the form below the fold.
 */

export type Lang = "ar" | "en";

export function AuthShell({
  title, lede, children, footer, wide,
}: {
  title: string;
  lede?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** Sign-up carries the benefits column and needs the wider measure. */
  wide?: boolean;
}) {
  /*
   * ⚠ The language is the URL, and the theme is localStorage.
   *
   * The design holds both locally because each of its pages owns a toggle.
   * Here that would be a second source of truth: the locale is decided by
   * which route group rendered this page, and `dir` is already correct on
   * <html>. So the language control below NAVIGATES — it is two links, not
   * two buttons — and the `dir` override is gone.
   */
  const { theme, toggleTheme } = useApp();
  const { locale } = useLocale();
  const pathname = usePathname() ?? "/";
  return (
    <div className="au-page iq-page">
      <div className="au-split">
        {/* ── The form side ─────────────────────────────────────────────── */}
        <div className="au-form-side">
          <header className="au-chrome">
            {/* The same mark the sidebar uses, so the signed-out shell is
                recognisably the same product. §32 */}
            <Link className="au-brand" href={switchPath("/", locale)}>
              <span className="au-brand-mark" aria-hidden="true"><StarMark size={17} color="#fff" /></span>
              <span className="au-brand-name">IQWealth</span>
            </Link>
            <div className="au-chrome-controls">
              <div className="au-mini" role="group" aria-label={locale === "ar" ? "اللغة" : "Language"}>
                {LOCALES.map((id) => (
                  <Link key={id} href={switchPath(pathname, id)} hrefLang={id} lang={id}
                    className={locale === id ? "is-on" : ""}
                    aria-current={locale === id ? "true" : undefined}
                    aria-label={id === "ar" ? "التبديل إلى النسخة العربية" : "Switch to the English version"}>
                    {id === "ar" ? "ع" : "EN"}
                  </Link>
                ))}
              </div>
              <button type="button" className="au-mini-btn" onClick={toggleTheme}
                aria-pressed={theme === "dark"}
                aria-label={theme === "dark"
                  ? (locale === "ar" ? "تفعيل المظهر الفاتح" : "Switch to light mode")
                  : (locale === "ar" ? "تفعيل المظهر الداكن" : "Switch to dark mode")}>
                {theme === "dark" ? "☀" : "◐"}
              </button>
            </div>
          </header>

          <main className={wide ? "au-body is-wide" : "au-body"}>
            <div className="au-head">
              <h1>{title}</h1>
              {lede ? <p>{lede}</p> : null}
            </div>
            {children}
          </main>

          {footer ? <footer className="au-foot">{footer}</footer> : null}
        </div>

        {/* ── The 1-bit side · §3 §5 ─────────────────────────────────────── */}
        <aside className="au-art-side" aria-hidden="true">
          <div className="au-art"><DitherArt scene="auth" theme={theme === "dark" ? "dark" : "light"} /></div>
          <p className="au-art-line">
            {locale === "ar"
              ? "بيانات سوق العراق للأوراق المالية، في مكان واحد."
              : "The Iraq Stock Exchange, in one place."}
          </p>
        </aside>
      </div>
    </div>
  );
}

/* ── Fields · one definition for the whole family · §8 ───────────────────── */
export function Field({
  id, label, type = "text", value, onChange, error, hint, autoComplete,
  ltr, maxLength, inputMode, autoFocus, disabled, onBlur,
}: {
  id: string; label: string; type?: string;
  value: string; onChange: (v: string) => void;
  error?: string | null; hint?: ReactNode;
  autoComplete?: string;
  /** Email, password and codes stay left-to-right inside an RTL form. §25 */
  ltr?: boolean;
  maxLength?: number; inputMode?: "text" | "email" | "numeric";
  autoFocus?: boolean; disabled?: boolean; onBlur?: () => void;
}) {
  return (
    <div className={error ? "au-field is-bad" : "au-field"}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id} type={type} value={value} disabled={disabled}
        dir={ltr ? "ltr" : undefined}
        inputMode={inputMode}
        autoComplete={autoComplete} maxLength={maxLength} autoFocus={autoFocus}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
      />
      {error ? (
        <p className="au-field-err" id={`${id}-err`} role="alert">{error}</p>
      ) : hint ? (
        <p className="au-field-hint" id={`${id}-hint`}>{hint}</p>
      ) : null}
    </div>
  );
}

/** Password field with a visibility control. §6 §34 */
export function PasswordField(p: {
  id: string; label: string; value: string; onChange: (v: string) => void;
  error?: string | null; hint?: ReactNode; autoComplete?: string;
  autoFocus?: boolean; disabled?: boolean; onBlur?: () => void;
  locale: Lang;
}) {
  const [shown, setShown] = useState(false);
  return (
    <div className={p.error ? "au-field is-bad has-toggle" : "au-field has-toggle"}>
      <label htmlFor={p.id}>{p.label}</label>
      <div className="au-pw">
        <input
          id={p.id} type={shown ? "text" : "password"} value={p.value} dir="ltr"
          disabled={p.disabled} autoComplete={p.autoComplete} autoFocus={p.autoFocus}
          aria-invalid={Boolean(p.error)}
          aria-describedby={p.error ? `${p.id}-err` : p.hint ? `${p.id}-hint` : undefined}
          onChange={(e) => p.onChange(e.target.value)}
          onBlur={p.onBlur}
        />
        <button type="button" onClick={() => setShown((s) => !s)}
          aria-pressed={shown}
          aria-label={shown
            ? (p.locale === "ar" ? "إخفاء كلمة المرور" : "Hide password")
            : (p.locale === "ar" ? "إظهار كلمة المرور" : "Show password")}>
          {shown
            ? (p.locale === "ar" ? "إخفاء" : "Hide")
            : (p.locale === "ar" ? "إظهار" : "Show")}
        </button>
      </div>
      {p.error ? (
        <p className="au-field-err" id={`${p.id}-err`} role="alert">{p.error}</p>
      ) : p.hint ? (
        <p className="au-field-hint" id={`${p.id}-hint`}>{p.hint}</p>
      ) : null}
    </div>
  );
}

/**
 * A form-level error. §9 — never one generic «حدث خطأ» when the auth system
 * gave a usable reason, and never the SDK's raw English string.
 */
export function AuthError({ id, action, locale = "ar" }: { id: AuthErrorId; action?: ReactNode; locale?: Lang }) {
  const e = (locale === "ar" ? AUTH_ERRORS : ERROR_EN)[id];
  return (
    <div className="au-error" role="alert">
      <i aria-hidden="true">△</i>
      <div>
        <strong>{e.title}</strong>
        {e.hint ? <span>{e.hint}</span> : null}
        {action ? <div className="au-error-act">{action}</div> : null}
      </div>
    </div>
  );
}

/** Primary action. Keeps its label while submitting — §23. */
export function Submit({
  children, busy, busyLabel, disabled,
}: { children: ReactNode; busy?: boolean; busyLabel: string; disabled?: boolean }) {
  return (
    <button type="submit" className="au-submit" disabled={busy || disabled} aria-busy={busy}>
      {busy ? <><span className="au-spin" aria-hidden="true" />{busyLabel}</> : children}
    </button>
  );
}

/**
 * The outcome screens — verify-email, reset-sent, reset-done, expired link.
 * One shape so a user who lands on any of them recognises where they are. §2
 */
export function Outcome({
  tone = "neutral", title, children, actions,
}: {
  tone?: "neutral" | "good" | "bad";
  title: string; children: ReactNode; actions?: ReactNode;
}) {
  return (
    <div className={`au-outcome is-${tone}`}>
      <span className="au-outcome-mark" aria-hidden="true">
        {tone === "good" ? "✓" : tone === "bad" ? "△" : "✉"}
      </span>
      <h2>{title}</h2>
      <div className="au-outcome-body">{children}</div>
      {actions ? <div className="au-outcome-acts">{actions}</div> : null}
    </div>
  );
}

/**
 * The design keeps language and theme in local state because each of its pages
 * owns its own toggle. This app has one of each, in AppContext, written
 * pre-paint — so the shell reads them from there and `useAuthChrome` is gone.
 */
