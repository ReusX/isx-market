'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useLocale } from '@/context/LocaleContext'
import { RailIcon } from '@/components/site/RailIcon'
import { ThemeToggle } from '@/components/site/ThemeToggle'
import { LanguageSwitch } from '@/components/site/LanguageSwitch'
import {
  CARD_NEEDS, INTERESTS, PREFS_KEY, defaultPrefs, readPrefs, writePrefs, haptic,
  type AppPrefs, type Interest, type Start,
} from '@/lib/appMode'
import '@/styles/app.css'

/**
 * /app/settings · the choices the onboarding made, all changeable: interests,
 * the launch page, and which home cards show in which order. Saved on every
 * change — there is no «save» button to forget.
 */
const ICON: Record<Interest, 'fx' | 'gold' | 'market' | 'banks' | 'oil' | 'learn' | 'news'> = {
  fx: 'fx', gold: 'gold', market: 'market', banks: 'banks', economy: 'oil', learn: 'learn', news: 'news',
}

export function AppSettings() {
  const { t, href: L } = useLocale()
  const S = t.app.settings
  const [p, setP] = useState<AppPrefs | null>(null)

  useEffect(() => { setP(readPrefs() ?? defaultPrefs(INTERESTS.map((i) => i.id))) }, [])
  if (!p) return <main className="app-set" />

  const save = (next: AppPrefs) => { haptic(); setP(next); writePrefs(next) }
  const toggle = (id: Interest) => {
    const on = p.interests.includes(id)
    if (on && p.interests.length === 1) return // at least one section always
    const interests = INTERESTS.map((i) => i.id).filter((x) => (x === id ? !on : p.interests.includes(x)))
    const start: Start = typeof p.start === 'string' && INTERESTS.some((i) => i.id === p.start) && !interests.includes(p.start as Interest) ? 'auto' : p.start
    save({ ...p, interests, start })
  }
  const move = (i: number, d: -1 | 1) => {
    const cards = [...p.cards]
    const j = i + d
    if (j < 0 || j >= cards.length) return
    ;[cards[i], cards[j]] = [cards[j], cards[i]]
    save({ ...p, cards })
  }

  const starts: { v: Start; label: string; note?: string }[] = [
    { v: 'auto', label: S.startAuto, note: S.startAutoNote },
    { v: 'home', label: S.startHome },
    { v: 'last', label: S.startLast },
    ...INTERESTS.filter((i) => p.interests.includes(i.id)).map((i) => ({ v: i.id as Start, label: t.app.interests[i.id].name })),
  ]

  return (
    <main className="app-set">
      <h1 className="app-home-h">{S.title}</h1>

      <section className="app-card">
        <h2 className="app-card-h">{S.interests}</h2>
        <p className="id-cap">{S.interestsNote}</p>
        <ul className="app-set-list">
          {INTERESTS.map((i) => {
            const on = p.interests.includes(i.id)
            return (
              <li key={i.id}>
                <label className="app-set-row">
                  <RailIcon name={ICON[i.id]} />
                  <span className="app-set-txt"><b>{t.app.interests[i.id].name}</b><small>{t.app.interests[i.id].note}</small></span>
                  <input type="checkbox" className="app-switch" checked={on} onChange={() => toggle(i.id)} disabled={on && p.interests.length === 1} />
                </label>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="app-card">
        <h2 className="app-card-h">{S.start}</h2>
        <ul className="app-set-list" role="radiogroup" aria-label={S.start}>
          {starts.map((s) => (
            <li key={s.v}>
              <label className="app-set-row">
                <span className="app-set-txt"><b>{s.label}</b>{s.note ? <small>{s.note}</small> : null}</span>
                <input type="radio" name="app-start" className="app-radio" checked={p.start === s.v} onChange={() => save({ ...p, start: s.v })} />
              </label>
            </li>
          ))}
        </ul>
      </section>

      <section className="app-card">
        <h2 className="app-card-h">{S.cards}</h2>
        <p className="id-cap">{S.cardsNote}</p>
        <ul className="app-set-list">
          {p.cards.map((c, i) => {
            const avail = CARD_NEEDS[c.id].some((x) => p.interests.includes(x))
            return (
              <li key={c.id} className={avail ? '' : 'is-off'}>
                <div className="app-set-row">
                  <span className="app-set-txt"><b>{t.app.cards[c.id]}</b>{avail ? null : <small>{S.cardOff}</small>}</span>
                  <button type="button" className="app-icon-btn" aria-label={S.up} disabled={i === 0} onClick={() => move(i, -1)}>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M6 15l6-6 6 6" /></svg>
                  </button>
                  <button type="button" className="app-icon-btn" aria-label={S.down} disabled={i === p.cards.length - 1} onClick={() => move(i, 1)}>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
                  </button>
                  <input
                    type="checkbox" className="app-switch" checked={c.on} disabled={!avail} aria-label={t.app.cards[c.id]}
                    onChange={() => save({ ...p, cards: p.cards.map((x) => (x.id === c.id ? { ...x, on: !x.on } : x)) })}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="app-card">
        <Link href={L('/notifications')} className="app-set-row is-link">
          <RailIcon name="notify" />
          <span className="app-set-txt"><b>{S.notify}</b><small>{S.notifyNote}</small></span>
        </Link>
      </section>

      <section className="app-card">
        <h2 className="app-card-h">{S.look}</h2>
        <div className="app-sheet-row">
          <ThemeToggle />
          <LanguageSwitch variant="row" />
        </div>
      </section>

      <button
        type="button" className="id-btn app-set-replay"
        onClick={() => { try { localStorage.removeItem(PREFS_KEY) } catch { /* ignore */ } window.dispatchEvent(new Event('iq:prefs')); location.reload() }}
      >
        {S.replay}
      </button>
    </main>
  )
}
