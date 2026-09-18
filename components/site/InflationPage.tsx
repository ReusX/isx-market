'use client'

import Link from 'next/link'
import { useLocale } from '@/context/LocaleContext'
import { localeDate } from '@/lib/date'
import { SiteShell } from './SiteShell'
import { EconRail } from './EconRail'
import { PageTitle } from './PageTitle'
import { AboutSection } from './AboutSection'
import '@/styles/econ-page.css'

export type InflationView = {
  latest: { month: string; yoy: number; prevYoy: number; core: number; food: number; source: string }
  annual: { year: number; rate: number }[]
}

const pct = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 })
const monthLabel = (m: string, locale: 'ar' | 'en') => localeDate(`${m}-01`, locale).replace(/^\d+\s/, '')

export function InflationPage({ latest, annual }: InflationView) {
  const { t, locale } = useLocale()
  const R = t.rates
  const P = R.page.inflation
  const lastYear = annual[annual.length - 1]
  const peak = annual.reduce((a, b) => (b.rate > a.rate ? b : a), annual[0] ?? { year: 2006, rate: 53.2 })
  const recent = annual.slice(-16)
  const max = Math.max(...recent.map((a) => a.rate), 1)

  return (
    <SiteShell>
      <main className="eco id-full iq-door">
        <EconRail />
        <div className="eco-body">
          <header className="eco-head">
            <p className="id-eyebrow">{R.page.eyebrow}</p>
            <PageTitle title={P.title} note={P.leadNote} />
            <p className="eco-lead id-num">
              <strong><bdi>{pct.format(latest.yoy)}%</bdi></strong>
              <span className="eco-unit">{P.unit(monthLabel(latest.month, locale))}</span>
            </p>
            <p className="eco-hundred id-num">{P.prev(pct.format(latest.prevYoy))}</p>
            <div className="id-stats id-num eco-stats">
              <div className="id-stat"><small>{P.core}</small><b><bdi>{pct.format(latest.core)}%</bdi></b><span className="id-cap">{P.coreNote}</span></div>
              <div className="id-stat"><small>{P.food}</small><b><bdi>{pct.format(latest.food)}%</bdi></b></div>
              {lastYear ? <div className="id-stat"><small>{P.yearAvg(String(lastYear.year))}</small><b><bdi>{pct.format(lastYear.rate)}%</bdi></b></div> : null}
            </div>
            <p className="id-cap eco-when">{latest.source}</p>
          </header>

          {annual.length ? (
            <section className="id-panel eco-panel" aria-label={P.annual}>
              <PageTitle as="h2" className="id-h3" title={P.annual} note={P.annualNote} />
              <div className="eco-bars id-num" aria-hidden="true">
                {recent.map((a) => (
                  <div key={a.year} className={`eco-bar ${a.rate < 0 ? 'is-neg' : ''}`}><span style={{ height: `${Math.max(3, (Math.abs(a.rate) / max) * 100)}%` }} /><small>{a.year}</small><b>{pct.format(a.rate)}%</b></div>
                ))}
              </div>
              <div className="id-table-scroll">
                <table className="id-table eco-table id-num">
                  <thead><tr><th>{P.colYear}</th><th className="is-end">{P.colRate}</th></tr></thead>
                  <tbody>{[...annual].reverse().map((a) => <tr key={a.year}><td>{a.year}</td><td className="is-end"><bdi className={a.rate < 0 ? 'id-down' : ''}>{pct.format(a.rate)}%</bdi></td></tr>)}</tbody>
                </table>
              </div>
            </section>
          ) : null}

          <AboutSection title={P.basket} body={P.basketBody} />

          <section className="eco-faq" aria-label={P.faqTitle}>
            <h2 className="id-h3">{P.faqTitle}</h2>
            {P.faq({ rate: pct.format(latest.yoy), month: monthLabel(latest.month, locale), prev: pct.format(latest.prevYoy), core: pct.format(latest.core), food: pct.format(latest.food), yearAvg: lastYear ? pct.format(lastYear.rate) : '—', year: lastYear ? String(lastYear.year) : '—', peakYear: String(peak.year), peak: pct.format(peak.rate) }).map((q) => (
              <details key={q.q} className="eco-q"><summary>{q.q}</summary><p className="id-body">{q.a}</p></details>
            ))}
          </section>
          <p className="id-cap"><Link href="/fx">{R.page.rail.fx}</Link> · <Link href="/policy-rate">{R.page.rail.policyRate}</Link></p>
        </div>
      </main>
    </SiteShell>
  )
}
