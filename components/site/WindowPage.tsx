'use client'

import Link from 'next/link'
import { useLocale } from '@/context/LocaleContext'
import { SiteShell } from './SiteShell'
import { EconRail } from './EconRail'
import { PageTitle } from './PageTitle'
import { AboutSection } from './AboutSection'
import '@/styles/econ-page.css'

/**
 * /cbi-window · the currency window, explained — not tracked.
 *
 * The daily bulletin this page was planned around stopped on 27 Feb 2025,
 * two months after the CBI ended the electronic platform. There is no daily
 * figure to show any more, so the page says what the window was, what the
 * last published numbers were, and what replaced it — and says plainly that
 * no daily number exists now, instead of inventing one.
 */
const LAST = { transfers: 290_581_825, cash: 17_350_000, total: 307_931_825 }
const nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

export function WindowPage() {
  const { t } = useLocale()
  const R = t.rates
  const P = R.page.window
  return (
    <SiteShell>
      <main className="eco id-full iq-door">
        <EconRail />
        <div className="eco-body">
          <header className="eco-head">
            <p className="id-eyebrow">{R.page.eyebrow}</p>
            <PageTitle title={P.title} note={P.leadNote} />
            <p className="eco-lead">
              <strong className="eco-status">{P.status}</strong>
              <span className="eco-unit">{P.statusSince}</span>
            </p>
            <p className="id-cap eco-when">{P.lastTitle} · {P.lastDate}</p>
            <div className="id-stats id-num eco-stats">
              <div className="id-stat"><small>{P.transfers}</small><b><bdi>{nf0.format(LAST.transfers)}</bdi></b><span className="id-cap">{P.usd}</span></div>
              <div className="id-stat"><small>{P.cash}</small><b><bdi>{nf0.format(LAST.cash)}</bdi></b><span className="id-cap">{P.usd}</span></div>
              <div className="id-stat"><small>{P.total}</small><b><bdi>{nf0.format(LAST.total)}</bdi></b><span className="id-cap">{P.usd}</span></div>
            </div>
          </header>

          <section className="id-panel eco-panel" aria-label={P.timeline}>
            <PageTitle as="h2" className="id-h3" title={P.timeline} note={P.timelineNote} />
            <div className="id-table-scroll">
              <table className="id-table eco-table id-num">
                <thead><tr><th>{P.colDate}</th><th>{P.colEvent}</th></tr></thead>
                <tbody>{P.steps.map((s) => <tr key={s.date}><td><bdi>{s.date}</bdi></td><td className="eco-wrap">{s.event}</td></tr>)}</tbody>
              </table>
            </div>
          </section>

          <AboutSection title={P.how} body={P.howBody} />
          <AboutSection title={P.after} body={P.afterBody} />

          <section className="eco-faq" aria-label={P.faqTitle}>
            <h2 className="id-h3">{P.faqTitle}</h2>
            {P.faq.map((q) => <details key={q.q} className="eco-q"><summary>{q.q}</summary><p className="id-body">{q.a}</p></details>)}
          </section>
          <p className="id-cap"><Link href="/fx">{R.page.rail.fx}</Link> · <Link href="/policy-rate">{R.page.rail.policyRate}</Link> · <Link href="/banks">{t.banks.hub.rail.banks}</Link></p>
        </div>
      </main>
    </SiteShell>
  )
}
