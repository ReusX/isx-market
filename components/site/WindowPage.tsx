'use client'

import Link from 'next/link'
import { useLocale } from '@/context/LocaleContext'
import { CBI_OFFICIAL_RATE } from '@/lib/fxOfficial'
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
 * figure to show any more, so on the board (identity v3) the «figure» is the
 * window's status, the last published bulletin is drawn as its two parts,
 * and the key card holds that last total; the milestones become a drawn
 * timeline. No daily number is invented.
 */
const LAST = { transfers: 290_581_825, cash: 17_350_000, total: 307_931_825 }
const nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

export function WindowPage() {
  const { t } = useLocale()
  const R = t.rates
  const P = R.page.window
  const B = P.board
  return (
    <SiteShell>
      <main className="eco id-full iq-door" data-world="tile" data-level="accent">
        <EconRail />
        <div className="eco-body">
          <div className="fx-frame">
            <div className="fx-board">
              <div className="fx-lead">
                <header className="eco-head fx-head">
                  <PageTitle title={P.title} note={P.leadNote} className="fx-title" />
                </header>
                <p className="fx-huge win-status">
                  <span className="fx-huge-num">
                    <bdi>{B.status}</bdi>
                    <svg className="fx-swoosh" viewBox="0 0 200 40" preserveAspectRatio="none" aria-hidden="true">
                      <path d="M4 30 C 50 10, 110 4, 196 20" pathLength={1} fill="none" stroke="currentColor" strokeWidth={5} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                    </svg>
                  </span>
                </p>
                <p className="fx-line"><span>{B.since}</span></p>
                <div className="oil-ladder" aria-label={B.lastTitle}>
                  {([[P.transfers, LAST.transfers, true], [P.cash, LAST.cash, false]] as [string, number, boolean][]).map(([k, v, main]) => (
                    <div key={k} className={main ? 'is-iraq' : undefined}>
                      <span className="oil-ladder-name">{k}</span>
                      <span className="oil-ladder-track"><i style={{ width: `${(v / LAST.total) * 100}%` }} /></span>
                      <b className="id-num"><bdi>${nf0.format(v)}</bdi></b>
                    </div>
                  ))}
                  <p className="fx-chart-note">{B.lastTitle} · {P.lastDate}</p>
                </div>
              </div>

              <section className="id-print is-key fx-calc" aria-label={B.lastTitle}>
                <h2 className="fx-calc-title">{B.lastTitle}</h2>
                <p className="fx-calc-note">{B.total} · {P.lastDate}</p>
                <p className="fx-calc-out id-num"><bdi>${nf0.format(LAST.total)}</bdi></p>
                <p className="fx-calc-prev id-num">{B.inDinars(nf0.format(LAST.total * CBI_OFFICIAL_RATE))}</p>
                <p className="fx-calc-note">{B.perDay}</p>
              </section>
            </div>
          </div>

          <section className="cur-all" aria-label={P.timeline}>
            <PageTitle as="h2" className="id-h3" title={B.timeline} note={P.timelineNote} />
            <ol className="win-line">
              {P.steps.map((s, i) => (
                <li key={s.date} className={i === P.steps.length - 1 ? 'is-last' : undefined}>
                  <span className="win-dot" aria-hidden="true" />
                  <b className="id-num"><bdi>{s.date}</bdi></b>
                  <p>{s.event}</p>
                </li>
              ))}
            </ol>
          </section>

          <AboutSection title={P.how} body={P.howBody} />
          <AboutSection title={P.after} body={P.afterBody} />

          <section className="eco-faq id-panel" aria-label={P.faqTitle}>
            <h2 className="id-h3">{P.faqTitle}</h2>
            {P.faq.map((q) => <details key={q.q} className="eco-q"><summary>{q.q}</summary><p className="id-body">{q.a}</p></details>)}
          </section>
          <p className="id-cap"><Link href="/fx">{R.page.rail.fx}</Link> · <Link href="/policy-rate">{R.page.rail.policyRate}</Link> · <Link href="/banks">{t.banks.hub.rail.banks}</Link></p>
        </div>
      </main>
    </SiteShell>
  )
}
