'use client'

import { useEffect, useState } from 'react'
import { useLocale } from '@/context/LocaleContext'
import { StarMark } from '@/components/brand/StarMark'

/**
 * Closed-test recruitment · a small card at the bottom of the page, for
 * Android visitors on the website only (never inside the app, never on
 * iPhone or desktop, where there is nothing to install).
 *
 * Not an interstitial: it covers no content until tapped, appears after the
 * page has settled, and closes for good. Google demotes mobile pages behind
 * full-screen pop-ups, and these pages live on search traffic.
 *
 * Joining is self-serve: the Google Group is a tester list on the closed
 * track (Play Console → Closed testing → Testers), so a member can opt in
 * without anyone adding their address by hand. The card goes away for good
 * only once step 3 (install) is tapped; opting in without installing is not
 * the point.
 *
 * Remove this component (Document.tsx) once the app is in production.
 */
const GROUP = 'https://groups.google.com/g/iqwealth-testers'
const OPT_IN = 'https://play.google.com/apps/testing/com.iraqsm.app'
const STORE = 'https://play.google.com/store/apps/details?id=com.iraqsm.app'
const KEY = 'iq.tester'
const SNOOZE_DAYS = 10

function hidden(): boolean {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'joined') return true
    const until = Number(v)
    return Number.isFinite(until) && until > Date.now()
  } catch { return false }
}
function remember(v: string) { try { localStorage.setItem(KEY, v) } catch { /* private mode: shows again next visit */ } }

export function TesterInvite() {
  const { t } = useLocale()
  const T = t.app.tester
  const [show, setShow] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const d = document.documentElement
    if (d.classList.contains('is-app') || !/Android/i.test(navigator.userAgent) || /IQWealthApp/.test(navigator.userAgent) || hidden()) return
    const id = setTimeout(() => setShow(true), 4000)
    return () => clearTimeout(id)
  }, [])

  if (!show) return null
  const snooze = () => { remember(String(Date.now() + SNOOZE_DAYS * 86_400_000)); setShow(false) }
  const steps = [
    { n: 1, title: T.step1, note: T.step1Note, href: GROUP },
    { n: 2, title: T.step2, note: T.step2Note, href: OPT_IN },
    { n: 3, title: T.step3, note: T.step3Note, href: STORE },
  ]

  return (
    <aside className={`tsi ${open ? 'is-open' : ''}`} aria-label={T.title}>
      <button type="button" className="tsi-x" aria-label={T.close} onClick={snooze}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
      <div className="tsi-head">
        <span className="tsi-mark" aria-hidden="true"><StarMark size={22} color="#fff" /></span>
        <div className="tsi-txt">
          <strong>{T.title}</strong>
          {open ? <span>{T.stepsTitle}</span> : <span>{T.lead}</span>}
        </div>
        {open ? null : <button type="button" className="id-btn is-primary is-sm tsi-go" onClick={() => setOpen(true)}>{T.join}</button>}
      </div>
      {open ? (
        <ol className="tsi-steps">
          {steps.map((s) => (
            <li key={s.n}>
              <span className="tsi-n id-num" aria-hidden="true">{s.n}</span>
              <span className="tsi-step"><b>{s.title}</b><small>{s.note}</small></span>
              <a className="id-btn is-sm" href={s.href} target="_blank" rel="noopener noreferrer"
                onClick={() => { if (s.n === 3) remember('joined') }}>{T.open}</a>
            </li>
          ))}
        </ol>
      ) : null}
    </aside>
  )
}
