'use client'

import { useEffect, useMemo, useState } from 'react'
import { useLocale } from '@/context/LocaleContext'
import { usePathname } from 'next/navigation'
import { LOCALES, LOCALE_NAME } from '@/lib/i18n/locale'
import { switchPath } from '@/lib/i18n/paths'
import type { Messages } from '@/lib/i18n'
import { localeDateOrDash } from '@/lib/date'
import Link from 'next/link'
import { useApp } from '@/context/AppContext'
import { usePortfolio } from '@/lib/portfolio'
import { arFull } from '@/lib/statistics'
import '@/styles/panels.css'
// The signed-out state reuses the portfolio's empty-state pieces (`.pf-empty`,
// `.pf-add`), which is what the approved design does too.
import '@/styles/portfolio.css'
import '@/styles/profile.css'

/**
 * حسابي — a direct port of the approved account page.
 *
 * Deliberately the smallest page in the product: the account layer supports
 * six things and this styles those six and nothing else. Every row below is
 * backed by something production actually does —
 *
 *   username       `profiles.username`, UNIQUE, so «الاسم مستخدم» is a real
 *                  failure and is reported from the database's own error
 *   email          read from the auth session · DISPLAY ONLY, because no
 *                  email-change interface exists
 *   password       `resetPasswordForEmail` → a link to /auth/reset
 *   language       the URL — see the LOCALES links below
 *   theme          `useApp().toggleTheme`
 *   referral code  `profiles.referral_code`, UNIQUE and copyable
 *   sign out       `supabase.auth.signOut()`
 *
 * There is NO notification section, NO alert preferences, NO two-factor, NO
 * session management, NO data export and NO account deletion, because none of
 * those exist. The page says so once, plainly, rather than rendering five
 * controls that do nothing — and account deletion in particular is a real
 * backend gap: `profiles` has no DELETE policy and there is no server action,
 * so wiring a client delete would either fail or need RLS weakened.
 */

const SECTIONS = [
  { id: 'account' as const },
  { id: 'prefs' as const },
  { id: 'data' as const },
] as const
type SectionId = (typeof SECTIONS)[number]['id']

/* Two options, not three: `toggleTheme` writes 'light' or 'dark' and there is
   no prefers-color-scheme branch anywhere, so «تلقائي» would do nothing. */
const THEMES = [
  { id: 'light' as const },
  { id: 'dark' as const },
] as const

const tabLabel = (id: 'account' | 'prefs' | 'data', ac: Messages['personal']['account']) =>
  id === 'account' ? ac.tabAccount : id === 'prefs' ? ac.tabPrefs : ac.tabData
const tabHint = (id: 'account' | 'prefs' | 'data', ac: Messages['personal']['account']) =>
  id === 'account' ? ac.tabAccountHint : id === 'prefs' ? ac.tabPrefsHint : ac.tabDataHint

