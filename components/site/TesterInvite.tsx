'use client'

import { useEffect, useState } from 'react'
import { useLocale } from '@/context/LocaleContext'
import { StarMark } from '@/components/brand/StarMark'
import '@/styles/econ-page.css'

/**
 * Closed-test recruitment · a small card at the bottom of the page, for
 * Android visitors on the website only (never inside the app, never on
 * iPhone or desktop, where there is nothing to install).
 *
 * Not an interstitial: it covers no content until tapped and appears after
 * the page has settled. Google demotes mobile pages behind
 * full-screen pop-ups, and these pages live on search traffic.
 *
 * Joining is self-serve: the Google Group is a tester list on the closed
 * track (Play Console → Closed testing → Testers), so a member can opt in
 * without anyone adding their address by hand.
 *
 * Shown on up to MAX_VISITS separate visits (browser sessions), whatever the
 * reader did last time: someone who tapped through once may still have
 * skipped a step. Within a visit it stays until closed; × hides it for the
 * rest of that visit.
 *
 * Remove this component (Document.tsx) once the app is in production.
 */
const GROUP = 'https://groups.google.com/g/iqwealth-testers'
const OPT_IN = 'https://play.google.com/apps/testing/com.iraqsm.app'
const STORE = 'https://play.google.com/store/apps/details?id=com.iraqsm.app'
const KEY = 'iq.tester.visits'
const SESSION = 'iq.tester.session'
const MAX_VISITS = 5

/** Whether this visit shows the card; counts a new visit the first time it is asked. */
function shouldShow(): boolean {
  try {
    const here = sessionStorage.getItem(SESSION)
    if (here === 'closed') return false
    if (here === 'shown') return true
    const seen = Number(localStorage.getItem(KEY)) || 0
    if (seen >= MAX_VISITS) return false
    localStorage.setItem(KEY, String(seen + 1))
    sessionStorage.setItem(SESSION, 'shown')
    return true
  } catch { return false }
}

export function TesterInvite() {
  const { t } = useLocale()
  const T = t.app.tester
  const [show, setShow] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const d = document.documentElement
    if (d.classList.contains('is-app') || !/Android/i.test(navigator.userAgent) || /IQWealthApp/.test(navigator.userAgent) || !shouldShow()) return
    /* One card at a time: while the globe welcome is on screen the invite
       waits, and shows once the welcome is closed or scrolled away. */
    const card = d.getAttribute('data-welcome') === 'off' ? null : document.querySelector('.ld-card')
    let ready = false, clear = !card, io: IntersectionObserver | null = null
    const tryShow = () => { if (ready && clear) setShow(true) }
    if (card) {
      io = new IntersectionObserver(([e]) => { clear = !e.isIntersecting; tryShow() })
      io.observe(card)
    }
    const off = () => { clear = true; tryShow() }
    window.addEventListener('iq:welcome-off', off)
    const id = setTimeout(() => { ready = true; tryShow() }, 4000)
    return () => { clearTimeout(id); io?.disconnect(); window.removeEventListener('iq:welcome-off', off) }
  }, [])

  if (!show) return null
  const close = () => { try { sessionStorage.setItem(SESSION, 'closed') } catch { /* ignore */ } setShow(false) }
  const steps = [
    { n: 1, title: T.step1, note: T.step1Note, href: GROUP },
    { n: 2, title: T.step2, note: T.step2Note, href: OPT_IN },
    { n: 3, title: T.step3, note: T.step3Note, href: STORE },
  ]

  return (
    <aside className={`tsi tsi3 ${open ? 'is-open' : ''}`} data-world="lapis" aria-label={T.title}>
      <button type="button" className="tsi-x" aria-label={T.close} onClick={close}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
      <div className="tsi-head">
        <span className="tsi-mark" aria-hidden="true"><StarMark size={22} color="#fff" /></span>
        <div className="tsi-txt">
          <strong>{T.title}</strong>
          {open ? <span>{T.stepsTitle}</span> : <span>{T.lead}</span>}
        </div>
        {open ? null : <button type="button" className="tsi-go tsi3-go" onClick={() => setOpen(true)}>{T.join}</button>}
      </div>
      {open ? (
        <ol className="tsi-steps">
          {steps.map((s) => (
            <li key={s.n}>
              <span className="tsi-n id-num" aria-hidden="true">{s.n}</span>
              <span className="tsi-step"><b>{s.title}</b><small>{s.note}</small></span>
              <a className="fx-qbtn tsi3-open" href={s.href} target="_blank" rel="noopener noreferrer">{T.open}</a>
            </li>
          ))}
        </ol>
      ) : null}
    </aside>
  )
}
