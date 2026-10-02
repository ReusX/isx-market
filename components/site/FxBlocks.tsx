'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useLocale } from '@/context/LocaleContext'
import { localeDate, shortDate } from '@/lib/date'
import { PageTitle } from './PageTitle'
import type { FxData } from '@/lib/rates'
import type { FxDay } from '@/lib/fxHistory'
import { fxDayMove, statsFrom } from '@/lib/fxHistory'
import { DayChip } from './DayChip'
import { MiniArea } from './MiniArea'
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
/* The bid/ask pair is quoted in half-dinars (1,558.5 / 1,559); rounding both
   to whole dinars made them read as the same number. */
const nfQ = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })

/* The quote's own time in Baghdad — the Kifah channel posts through the day, so
   the time is what tells a reader how fresh the figure is. Latin digits, as
   everywhere on the site; «ص/م» in Arabic. */
function baghdadTime(iso: string, locale: string) {
  const t = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Baghdad', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(iso))
  return locale === 'ar' ? t.replace('AM', 'ص').replace('PM', 'م') : t
}

/**
 * The approved dollar block, shared by /fx and /fx/100-dollar: the framed
 * board (rate with /learn's swoosh, the move chip, the interactive month
 * chart, the converter card), its captions, and the three story cards.
 * `mult` scales the headline figure and the chart (1 per dollar, 100 per
 * «ورقة»); everything else stays per dollar.
 */
