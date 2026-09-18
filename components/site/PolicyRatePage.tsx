'use client'

import Link from 'next/link'
import { useLocale } from '@/context/LocaleContext'
import { localeDate } from '@/lib/date'
import { SiteShell } from './SiteShell'
import { EconRail } from './EconRail'
import { PageTitle } from './PageTitle'
import { AboutSection } from './AboutSection'
import '@/styles/econ-page.css'

/** Serialisable copy of lib/macro's RateStep — the page is a client component. */
export type RateStepView = { date: string; rate: number; note: string; source: string; approx?: boolean }

const pct = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })
const monthOnly = (d: string) => /^\d{4}-\d{2}$/.test(d)

export function PolicyRatePage({ rate, since, history }: { rate: number; since: string; history: RateStepView[] }) {
  const { t, locale } = useLocale()
  const R = t.rates
  const P = R.page.policyRate
  const prev = history[1]
  const fmtDate = (d: string) => (monthOnly(d) ? localeDate(`${d}-01`, locale).replace(/^\d+\s/, '') : localeDate(d, locale))

  return (
    <SiteShell>
      <main className="eco id-full iq-door">
        <EconRail />
        <div className="eco-body">
          <header className="eco-head">
            <p className="id-eyebrow">{R.page.eyebrow}</p>
            <PageTitle title={P.title} note={P.leadNote} />
            <p className="eco-lead id-num">
              <strong><bdi>{pct.format(rate)}%</bdi></strong>
              <span className="eco-unit">{P.unit}</span>
            </p>
            <p className="eco-hundred id-num">{P.since(localeDate(since, locale))}{prev ? ` · ${P.prev(pct.format(prev.rate))}` : ''}</p>
            <div className="id-stats id-num eco-stats">
              <div className="id-stat"><small>{P.cd14}</small><b><bdi>4%</bdi></b></div>
              <div className="id-stat"><small>{P.cd182}</small><b><bdi>5.5%</bdi></b></div>
              <div className="id-stat"><small>{P.reserve}</small><b><bdi>10%</bdi></b></div>
            </div>
          </header>

          <section className="id-panel eco-panel" aria-label={P.history}>
            <PageTitle as="h2" className="id-h3" title={P.history} note={P.historyNote} />
            <div className="eco-bars id-num" aria-hidden="true">
              {[...history].reverse().map((s) => (
                <div key={s.date} className="eco-bar"><span style={{ height: `${Math.max(4, (s.rate / 20) * 100)}%` }} /><small>{s.date.slice(0, 4)}</small><b>{pct.format(s.rate)}%</b></div>
              ))}
            </div>
            <div className="id-table-scroll">
              <table className="id-table eco-table id-num">
                <thead><tr><th>{P.colDate}</th><th className="is-end">{P.colRate}</th><th>{P.colNote}</th><th>{P.colSource}</th></tr></thead>
                <tbody>
                  {history.map((s) => (
                    <tr key={s.date}><td><bdi>{s.approx ? '≈ ' : ''}{fmtDate(s.date)}</bdi></td><td className="is-end"><bdi>{pct.format(s.rate)}%</bdi></td><td className="eco-wrap">{s.note}</td><td className="eco-wrap id-cap">{s.source}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <AboutSection title={P.meaning} body={P.meaningBody} />

          <section className="eco-faq" aria-label={P.faqTitle}>
            <h2 className="id-h3">{P.faqTitle}</h2>
            {P.faq({ rate: pct.format(rate), since: localeDate(since, locale), prev: prev ? pct.format(prev.rate) : '—', prevDate: prev ? fmtDate(prev.date) : '—', cd14: '4', cd182: '5.5' }).map((q) => (
              <details key={q.q} className="eco-q"><summary>{q.q}</summary><p className="id-body">{q.a}</p></details>
            ))}
          </section>
          <p className="id-cap"><Link href="/banks/deposits">{t.banks.hub.rail.deposits}</Link> · <Link href="/banks/loans">{t.banks.hub.rail.loans}</Link> · <Link href="/fx">{R.page.rail.fx}</Link></p>
        </div>
      </main>
    </SiteShell>
  )
}
