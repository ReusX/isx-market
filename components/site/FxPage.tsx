'use client'

import { useMemo, useState } from 'react'
import { useLocale } from '@/context/LocaleContext'
import { localeDate } from '@/lib/date'
import { SiteShell } from './SiteShell'
import { EconRail } from './EconRail'
import { PageTitle } from './PageTitle'
import { AboutSection } from './AboutSection'
import { SeriesChart, type ChartRange } from './SeriesChart'
import type { FxData } from '@/lib/rates'
import type { FxDay } from '@/lib/fxHistory'
import { statsFrom } from '@/lib/fxHistory'
import { CBI_OFFICIAL_RATE, CBI_RATE_CONFIRMED } from '@/lib/fxOfficial'
import type { FxQa } from '@/lib/fxCopy'
import '@/styles/econ-page.css'

/**
 * /fx · the dollar against the dinar.
 *
 * One number is the page: the parallel-market rate, display weight, with
 * the official rate and the gap beside it as facts, not rivals. Under it
 * the two series over time (our daily record of the Baghdad close; the
 * Central Bank's published rate as a dashed line), a converter, and the
 * questions people actually type, with live figures.
 *
 * Server-seeded: the rate, both series and the FAQ arrive as props. The
 * official rate is a policy figure with a confirmation date, never a
 * scraped market — see lib/fxOfficial.
 */
const nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const nf2 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })

export function FxPage({ fx, parallel, official, faq }: { fx: FxData | null; parallel: FxDay[]; official: FxDay[]; faq: FxQa[] }) {
  const { t, locale } = useLocale()
  const R = t.rates
  const P = R.page.fx
  const C = R.fx
  const market = fx?.sell ?? fx?.buy ?? null
  const officialLatest = official.length ? official[official.length - 1] : null
  const officialRate = officialLatest?.close ?? CBI_OFFICIAL_RATE
  const officialDate = officialLatest?.date ?? CBI_RATE_CONFIRMED
  const gap = market != null ? { abs: market - officialRate, pct: ((market - officialRate) / officialRate) * 100 } : null

  const ranges: ChartRange[] = [
    { id: '1M', label: C.period['1M'], days: 31 }, { id: '3M', label: C.period['3M'], days: 92 },
    { id: '6M', label: C.period['6M'], days: 183 }, { id: '1Y', label: C.period['1Y'], days: 366 },
    { id: '5Y', label: C.period['5Y'], days: 5 * 366 }, { id: 'MAX', label: C.period.MAX, days: null },
  ]
  const series = useMemo(() => [
    { key: 'parallel', label: C.legendParallel, points: parallel.filter((d) => d.close != null).map((d) => ({ date: d.date, value: d.close as number })) },
    { key: 'official', label: C.legendOfficial, points: official.filter((d) => d.close != null).map((d) => ({ date: d.date, value: d.close as number })), dashed: true, muted: true },
  ], [parallel, official, C])
  const stats = useMemo(() => statsFrom(parallel), [parallel])

  /* Converter: one amount, two directions, the rate you choose. */
  const [amount, setAmount] = useState('100')
  const [dir, setDir] = useState<'usd' | 'iqd'>('usd')
  const [use, setUse] = useState<'market' | 'official'>('market')
  const rate = use === 'market' ? market : officialRate
  const num = parseFloat(amount.replace(/,/g, '')) || 0
  const out = rate ? (dir === 'usd' ? num * rate : num / rate) : null

  const chg = (v: number | null) => v == null ? <span className="id-cap">{C.notEnough}</span>
    : <bdi className={v > 0 ? 'id-down' : v < 0 ? 'id-up' : ''}>{v > 0 ? '+' : ''}{nf0.format(v)}</bdi>

  return (
    <SiteShell>
      <main className="eco id-full iq-door">
        <EconRail />
        <div className="eco-body">
          <header className="eco-head">
            <p className="id-eyebrow">{R.page.eyebrow}</p>
            <PageTitle title={P.title} note={C.referenceCaveat} />
            <p className="eco-lead id-num">
              <strong>{market == null ? '—' : nf0.format(market)}</strong>
              <span className="eco-unit">{P.perDollar} · {P.market}</span>
            </p>
            <p className="id-cap eco-when">
              {fx?.stale ? `${C.staleNotice} · ` : ''}{fx?.date ? R.tools.observedOn(localeDate(fx.date, locale)) : R.tools.noObserved}
            </p>
            <div className="id-stats id-num eco-stats">
              <div className="id-stat"><small>{C.buy}</small><b><bdi>{fx?.buy == null ? '—' : nf0.format(fx.buy)}</bdi></b></div>
              <div className="id-stat"><small>{C.sell}</small><b><bdi>{fx?.sell == null ? '—' : nf0.format(fx.sell)}</bdi></b></div>
              <div className="id-stat"><small>{P.official}</small><b><bdi>{nf0.format(officialRate)}</bdi></b><span className="id-cap">{P.officialNote(localeDate(officialDate, locale))}</span></div>
              <div className="id-stat"><small>{P.gap}</small><b>{gap ? <bdi>{gap.abs > 0 ? '+' : ''}{nf0.format(gap.abs)} · {gap.pct.toFixed(1)}%</bdi> : '—'}</b><span className="id-cap">{P.gapNote}</span></div>
            </div>
          </header>

          {parallel.length > 1 ? (
            <section className="id-panel eco-panel" aria-label={C.chartLabel}>
              <PageTitle as="h2" className="id-h3" title={P.chartTitle} note={P.chartNote} />
              <SeriesChart series={series} ranges={ranges} defaultRange="1Y" format={(v) => nf0.format(v)} label={C.chartLabel} />
              <div className="id-stats id-num eco-stats is-5">
                <div className="id-stat"><small>{C.changeToday}</small><b>{chg(stats.changeToday)}</b></div>
                <div className="id-stat"><small>{C.change7d}</small><b>{chg(stats.change7d)}</b></div>
                <div className="id-stat"><small>{C.change30d}</small><b>{chg(stats.change30d)}</b></div>
                <div className="id-stat"><small>{C.periodHigh}</small><b><bdi>{stats.high == null ? '—' : nf0.format(stats.high)}</bdi></b></div>
                <div className="id-stat"><small>{C.periodLow}</small><b><bdi>{stats.low == null ? '—' : nf0.format(stats.low)}</bdi></b></div>
              </div>
              <p className="id-cap">{C.recordedNote(String(stats.recordedDays))}</p>
            </section>
          ) : null}

          <section className="id-panel eco-panel" aria-label={P.converter}>
            <h2 className="id-h3">{P.converter}</h2>
            <div className="eco-conv id-num">
              <label className="eco-conv-in">
                <span className="id-cap">{P.amount} · {dir === 'usd' ? C.dollars : C.dinars}</span>
                <input className="id-input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} aria-label={P.amount} />
              </label>
              <button type="button" className="id-btn is-sm eco-swap" onClick={() => setDir((d) => (d === 'usd' ? 'iqd' : 'usd'))} aria-label={P.swap}>⇄</button>
              <p className="eco-conv-out">
                <strong><bdi>{out == null ? '—' : dir === 'usd' ? nf0.format(out) : nf2.format(out)}</bdi></strong>
                <span className="eco-unit">{dir === 'usd' ? C.dinars : C.dollars}</span>
              </p>
            </div>
            <div className="eco-conv-rate">
              <span className="id-cap">{P.rateUsed}</span>
              <div className="id-pills" role="group" aria-label={P.rateUsed}>
                <button type="button" className="id-pill is-sm" aria-pressed={use === 'market'} onClick={() => setUse('market')} disabled={market == null}>{C.tabMarket} · <bdi>{market == null ? '—' : nf0.format(market)}</bdi></button>
                <button type="button" className="id-pill is-sm" aria-pressed={use === 'official'} onClick={() => setUse('official')}>{C.tabOfficial} · <bdi>{nf0.format(officialRate)}</bdi></button>
              </div>
            </div>
          </section>

          {faq.length ? (
            <section className="eco-faq" aria-label={P.faqTitle}>
              <h2 className="id-h3">{P.faqTitle}</h2>
              {faq.map((f) => (
                <details key={f.q} className="eco-q">
                  <summary>{f.q}</summary>
                  <p className="id-body">{f.a}</p>
                </details>
              ))}
            </section>
          ) : null}

          <AboutSection title={P.about.title} body={P.about.body} />
        </div>
      </main>
    </SiteShell>
  )
}