export function FxBlocks({ fx, parallel, officialRate, officialDate, title, titleNote, unitLabel, mult = 1 }: {
  fx: FxData | null
  parallel: FxDay[]
  officialRate: number
  officialDate: string
  title: string
  titleNote: string
  unitLabel: string
  mult?: number
}) {
  const { t, locale } = useLocale()
  const R = t.rates
  const P = R.page.fx
  const C = R.fx
  const F = P.facts
  const market = fx?.sell ?? fx?.buy ?? null
  const gap = market != null ? { abs: market - officialRate, pct: ((market - officialRate) / officialRate) * 100 } : null

  const stats = useMemo(() => statsFrom(parallel), [parallel])
  const move = useMemo(() => fxDayMove(fx, parallel), [fx, parallel])
  const vsPrev = move ? R.tools.vsPrev(localeDate(move.prevDate, locale)) : null

  /* Converter: one amount, two directions, the rate you choose. */
  const [amount, setAmount] = useState(mult === 100 ? '100' : '1000')
  const num = parseFloat(amount.replace(/,/g, '')) || 0
  /* Dollars → dinars at the Kifah selling rate, as on the board. */
  const out = market ? num * market : null
  /* The board's small chart: the last month of recorded Baghdad closes. */
  const month = useMemo(() => {
    const pts = parallel.filter((d) => d.close != null).map((d) => ({ date: d.date, value: d.close as number }))
    if (!pts.length) return pts
    const since = new Date(new Date(pts[pts.length - 1].date).getTime() - 31 * 86400_000).toISOString().slice(0, 10)
    return pts.filter((p) => p.date >= since)
  }, [parallel])

  const chg = (v: number | null) => v == null ? <span className="id-cap">{C.notEnough}</span>
    : <bdi className={v > 0 ? 'id-up' : v < 0 ? 'id-down' : ''}>{v > 0 ? '+' : ''}{nfQ.format(v)}</bdi>

  return (
    <>
    {/* Identity v3, the approved board: the figure and its chart on one
        side, the converter as the page's one key card on the other;
        then every supporting figure as a calm card. */}
    {/* The approved board (page 2, «صفحة الدولار»): one framed block, the
        rate, its move and its month as one column, the converter as the
        key card beside it, centred against that column. */}
    {/* The frame is neutral; the figure, its chip and the chart carry the
        day's colour. */}
    <div className="fx-frame">
    <div className="fx-board">
      <div className="fx-lead">
        {/* The page's one <h1>, set as the board's small line above the rate:
            a heading's weight in search is its tag, not its size. */}
        <header className="eco-head fx-head">
          <PageTitle title={title} note={titleNote} className="fx-title" />
        </header>
        <p className="fx-huge id-num">
          <span className={`fx-huge-num ${!move || Math.round(move.pct * 100) === 0 ? '' : move.pct > 0 ? 'is-up' : 'is-down'}`.trim()}>
            <bdi>{market == null ? '—' : nf0.format(market * mult)}</bdi>
            {/* /learn's hand-drawn swoosh (components/learn/Ink, «swoosh»),
                drawn once on load, in the page's ink. */}
            <svg className="fx-swoosh" viewBox="0 0 200 40" preserveAspectRatio="none" aria-hidden="true">
              <path d="M4 30 C 50 10, 110 4, 196 20" pathLength={1} fill="none" stroke="currentColor" strokeWidth={5} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            </svg>
          </span>
        </p>
        <p className="fx-line">
          {move && vsPrev ? <DayChip pct={move.pct} label={vsPrev} /> : null}
          <span>{unitLabel}{move ? ` · ${R.tools.vsPrev(shortDate(move.prevDate, locale))}` : ''}</span>
        </p>
        {month.length > 1 ? <MiniArea points={mult === 1 ? month : month.map((p) => ({ ...p, value: p.value * mult }))} format={(v) => nf0.format(v)} label={C.chartLabel} tone={!move || Math.round(move.pct * 100) === 0 ? 'world' : move.pct > 0 ? 'up' : 'down'} /> : null}
      </div>

      <section className="id-print is-key fx-calc" aria-label={P.converter}>
        <h2 className="fx-calc-title">{P.calcTitle}</h2>
        <label className="fx-calc-in" htmlFor="fx-amount">
          <span>{P.amountUsd}</span>
          <input id="fx-amount" className="id-num" inputMode="decimal" dir="ltr" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <div className="fx-quick" role="group" aria-label={P.quick}>
          {[100, 1000, 5000].map((v) => (
            <button key={v} type="button" className="fx-qbtn id-num" aria-pressed={num === v} onClick={() => setAmount(String(v))}>{nf0.format(v)}</button>
          ))}
        </div>
        {market != null ? <p className="fx-calc-note">{P.calcRateNote(nfQ.format(market))}</p> : null}
        <p className="fx-calc-out id-num"><bdi>{out == null ? '—' : nf0.format(out)}</bdi> <span>{P.calcIqd}</span></p>
        {move && num > 0 && Math.round(num * move.abs) !== 0 ? (
          <p className="fx-calc-prev">{P.calcVsPrev(nf0.format(Math.abs(num * move.abs)), move.abs < 0)}</p>
        ) : null}
      </section>
    </div>
    </div>
    <div className="fx-captions">
      {/* «سعر الورق» — the $100 note is how the street quotes the rate. */}
      {market != null && mult === 1 ? <p className="eco-hundred id-num">{P.hundred(nf0.format(market * 100))}{locale === 'ar' ? <> · <Link href="/fx/100-dollar">{R.page.hundred.h1}</Link></> : null}</p> : null}
      <p className="id-cap eco-when">
        {fx?.stale ? `${C.staleNotice} · ` : ''}{fx?.date ? (fx.publishedAt && fx.sourceKey === 'kifah-tg'
          ? R.tools.updatedAt(baghdadTime(fx.publishedAt, locale), localeDate(fx.date, locale))
          : R.tools.observedOn(localeDate(fx.date, locale))) : R.tools.noObserved}
      </p>
    </div>

    {/* Three story cards (Thndr's principle, our voice): a headline you
        react to with its number marked, what it means in your pocket,
        the figures behind it with a small picture, and «+» for the why.
        The why is in the DOM (collapsed), so search reads it too. */}
    <div className="fx-facts id-num">
      {fx?.buy != null && fx?.sell != null ? (() => {
        const spread = Math.round((fx.sell - fx.buy) * 100) / 100
        const head = F.spreadHead(F.dinars(spread, nfQ.format(spread)))
        return (
          <section className="id-print is-calm fx-fact" aria-label={C.buy}>
            <svg className="fx-ill" viewBox="0 0 64 64" aria-hidden="true"><rect x="8" y="18" width="40" height="24" rx="3" fill="none" stroke="currentColor" strokeWidth="2.5"/><rect x="16" y="26" width="40" height="24" rx="3" fill="var(--fill)" stroke="currentColor" strokeWidth="2.5"/><circle cx="36" cy="38" r="5" fill="none" stroke="currentColor" strokeWidth="2"/></svg>
            <h3 className="fx-fact-head">{head[0]}<em>{head[1]}</em>{head[2]}</h3>
            <p className="fx-pocket">{F.spreadPocket(nf0.format(spread * 100))}</p>
            <div className="fx-pair">
              <div><small>{C.buy}</small><b><bdi>{nfQ.format(fx.buy)}</bdi></b></div>
              <div><small>{C.sell}</small><b><bdi>{nfQ.format(fx.sell)}</bdi></b></div>
            </div>
            <div className="fx-spread" aria-hidden="true"><i className="is-buy" /><span /><i className="is-sell" /></div>
            <details className="fx-more"><summary aria-label={F.more}>+</summary><p>{F.spreadMore}</p></details>
          </section>
        )
      })() : null}

      {market != null && gap ? (() => {
        const head = F.gapHead(`${gap.pct.toFixed(0)}%`)
        return (
          <section className="id-print is-calm fx-fact" aria-label={P.gap}>
            <svg className="fx-ill" viewBox="0 0 64 64" aria-hidden="true"><path d="M32 10v40M18 54h28" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/><path d="M10 20l44-6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/><path d="M4 34l6-14 6 14z M48 28l6-14 6 14z" fill="var(--fill)" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round"/></svg>
            <h3 className="fx-fact-head">{head[0]}<em>{head[1]}</em>{head[2]}</h3>
            <p className="fx-pocket">{F.gapPocket(nf0.format(market * 100), nf0.format(officialRate * 100))}</p>
            <div className="fx-bars" aria-hidden="true">
              <div><span>{C.tabMarket}</span><i style={{ width: '100%' }} className="is-market" /><b>{nf0.format(market)}</b></div>
              <div><span>{C.tabOfficial}</span><i style={{ width: `${(officialRate / market) * 100}%` }} /><b>{nf0.format(officialRate)}</b></div>
            </div>
            <p className="fx-fact-note">{P.officialNote(localeDate(officialDate, locale))}</p>
            <details className="fx-more"><summary aria-label={F.more}>+</summary><p>{F.gapMore}</p></details>
          </section>
        )
      })() : null}

      {month.length > 1 ? (() => {
        const vals = month.map((p) => p.value), lo = Math.min(...vals), hi = Math.max(...vals)
        const now = vals[vals.length - 1], pos = hi > lo ? ((now - lo) / (hi - lo)) * 100 : 50
        const w = stats.change7d, wr = w == null ? 0 : Math.round(w * 100) / 100
        const head = w == null || wr === 0 ? F.weekFlat : wr > 0 ? F.weekUp(F.dinars(Math.abs(wr), nfQ.format(Math.abs(wr)))) : F.weekDown(F.dinars(Math.abs(wr), nfQ.format(Math.abs(wr))))
        return (
          <section className="id-print is-calm fx-fact" aria-label={C.change7d}>
            <svg className="fx-ill" viewBox="0 0 64 64" aria-hidden="true"><rect x="10" y="14" width="44" height="40" rx="4" fill="var(--fill)" stroke="currentColor" strokeWidth="2.5"/><path d="M10 26h44M22 8v10M42 8v10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/><path d="M20 44l8-8 6 5 10-10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <h3 className={`fx-fact-head ${wr > 0 ? 'is-up' : wr < 0 ? 'is-down' : ''}`.trim()}>{head[0]}<em>{head[1]}</em>{head[2]}</h3>
            {wr !== 0 ? <p className="fx-pocket">{F.weekPocket(nf0.format(Math.abs(wr) * 1000), wr > 0)}</p> : null}
            <div className="fx-pair">
              <div><small>{C.change7d}</small><b>{chg(stats.change7d)}</b></div>
              <div><small>{C.change30d}</small><b>{chg(stats.change30d)}</b></div>
            </div>
            <div className="fx-range">
              <div className="fx-range-track" aria-hidden="true"><i style={{ insetInlineStart: `${pos}%` }} /></div>
              <div className="fx-range-ends"><span><small>{C.periodLow}</small> <bdi>{nf0.format(lo)}</bdi></span><span><small>{C.periodHigh}</small> <bdi>{nf0.format(hi)}</bdi></span></div>
            </div>
            <details className="fx-more"><summary aria-label={F.more}>+</summary><p>{F.weekMore}</p></details>
          </section>
        )
      })() : null}
    </div>
    </>
  )
}