export function Account() {
  const { t: T, locale, href: L } = useLocale()
  const ac = T.personal.account
  const pathname = usePathname() ?? '/'
  const { theme, toggleTheme, user, profile, authLoading, refreshProfile, signOut, openAuth } = useApp()
  const { lots } = usePortfolio()

  const [section, setSection] = useState<SectionId>('account')
  const [openPanel, setOpenPanel] = useState<SectionId | null>(null)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)
  const [resetSent, setResetSent] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => { setName(profile?.username ?? '') }, [profile?.username])

  const email = (user?.email as string | undefined) ?? null
  const mark = (profile?.username || email || '?').trim().charAt(0).toUpperCase()
  const watchCount = profile?.watchlist?.length ?? 0

  const positions = useMemo(
    () => new Set(lots.map(l => l.sym)).size, [lots])

  async function saveName() {
    const v = name.trim()
    if (!v || v === profile?.username) { setEditing(false); return }
    if (v.length < 2) { setNameError(ac.nameTooShort); return }
    setSaving(true); setNameError(null)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const { error } = await createClient().from('profiles').update({ username: v }).eq('id', user!.id)
      if (error) {
        // The UNIQUE constraint is the only real failure this column has.
        setNameError(error.code === '23505'
          ? ac.nameTaken
          : ac.nameSaveFailed)
        return
      }
      await refreshProfile()
      setEditing(false); setSaved(true)
      setTimeout(() => setSaved(false), 2400)
    } finally { setSaving(false) }
  }

  async function sendReset() {
    if (!email) return
    const { createClient } = await import('@/lib/supabase/client')
    await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset`,
    })
    setResetSent(true)
  }

  if (authLoading) {
    return (
      <main className="ac-page iq-page">
        <div className="ac-skel ac-skel-id" aria-hidden="true"><span /><span /><span /></div>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="ac-page iq-page">
        <section className="pf-empty">
          {/* An `h1`, not a `strong` — this is the whole page when signed out,
              and a page with no top-level heading has no landmark to enter. */}
          <h1>{ac.signInTitle}</h1>
          <p>{ac.signInNote}</p>
          <button type="button" className="pf-add pf-add-lg" onClick={() => openAuth?.()}>{ac.signIn}</button>
        </section>
      </main>
    )
  }

  const panels: Record<SectionId, React.ReactNode> = {
    account: (
      <>
        <h2 className="ac-h2">{ac.tabAccount}</h2>

        <div className="ac-field">
          <div className="ac-field-head">
            <span className="ac-label">{ac.username}</span>
            {saved ? <span className="ac-saved" role="status"><i aria-hidden="true">✓</i> {ac.saved}</span> : null}
          </div>
          {!editing ? (
            <div className="ac-static">
              <span>{profile?.username || ac.noName}</span>
              <button type="button" onClick={() => { setEditing(true); setNameError(null) }}>{ac.edit}</button>
            </div>
          ) : (
            <div className="ac-edit">
              <label>
                <span className="sr-only">{ac.username}</span>
                <input value={name} autoFocus autoComplete="username"
                  onChange={e => { setName(e.target.value); setNameError(null) }}
                  onKeyDown={e => { if (e.key === 'Enter') saveName() }}
                  aria-invalid={!!nameError} aria-describedby={nameError ? 'ac-name-err' : undefined} />
              </label>
              <button type="button" className="ac-save" onClick={saveName} disabled={saving}>
                {saving ? ac.saving : ac.save}
              </button>
              <button type="button" className="ac-cancel"
                onClick={() => { setEditing(false); setName(profile?.username ?? ''); setNameError(null) }}>
                {ac.cancel}
              </button>
            </div>
          )}
          {nameError
            ? <p className="ac-err" id="ac-name-err" role="alert">{nameError}</p>
            : <p className="ac-hint">{ac.nameHint}</p>}
        </div>

        {/* Display only, and it says why. */}
        <div className="ac-field">
          <div className="ac-field-head"><span className="ac-label">{ac.email}</span></div>
          <div className="ac-static is-locked">
            <span dir="ltr">{email ?? '—'}</span>
            <em>{ac.notEditable}</em>
          </div>
          <p className="ac-hint">
            {ac.emailNotEditable}
          </p>
        </div>

        <div className="ac-field">
          <div className="ac-field-head"><span className="ac-label">{ac.password}</span></div>
          <div className="ac-static">
            <span>{ac.passwordViaEmail}</span>
            <button type="button" onClick={sendReset} disabled={resetSent || !email}>
              {resetSent ? ac.resetSent : ac.sendResetLink}
            </button>
          </div>
          {resetSent ? (
            <p className="ac-ok" role="status">
              <i aria-hidden="true">✓</i>
              {ac.resetSentTo(email ?? '')}
            </p>
          ) : (
            <p className="ac-hint">{ac.noCurrentPassword}</p>
          )}
        </div>
      </>
    ),
    prefs: (
      <>
        <h2 className="ac-h2">{ac.tabPrefs}</h2>
        <div className="ac-field">
          <div className="ac-field-head"><span className="ac-label">{ac.language}</span></div>
          {/* ⚠ LINKS, not buttons.
              The locale lives in the URL, so choosing a language means going to
              a different page — the same rule the header switch follows. The
              old control set a localStorage flag that changed nothing. */}
          <div className="ac-choice" role="group" aria-label={ac.language}>
            {LOCALES.map((id) => (
              <Link key={id} href={switchPath(pathname, id)} hrefLang={id} lang={id}
                className={locale === id ? 'is-on' : ''}
                aria-current={locale === id ? 'true' : undefined}>
                <strong>{LOCALE_NAME[id]}</strong>
                <span>{id === 'ar' ? ac.rtl : ac.ltr}</span>
              </Link>
            ))}
          </div>
          <p className="ac-hint">{ac.languageNote}</p>
        </div>
        <div className="ac-field">
          <div className="ac-field-head"><span className="ac-label">{ac.appearance}</span></div>
          <div className="ac-choice" role="group" aria-label={ac.appearance}>
            {THEMES.map(t => (
              <button key={t.id} type="button" className={theme === t.id ? 'is-on' : ''}
                aria-pressed={theme === t.id}
                onClick={() => { if (theme !== t.id) toggleTheme() }}>
                <strong>{t.id === 'light' ? ac.themeLight : ac.themeDark}</strong>
              </button>
            ))}
          </div>
          <p className="ac-hint">{ac.themeHint}</p>
        </div>
      </>
    ),
    data: (
      <>
        <h2 className="ac-h2">{ac.myData}</h2>
        <dl className="ac-data">
          <div>
            <dt>{T.personal.watchlist.title}</dt>
            <dd>{ac.watchlistCount(String(watchCount))} · <Link href={L('/watchlist')}>{ac.view}</Link></dd>
          </div>
          <div>
            <dt>{T.personal.portfolio.title}</dt>
            <dd>{ac.portfolioCount(String(positions))} · <Link href={L('/portfolio')}>{ac.view}</Link></dd>
          </div>
          {profile?.referral_code ? (
            <div>
              <dt>{ac.inviteCode}</dt>
              <dd>
                <bdi dir="ltr">{profile.referral_code}</bdi>
                <button type="button" className="ac-copy"
                  onClick={() => {
                    navigator.clipboard?.writeText(profile.referral_code as string)
                    setCopied(true); setTimeout(() => setCopied(false), 2000)
                  }}>
                  {copied ? ac.copied : ac.copy}
                </button>
              </dd>
            </div>
          ) : null}
        </dl>
        <p className="ac-hint">
          {ac.localFirst}
        </p>
      </>
    ),
  }

  return (
    <main className="ac-page iq-page">
      <section className="ac-identity" aria-label={ac.tabAccount}>
        <div className="ac-id">
          <span className="ac-mark" aria-hidden="true">{mark}</span>
          <div className="ac-id-copy">
            <h1>{profile?.username || ac.myAccount}</h1>
            {email ? <span dir="ltr" className="ac-id-email">{email}</span> : null}
          </div>
          {profile?.created_at
            ? <p className="ac-id-since">{ac.memberSince(localeDateOrDash(profile.created_at.slice(0, 10), locale))}</p>
            : null}
        </div>
      </section>

      <div className="ac-body">
        <nav className="ac-rail" aria-label={ac.settingsSections}>
          {SECTIONS.map(s => (
            <button key={s.id} type="button"
              className={section === s.id ? 'is-on' : ''}
              aria-current={section === s.id ? 'page' : undefined}
              onClick={() => setSection(s.id)}>
              <strong>{tabLabel(s.id, ac)}</strong><span>{tabHint(s.id, ac)}</span>
            </button>
          ))}
          <button type="button" className="ac-rail-out" onClick={signOut}>{ac.signOut}</button>
        </nav>

        {/* Mobile: a list that opens one panel at a time. */}
        <nav className={openPanel ? 'ac-list is-hidden' : 'ac-list'} aria-label={ac.settingsSections}>
          {SECTIONS.map(s => (
            <button key={s.id} type="button" onClick={() => { setSection(s.id); setOpenPanel(s.id) }}>
              <span><strong>{tabLabel(s.id, ac)}</strong><em>{tabHint(s.id, ac)}</em></span>
              <i aria-hidden="true">‹</i>
            </button>
          ))}
          <button type="button" className="ac-list-out" onClick={signOut}>{ac.signOut}</button>
        </nav>

        <div className={openPanel ? 'ac-panel is-open' : 'ac-panel'}>
          <button type="button" className="ac-back" onClick={() => setOpenPanel(null)}>
            <i className="dir-go" aria-hidden="true">›</i> {ac.allSettings}
          </button>
          {panels[section]}

          {/* Stated once, plainly. A settings page that silently lacks these
              reads as broken; one honest line beats five fake rows. */}
          <p className="ac-absent">
            <i aria-hidden="true">△</i>
            {ac.notSupported}
          </p>

          <button type="button" className="ac-signout" onClick={signOut}>{ac.signOut}</button>
        </div>
      </div>
    </main>
  )
}
