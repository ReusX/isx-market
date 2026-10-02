'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useLocale } from '@/context/LocaleContext'
import { localeDate } from '@/lib/date'
import { SiteShell } from './SiteShell'
import { EconRail } from './EconRail'
import { PageTitle } from './PageTitle'
import { AboutSection } from './AboutSection'
import { MiniArea } from './MiniArea'
import '@/styles/econ-page.css'

/**
 * /inflation · on the approved board (identity v3, as /fx and /gold): the
 * latest CSO print as the figure with the swoosh, the World Bank's annual
 * series as the chart, and as the key card a «what is your money worth now»
 * calculator compounding the real annual rates. Three story cards (core,
 * food, the 2006 peak), then every year as a list.
 *
 * A rate is not a price: its chips stay neutral (no up-is-green), since a
 * rising inflation figure is not good news.
 */
export type InflationView = {
  latest: { month: string; yoy: number; prevYoy: number; core: number; food: number; source: string }
  annual: { year: number; rate: number }[]
}

const pct = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 })
const nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const monthLabel = (m: string, locale: 'ar' | 'en') => localeDate(`${m}-01`, locale).replace(/^\d+\s/, '')

export function InflationPage({ latest, annual }: InflationView) {
  const { t, locale } = useLocale()
  const R = t.rates
  const P = R.page.inflation
  const B = P.board
  const lastYear = annual[annual.length - 1]
  const peak = annual.reduce((a, b) => (b.rate > a.rate ? b : a), annual[0] ?? { year: 2006, rate: 53.2 })
  const d = Math.round((latest.yoy - latest.prevYoy) * 10) / 10
  const series = useMemo(() => annual.map((a) => ({ date: `${a.year}-07-01`, value: a.rate })), [annual])

  /* «What is your money worth now»: compound each year's average inflation
     after the chosen year through the last published one. */
  const [amount, setAmount] = useState('100000')
  const [from, setFrom] = useState<number>(lastYear ? Math.max(annual[0]?.year ?? 2004, lastYear.year - 10) : 2015)
  const factor = annual.filter((a) => a.year > from).reduce((f, a) => f * (1 + a.rate / 100), 1)
  const num = parseFloat(amount.replace(/,/g, '')) || 0
  const quickYears = [2004, 2010, 2015, 2020].filter((y) => annual.some((a) => a.year === y))

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
                <p className="fx-huge id-num">
                  <span className="fx-huge-num">
                    <bdi>{pct.format(latest.yoy)}%</bdi>
                    <svg className="fx-swoosh" viewBox="0 0 200 40" preserveAspectRatio="none" aria-hidden="true">
                      <path d="M4 30 C 50 10, 110 4, 196 20" pathLength={1} fill="none" stroke="currentColor" strokeWidth={5} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                    </svg>
                  </span>
                </p>
                <p className="fx-line">
                  <span className="id-chg is-flat"><bdi>{d > 0 ? '+' : ''}{pct.format(d)}</bdi></span>
                  <span>{B.unit(monthLabel(latest.month, locale))} · {B.pts(`${d > 0 ? '+' : ''}${pct.format(d)}`)}</span>
                </p>
                {series.length > 1 ? (
                  <>
                    <MiniArea points={series} format={(v) => `${pct.format(v)}%`} label={P.annual} tone="world" dateLabel={(x) => x.slice(0, 4)} />
                    <p className="fx-chart-note">{B.chartNote(String(annual[0].year), String(lastYear.year))}</p>
                  </>
                ) : null}
              </div>

              {annual.length ? (
                <section className="id-print is-key fx-calc" aria-label={B.calcTitle}>
                  <h2 className="fx-calc-title">{B.calcTitle}</h2>
                  <label className="fx-calc-in" htmlFor="inf-amount">
                    <span>{B.amount}</span>
                    <input id="inf-amount" className="id-num" inputMode="decimal" dir="ltr" value={amount} onChange={(e) => setAmount(e.target.value)} />
                  </label>
                  <label className="fx-calc-in" htmlFor="inf-year">
                    <span>{B.year}</span>
                    <select id="inf-year" value={from} onChange={(e) => setFrom(Number(e.target.value))}>
                      {annual.slice(0, -1).map((a) => <option key={a.year} value={a.year}>{a.year}</option>)}
                    </select>
                  </label>
                  <div className="fx-quick" role="group" aria-label={B.year}>
                    {quickYears.map((y) => <button key={y} type="button" className="fx-qbtn id-num" aria-pressed={from === y} onClick={() => setFrom(y)}>{y}</button>)}
                  </div>
                  <p className="fx-calc-note">{B.calcNote(String(from), String(lastYear.year))}</p>
                  <p className="fx-calc-out id-num"><bdi>{nf0.format(num * factor)}</bdi> <span>{R.page.fx.calcIqd}</span></p>
                  <p className="fx-calc-prev">{B.calcOut} · {B.calcLost(pct.format((factor - 1) * 100))}</p>
                </section>
              ) : null}
            </div>
          </div>
          <div className="fx-captions"><p className="id-cap eco-when">{latest.source}</p></div>

          <div className="fx-facts id-num">
            {(() => {
              const head = B.coreHead(`${pct.format(latest.core)}%`)
              return (
                <section className="id-print is-calm fx-fact" aria-label={P.core}>
                  <svg className="fx-ill" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="22" fill="var(--fill)" stroke="currentColor" strokeWidth="2.5"/><circle cx="32" cy="32" r="10" fill="none" stroke="currentColor" strokeWidth="2.5"/><circle cx="32" cy="32" r="2.5" fill="currentColor"/></svg>
                  <h3 className="fx-fact-head">{head[0]}<em><bdi>{head[1]}</bdi></em>{head[2]}</h3>
                  <p className="fx-pocket">{B.corePocket}</p>
                  <div className="fx-bars is-wide" aria-hidden="true">
                    {([[B.headline, latest.yoy], [B.core, latest.core], [B.food, latest.food]] as [string, number][]).map(([k, v], i) => (
                      <div key={k}><span>{k}</span><i style={{ width: `${(v / Math.max(latest.yoy, latest.core, latest.food)) * 100}%` }} className={i === 1 ? 'is-market' : ''} /><b>{pct.format(v)}%</b></div>
                    ))}
                  </div>
                  <details className="fx-more"><summary aria-label={R.page.fx.facts.more}>+</summary><p>{B.coreMore}</p></details>
                </section>
              )
            })()}

            {(() => {
              const head = B.foodHead(`${pct.format(latest.food)}%`)
              return (
                <section className="id-print is-calm fx-fact" aria-label={P.food}>
                  <svg className="fx-ill" viewBox="0 0 64 64" aria-hidden="true"><path d="M10 30h44l-4 20a4 4 0 0 1-4 3H18a4 4 0 0 1-4-3z" fill="var(--fill)" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/><path d="M20 30l8-16M44 30l-8-16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
                  <h3 className="fx-fact-head">{head[0]}<em><bdi>{head[1]}</bdi></em>{head[2]}</h3>
                  <p className="fx-pocket">{B.foodPocket(latest.food > latest.yoy)}</p>
                  <div className="fx-pair">
                    <div><small>{B.food}</small><b><bdi>{pct.format(latest.food)}%</bdi></b></div>
                    <div><small>{B.headline}</small><b><bdi>{pct.format(latest.yoy)}%</bdi></b></div>
                  </div>
                  <details className="fx-more"><summary aria-label={R.page.fx.facts.more}>+</summary><p>{B.foodMore}</p></details>
                </section>
              )
            })()}

            {peak ? (() => {
              const head = B.peakHead(String(peak.year), `${pct.format(peak.rate)}%`)
              const lost = 100000 - 100000 / (1 + peak.rate / 100)
              return (
                <section className="id-print is-calm fx-fact" aria-label={String(peak.year)}>
                  <svg className="fx-ill" viewBox="0 0 64 64" aria-hidden="true"><path d="M8 52l14-20 10 8 22-28" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M44 12h10v10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <h3 className="fx-fact-head">{head[0]}<em><bdi>{head[1]}</bdi></em>{head[2]}</h3>
                  <p className="fx-pocket">{B.peakPocket(nf0.format(lost))}</p>
                  <details className="fx-more"><summary aria-label={R.page.fx.facts.more}>+</summary><p>{B.peakMore}</p></details>
                </section>
              )
            })() : null}
          </div>

          {annual.length ? (
            <section className="cur-all" aria-label={B.all}>
              <PageTitle as="h2" className="id-h3" title={B.all} note={P.annualNote} />
              <ul className="cmap-far-list eco-years id-num">
                {[...annual].reverse().map((a) => (
                  <li key={a.year}><span className="cmap-name">{a.year}</span><span className="cmap-price"><bdi>{pct.format(a.rate)}%</bdi></span><span /></li>
                ))}
              </ul>
            </section>
          ) : null}

          <AboutSection title={P.basket} body={P.basketBody} />

          <section className="eco-faq id-panel" aria-label={P.faqTitle}>
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
