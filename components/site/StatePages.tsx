'use client'

import Link from 'next/link'
import { useLocale } from '@/context/LocaleContext'
import { SiteShell } from './SiteShell'
import '@/styles/info-page.css'

/**
 * The route states — 404 and 500 — on the site shell.
 *
 * A failed route's whole job is «where can I go instead?», so the shell
 * stays: nav, foot, and one plain answer with two or three real
 * destinations. The `Error` object is received by the route file and
 * never rendered here — no stack, no digest, no provider message.
 */
export function NotFoundPage() {
  const { t, href: L } = useLocale()
  const s = t.system.notFound
  return (
    <SiteShell>
      <main className="inf id-full">
        <div className="inf-body id-read inf-state">
          <p className="id-eyebrow id-num">404</p>
          <h1 className="id-h1">{s.title}</h1>
          <p className="id-body">{s.note}</p>
          <p className="inf-state-acts">
            <Link className="id-btn is-primary" href={L('/')}>{s.home}</Link>
            <Link className="id-btn" href={L('/market')}>{t.nav.market}</Link>
            <Link className="id-btn" href={L('/screener')}>{t.nav.screener}</Link>
          </p>
        </div>
      </main>
    </SiteShell>
  )
}

export function FaultPage({ reset }: { reset: () => void }) {
  const { t, href: L } = useLocale()
  const s = t.system.fault
  return (
    <SiteShell>
      <main className="inf id-full">
        <div className="inf-body id-read inf-state">
          <p className="id-eyebrow id-num">500</p>
          <h1 className="id-h1">{s.title}</h1>
          <p className="id-body">{s.note}</p>
          <p className="inf-state-acts">
            <button className="id-btn is-primary" type="button" onClick={reset}>{t.system.retry}</button>
            <Link className="id-btn" href={L('/')}>{s.home}</Link>
          </p>
          <p className="id-cap">{s.hintBefore} <Link className="id-link" href={L('/contact')}>{s.contact}</Link>.</p>
        </div>
      </main>
    </SiteShell>
  )
}
