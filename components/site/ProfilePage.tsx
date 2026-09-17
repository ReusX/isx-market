'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useLocale } from '@/context/LocaleContext'
import { useApp } from '@/context/AppContext'
import { LOCALES, LOCALE_NAME } from '@/lib/i18n/locale'
import { switchPath } from '@/lib/i18n/paths'
import { localeDateOrDash } from '@/lib/date'
import { usePortfolio } from '@/lib/portfolio'
import { SiteShell } from './SiteShell'
import { PageTitle } from './PageTitle'
import { ToolsRail } from './tools'
import '@/styles/auth-page.css'

/**
 * /profile · the account, as rows of facts with one action each.
 *
 * Username (editable, UNIQUE in `profiles`), email (not editable — there is
 * no flow for it), password (changed through the emailed reset link, never
 * a form here), language (a link — the URL is the locale), appearance, the
 * two data counts, the invite code, member-since, sign out. What the
 * product does not support is said in one line rather than implied.
 */
export function ProfilePage() {
  const { t, locale, href: L } = useLocale()
  const ac = t.personal.account
  const pathname = usePathname() ?? '/'
  const { theme, toggleTheme, user, profile, authLoading, refreshProfile, signOut, openAuth, watchlist } = useApp()
  const { lots } = usePortfolio()
  const email = user?.email ?? ''
  const [name, setName] = useState(profile?.username ?? '')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)
  const [resetSent, setResetSent] = useState(false)
  const [copied, setCopied] = useState(false)
  useEffect(() => { setName(profile?.username ?? '') }, [profile?.username])
  const positions = useMemo(() => new Set(lots.map((l) => l.sym)).size, [lots])

  async function saveName() {
    const v = name.trim()
    if (!v || v === profile?.username) { setEditing(false); return }
    if (v.length < 2) { setNameError(ac.nameTooShort); return }
    setSaving(true); setNameError(null)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const { error } = await createClient().from('profiles').update({ username: v }).eq('id', user!.id)
      if (error) { setNameError(error.code === '23505' ? ac.nameTaken : ac.nameSaveFailed); return }
      await refreshProfile()
      setEditing(false); setSaved(true)
      setTimeout(() => setSaved(false), 2400)
    } finally { setSaving(false) }
  }
  async function sendReset() {
    if (!email) return
    const { createClient } = await import('@/lib/supabase/client')
    await createClient().auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/reset` })
    setResetSent(true)
  }

  const body = authLoading ? null : !user ? (
    <div className="ath-outcome">
      <h2 className="id-h3">{ac.signInTitle}</h2>
      <p className="id-body">{ac.signInNote}</p>
      <div className="ath-outcome-acts"><button type="button" className="id-btn is-primary" onClick={() => openAuth('signin')}>{ac.signIn}</button></div>
    </div>
  ) : (
    <>
      <section className="ath-sec" aria-label={ac.tabAccount}>
        <h2 className="id-h3">{ac.tabAccount}</h2>
        <dl className="ath-rows">
          <div className="ath-row">
            <dt>{ac.username}</dt>
            {editing ? (
              <dd>
                <input className="id-input" value={name} autoFocus autoComplete="username" onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') { setEditing(false); setName(profile?.username ?? '') } }} aria-label={ac.username} />
                {nameError ? <p className="ath-err id-cap">{nameError}</p> : <p className="ath-hint id-cap">{ac.nameHint}</p>}
              </dd>
            ) : <dd>{profile?.username || <span className="id-cap">{ac.noName}</span>}{saved ? <span className="id-cap"> · {ac.saved}</span> : null}</dd>}
            <div>
              {editing ? (
                <>
                  <button type="button" className="id-btn is-sm is-primary" onClick={saveName} disabled={saving}>{saving ? ac.saving : ac.save}</button>{' '}
                  <button type="button" className="id-btn is-sm" onClick={() => { setEditing(false); setName(profile?.username ?? ''); setNameError(null) }}>{ac.cancel}</button>
                </>
              ) : <button type="button" className="id-btn is-sm" onClick={() => setEditing(true)}>{ac.edit}</button>}
            </div>
          </div>
          <div className="ath-row">
            <dt>{ac.email}</dt>
            <dd><bdi dir="ltr">{email}</bdi><span className="id-sub id-cap">{ac.emailNotEditable}</span></dd>
            <span className="id-cap">{ac.notEditable}</span>
          </div>
          <div className="ath-row">
            <dt>{ac.password}</dt>
            <dd>{resetSent ? ac.resetSentTo(email) : ac.passwordViaEmail}<span className="id-sub id-cap">{ac.noCurrentPassword}</span></dd>
            <button type="button" className="id-btn is-sm" onClick={sendReset} disabled={resetSent}>{resetSent ? ac.resetSent : ac.sendResetLink}</button>
          </div>
        </dl>
      </section>

      <section className="ath-sec" aria-label={ac.tabPrefs}>
        <h2 className="id-h3">{ac.tabPrefs}</h2>
        <dl className="ath-rows">
          <div className="ath-row">
            <dt>{ac.language}</dt>
            <dd>{LOCALE_NAME[locale]}<span className="id-sub id-cap">{ac.languageNote}</span></dd>
            <div className="id-pills">
              {LOCALES.map((id) => <Link key={id} href={switchPath(pathname, id)} hrefLang={id} lang={id} className="id-pill is-sm" aria-pressed={locale === id}>{LOCALE_NAME[id]}</Link>)}
            </div>
          </div>
          <div className="ath-row">
            <dt>{ac.appearance}</dt>
            <dd>{theme === 'dark' ? ac.themeDark : ac.themeLight}<span className="id-sub id-cap">{ac.themeHint}</span></dd>
            <div className="id-pills">
              <button type="button" className="id-pill is-sm" aria-pressed={theme !== 'dark'} onClick={() => { if (theme === 'dark') toggleTheme() }}>{ac.themeLight}</button>
              <button type="button" className="id-pill is-sm" aria-pressed={theme === 'dark'} onClick={() => { if (theme !== 'dark') toggleTheme() }}>{ac.themeDark}</button>
            </div>
          </div>
        </dl>
      </section>

      <section className="ath-sec" aria-label={ac.tabData}>
        <h2 className="id-h3">{ac.myData}</h2>
        <p className="id-cap">{ac.localFirst}</p>
        <dl className="ath-rows">
          <div className="ath-row"><dt>{t.personal.watchlist.title}</dt><dd className="id-num">{ac.watchlistCount(String(watchlist?.length ?? 0))}</dd><Link className="id-btn is-sm" href={L('/watchlist')}>{ac.view}</Link></div>
          <div className="ath-row"><dt>{t.personal.portfolio.title}</dt><dd className="id-num">{ac.portfolioCount(String(positions))}</dd><Link className="id-btn is-sm" href={L('/portfolio')}>{ac.view}</Link></div>
          {profile?.referral_code ? (
            <div className="ath-row"><dt>{ac.inviteCode}</dt><dd><bdi dir="ltr">{profile.referral_code}</bdi></dd>
              <button type="button" className="id-btn is-sm" onClick={() => { navigator.clipboard?.writeText(profile.referral_code as string); setCopied(true); setTimeout(() => setCopied(false), 2000) }}>{copied ? ac.copied : ac.copy}</button></div>
          ) : null}
        </dl>
      </section>

      <p className="id-cap ath-sec">{ac.notSupported}</p>
      <p className="ath-sec"><button type="button" className="id-btn is-sm" onClick={signOut}>{ac.signOut}</button></p>
    </>
  )

  return (
    <SiteShell>
      <main className="tl id-full iq-door">
        <ToolsRail />
        <div className="tl-body ath-profile">
          <header className="tl-head">
            <p className="id-eyebrow">{t.personal.tools.eyebrow}</p>
            <PageTitle title={profile?.username || ac.myAccount} />
            {profile?.created_at ? <p className="id-cap id-num">{ac.memberSince(localeDateOrDash(profile.created_at.slice(0, 10), locale))}</p> : null}
          </header>
          {body}
        </div>
      </main>
    </SiteShell>
  )
}
