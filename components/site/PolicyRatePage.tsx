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
 * /policy-rate · on the approved board (identity v3, as /fx and /gold): the
 * rate as the figure with the swoosh, its history as a step chart (a rate
 * holds until the next decision), an interest calculator as the key card,
 * three story cards (the last decision, the certificates, the 2007 peak),
 * then every decision with its note and source. A rate is not a price, so
 * its chips stay neutral.
 */
export type RateStepView = { date: string; rate: number; note: string; source: string; approx?: boolean }

const pct = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })
const nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const monthOnly = (d: string) => /^\d{4}-\d{2}$/.test(d)

export function PolicyRatePage({ rate, since, history }: { rate: number; since: string; history: RateStepView[] }) {
  const { t, locale } = useLocale()
  const R = t.rates
  const P = R.page.policyRate
  const B = P.board
  const prev = history[1]
  const peak = history.reduce((a, b) => (b.rate > a.rate ? b : a), history[0])
  const fmtDate = (d: string) => (monthOnly(d) ? localeDate(`${d}-01`, locale).replace(/^\d+\s/, '') : localeDate(d, locale))
  /* Oldest first, carried to today so the last step reaches the present. */
  const series = useMemo(() => {
    const pts = [...history].reverse().map((s) => ({ date: monthOnly(s.date) ? `${s.date}-01` : s.date, value: s.rate }))
    pts.push({ date: new Date().toISOString().slice(0, 10), value: rate })
    return pts
  }, [history, rate])

  const [amount, setAmount] = useState('10000000')
  const [r, setR] = useState<number>(rate)
  const [months, setMonths] = useState<number>(12)
  const num = parseFloat(amount.replace(/,/g, '')) || 0
  const interest = num * (r / 100) * (months / 12)

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
                    <bdi>{pct.format(rate)}%</bdi>
                    <svg className="fx-swoosh" viewBox="0 0 200 40" preserveAspectRatio="none" aria-hidden="true">
                      <path d="M4 30 C 50 10, 110 4, 196 20" pathLength={1} fill="none" stroke="currentColor" strokeWidth={5} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                    </svg>
                  </span>
                </p>
                <p className="fx-line">
                  {prev ? <span className="id-chg is-flat"><bdi>{rate - prev.rate > 0 ? '+' : ''}{pct.format(rate - prev.rate)}</bdi></span> : null}
                  <span>{B.unit} · {B.since(localeDate(since, locale), prev ? pct.format(prev.rate) : '—')}</span>
                </p>
                <MiniArea points={series} format={(v) => `${pct.format(v)}%`} label={P.history} tone="world" step dateLabel={(x) => x.slice(0, 4)} />
                <p className="fx-chart-note">{B.chartNote}</p>
              </div>

              <section className="id-print is-key fx-calc" aria-label={B.calcTitle}>
                <h2 className="fx-calc-title">{B.calcTitle}</h2>
                <label className="fx-calc-in" htmlFor="pr-amount">
                  <span>{B.amount}</span>
                  <input id="pr-amount" className="id-num" inputMode="decimal" dir="ltr" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </label>
                <div className="fx-quick" role="group" aria-label={B.rate}>
                  {[4, rate, 7.5].filter((v, i, a) => a.indexOf(v) === i).map((v) => <button key={v} type="button" className="fx-qbtn id-num" aria-pressed={r === v} onClick={() => setR(v)}>{pct.format(v)}%</button>)}
                </div>
                <div className="fx-quick" role="group" aria-label={B.months}>
                  {[3, 6, 12, 24].map((m) => <button key={m} type="button" className="fx-qbtn id-num" aria-pressed={months === m} onClick={() => setMonths(m)}>{B.monthsN(m)}</button>)}
                </div>
                <p className="fx-calc-note">{B.calcNote}</p>
                <p className="fx-calc-out id-num"><bdi>{nf0.format(interest)}</bdi> <span>{R.page.fx.calcIqd}</span></p>
                <p className="fx-calc-prev"><Link href="/banks/deposits">{B.deposits}</Link></p>
              </section>
            </div>
          </div>
          <div className="fx-captions"><p className="id-cap eco-when">{history[0]?.source}</p></div>

          <div className="fx-facts id-num">
            {prev ? (() => {
              const head = B.cutHead(pct.format(prev.rate), `${pct.format(rate)}%`)
              return (
                <section className="id-print is-calm fx-fact" aria-label={P.history}>
                  <svg className="fx-ill" viewBox="0 0 64 64" aria-hidden="true"><path d="M10 14h18v14h14v14h12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M48 36l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <h3 className="fx-fact-head">{head[0]}<em><bdi>{head[1]}</bdi></em>{head[2]}</h3>
                  <p className="fx-pocket">{B.cutPocket(nf0.format(10_000_000 * Math.abs(prev.rate - rate) / 100))}</p>
                  <div className="fx-pair">
                    <div><small>{fmtDate(prev.date)}</small><b><bdi>{pct.format(prev.rate)}%</bdi></b></div>
                    <div><small>{localeDate(since, locale)}</small><b><bdi>{pct.format(rate)}%</bdi></b></div>
                  </div>
                  <details className="fx-more"><summary aria-label={R.page.fx.facts.more}>+</summary><p>{B.cutMore}</p></details>
                </section>
              )
            })() : null}

            {(() => {
              const head = B.cdHead('5.5%')
              return (
                <section className="id-print is-calm fx-fact" aria-label={P.cdTitle}>
                  <svg className="fx-ill" viewBox="0 0 64 64" aria-hidden="true"><rect x="10" y="14" width="44" height="36" rx="4" fill="var(--fill)" stroke="currentColor" strokeWidth="2.5"/><path d="M18 26h28M18 34h20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/><circle cx="44" cy="42" r="5" fill="none" stroke="currentColor" strokeWidth="2.2"/></svg>
                  <h3 className="fx-fact-head">{head[0]}<em><bdi>{head[1]}</bdi></em>{head[2]}</h3>
                  <p className="fx-pocket">{B.cdPocket('4')}</p>
                  <div className="fx-bars is-wide" aria-hidden="true">
                    <div><span>{P.cd182}</span><i style={{ width: '55%' }} className="is-market" /><b>5.5%</b></div>
                    <div><span>{P.cd14}</span><i style={{ width: '40%' }} /><b>4%</b></div>
                    <div><span>{P.reserve}</span><i style={{ width: '100%' }} /><b>10%</b></div>
                  </div>
                  <details className="fx-more"><summary aria-label={R.page.fx.facts.more}>+</summary><p>{B.cdMore}</p></details>
                </section>
              )
            })()}

            {peak ? (() => {
              const head = B.peakHead(peak.date.slice(0, 4), `${pct.format(peak.rate)}%`)
              return (
                <section className="id-print is-calm fx-fact" aria-label={peak.date.slice(0, 4)}>
                  <svg className="fx-ill" viewBox="0 0 64 64" aria-hidden="true"><path d="M8 52l14-20 10 8 22-28" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M44 12h10v10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <h3 className="fx-fact-head">{head[0]}<em><bdi>{head[1]}</bdi></em>{head[2]}</h3>
                  <p className="fx-pocket">{B.peakPocket}</p>
                  <details className="fx-more"><summary aria-label={R.page.fx.facts.more}>+</summary><p>{B.peakMore}</p></details>
                </section>
              )
            })() : null}
          </div>

          <section className="cur-all" aria-label={B.all}>
            <PageTitle as="h2" className="id-h3" title={B.all} note={P.historyNote} />
            <ol className="eco-steps">
              {history.map((s) => (
                <li key={s.date}>
                  <span className="eco-steps-date id-num"><bdi>{s.approx ? '≈ ' : ''}{fmtDate(s.date)}</bdi></span>
                  <b className="eco-steps-val id-num"><bdi>{pct.format(s.rate)}%</bdi></b>
                  <p>{s.note}<small>{s.source}</small></p>
                </li>
              ))}
            </ol>
          </section>

          <AboutSection title={P.meaning} body={P.meaningBody} />

          <section className="eco-faq id-panel" aria-label={P.faqTitle}>
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
