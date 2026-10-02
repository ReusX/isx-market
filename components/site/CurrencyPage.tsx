'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useLocale } from '@/context/LocaleContext'
import { localeDate, shortDate } from '@/lib/date'
import { SiteShell } from './SiteShell'
import { EconRail } from './EconRail'
import { PageTitle } from './PageTitle'
import { AboutSection } from './AboutSection'
import { MiniArea } from './MiniArea'
import { CURRENCY_FLAGS, type CurrenciesData, type CurrencyCode } from '@/lib/currencies'
import type { FxData } from '@/lib/rates'
import { faqVars, fmtIqd, fmtX, nf0, nf2, currencyFigures } from '@/lib/currencyFigures'
import type { CurrencyMoves } from '@/lib/currencyMoves'
import { DayChip } from './DayChip'
import '@/styles/econ-page.css'

/**
 * /currencies/{code} · one currency, in dinars, the way it is asked for.
 *
 * Identity v3, the approved dollar board (FxBlocks) in this currency: the
 * framed block (the dinar figure with the swoosh, its move, the month chart,
 * the converter card) and three story cards: a ready amount at market and
 * official, the dollar cross, the month. The old amounts tables, chart panel
 * and converter are gone; the FAQ keeps the common amounts as text.
 */
export type CurrencyPageProps = {
  code: CurrencyCode
  peg: number | null
  toman: boolean
  cur: CurrenciesData | null
  fx: FxData | null
  history: { date: string; value: number }[]
  others: { code: CurrencyCode; slug: string }[]
  moves?: CurrencyMoves | null
}

export function CurrencyPage({ code, peg, toman, cur, fx, history, others, moves }: CurrencyPageProps) {
  const { t, locale } = useLocale()
  const R = t.rates
  const P = R.page.currency
  const B = P.board
  const meta = P.meta[code]
  const name = meta?.page ?? R.page.currencies.names[code] ?? code
  const short = meta?.short ?? name
  const f = currencyFigures(code, cur, fx)
  /* The rial is shown per 100,000 toman (= 1,000,000 rial), the street's unit. */
  const unit = toman ? 1_000_000 : 1
  const lotRial = toman ? 1_000_000 : 100
  const lot = toman ? B.tomanLot : B.count('100', short)
  const one = toman ? B.tomanLot : B.count('1', short)
  const iqdUnit = f.iqd != null ? f.iqd * unit : null
  const pct = moves?.pct[code]
  const vsPrev = pct != null && moves ? R.tools.vsPrev(shortDate(moves.prevDate, locale)) : null
  const dir = pct == null || Math.round(pct * 100) === 0 ? 0 : pct > 0 ? 1 : -1

  /* The board's chart: the last month, per display unit. */
  const month = useMemo(() => {
    if (!history.length) return []
    const since = new Date(new Date(history[history.length - 1].date).getTime() - 31 * 86400_000).toISOString().slice(0, 10)
    return history.filter((p) => p.date >= since).map((p) => ({ date: p.date, value: p.value * unit }))
  }, [history, unit])

  /* Converter: either direction; the rial converts tomans. */
  const [toIqd, setToIqd] = useState(true)
  const [amount, setAmount] = useState(toman ? '100000' : '100')
  const num = parseFloat(amount.replace(/,/g, '')) || 0
  const rate = f.iqd ? (toman ? f.iqd * 10 : f.iqd) : null
  const out = rate ? (toIqd ? num * rate : num / rate) : null
  const quick = toIqd ? (toman ? [100000, 1000000, 10000000] : [100, 1000, 5000]) : [100000, 1000000, 5000000]
  const flip = () => { setToIqd(!toIqd); setAmount(!toIqd ? (toman ? '100000' : '100') : '1000000') }

  return (
    <SiteShell>
      <main className="eco id-full iq-door" data-world="dinar" data-level="accent">
        <EconRail />
        <div className="eco-body">
          <div className="fx-frame">
            <div className="fx-board">
              <div className="fx-lead">
                <header className="eco-head fx-head">
                  <PageTitle title={`${CURRENCY_FLAGS[code]} ${P.title(name)}`} note={P.leadNote(name)} className="fx-title" />
                </header>
                <p className="fx-huge id-num">
                  <span className={`fx-huge-num ${dir === 0 ? '' : dir > 0 ? 'is-up' : 'is-down'}`.trim()}>
                    <bdi>{iqdUnit == null ? '—' : fmtIqd(iqdUnit)}</bdi>
                    <svg className="fx-swoosh" viewBox="0 0 200 40" preserveAspectRatio="none" aria-hidden="true">
                      <path d="M4 30 C 50 10, 110 4, 196 20" pathLength={1} fill="none" stroke="currentColor" strokeWidth={5} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                    </svg>
                  </span>
                </p>
                <p className="fx-line">
                  {vsPrev ? <DayChip pct={pct} label={vsPrev} /> : null}
                  <span>{meta?.unit ?? R.gold.iqd}{vsPrev ? ` · ${vsPrev}` : ''}</span>
                </p>
                {month.length > 1 ? (
                  <>
                    <MiniArea points={month} now={iqdUnit != null && fx?.date ? { date: fx.date, value: iqdUnit } : null} format={(v) => fmtIqd(v)} label={P.chart(name)} tone={dir === 0 ? 'world' : dir > 0 ? 'up' : 'down'} />
                    <p className="fx-chart-note">{B.chartNote}</p>
                  </>
                ) : <p className="fx-chart-note">{B.noChart}</p>}
              </div>

              {rate ? (
                <section className="id-print is-key fx-calc" aria-label={P.calc}>
                  <h2 className="fx-calc-title">{B.calcTitle(short)}</h2>
                  <div className="fx-quick" role="group" aria-label={P.calc}>
                    <button type="button" className="fx-qbtn" aria-pressed={toIqd} onClick={() => !toIqd && flip()}>{B.toIqd(toman ? B.tomanLot.split(' ').pop() as string : short)}</button>
                    <button type="button" className="fx-qbtn" aria-pressed={!toIqd} onClick={() => toIqd && flip()}>{B.fromIqd(toman ? B.tomanLot.split(' ').pop() as string : short)}</button>
                  </div>
                  <label className="fx-calc-in" htmlFor="cur-amount">
                    <span>{toIqd ? B.amountIn(toman ? B.tomanLot.split(' ').pop() as string : short) : B.amountIqd}</span>
                    <input id="cur-amount" className="id-num" inputMode="decimal" dir="ltr" value={amount} onChange={(e) => setAmount(e.target.value)} />
                  </label>
                  <div className="fx-quick" role="group" aria-label={R.page.fx.quick}>
                    {quick.map((v) => <button key={v} type="button" className="fx-qbtn id-num" aria-pressed={num === v} onClick={() => setAmount(String(v))}>{nf0.format(v)}</button>)}
                  </div>
                  <p className="fx-calc-note">{B.rateNote(one, fmtIqd(iqdUnit))}</p>
                  <p className="fx-calc-out id-num">
                    <bdi>{out == null ? '—' : out >= 100 ? nf0.format(out) : nf2.format(out)}</bdi>{' '}
                    <span>{toIqd ? B.outIqd : (toman ? B.tomanLot.split(' ').pop() : short)}</span>
                  </p>
                </section>
              ) : null}
            </div>
          </div>
          <div className="fx-captions">
            <p className="id-cap eco-when">
              {f.date ? R.tools.observedOn(localeDate(f.date, locale)) : R.tools.noObserved}
              {f.market ? ` · ${R.gold.atMarketRate} ${nf0.format(f.market)} ${R.gold.iqd}` : ''}
            </p>
          </div>

          <div className="fx-facts id-num">
            {f.iqd != null && f.iqdOfficial != null ? (() => {
              const m = f.iqd * lotRial, o = f.iqdOfficial * lotRial
              const head = B.lotHead(lot, fmtIqd(m))
              return (
                <section className="id-print is-calm fx-fact" aria-label={lot}>
                  <svg className="fx-ill" viewBox="0 0 64 64" aria-hidden="true"><rect x="8" y="18" width="40" height="24" rx="3" fill="none" stroke="currentColor" strokeWidth="2.5"/><rect x="16" y="26" width="40" height="24" rx="3" fill="var(--fill)" stroke="currentColor" strokeWidth="2.5"/><circle cx="36" cy="38" r="5" fill="none" stroke="currentColor" strokeWidth="2"/></svg>
                  <h3 className="fx-fact-head">{head[0]}<em><bdi>{head[1]}</bdi></em>{head[2]}</h3>
                  <p className="fx-pocket">{B.lotPocket(fmtIqd(o))}</p>
                  <div className="fx-bars is-wide" aria-hidden="true">
                    <div><span>{B.market}</span><i style={{ width: '100%' }} className="is-market" /><b>{fmtIqd(m)}</b></div>
                    <div><span>{B.official}</span><i style={{ width: `${(o / m) * 100}%` }} /><b>{fmtIqd(o)}</b></div>
                  </div>
                  <details className="fx-more"><summary aria-label={R.page.fx.facts.more}>+</summary><p>{B.lotMore}</p></details>
                </section>
              )
            })() : null}

            {f.perUsd ? (() => {
              const n = toman ? f.perUsd / 10 : f.perUsd
              const head = B.crossHead(fmtX(n), toman ? B.tomanLot.split(' ').pop() as string : short)
              return (
                <section className="id-print is-calm fx-fact" aria-label={P.perUsd(fmtX(n), short)}>
                  <svg className="fx-ill" viewBox="0 0 64 64" aria-hidden="true"><path d="M32 10v40M18 54h28" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/><path d="M10 20l44-6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/><path d="M4 34l6-14 6 14z M48 28l6-14 6 14z" fill="var(--fill)" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round"/></svg>
                  <h3 className="fx-fact-head">{head[0]}<em><bdi>{head[1]}</bdi></em>{head[2]}</h3>
                  <p className="fx-pocket">{peg ? P.pegNote(name, fmtX(peg)) : B.crossPocket(toman ? fmtX(100000 / n) : nf2.format(1 / n), toman ? B.tomanLot : B.count('1', short))}</p>
                  {toman && f.iqd != null ? <p className="fx-fact-note">{P.tomanNote(fmtIqd(f.iqd * 1_000_000))}</p> : null}
                  <details className="fx-more"><summary aria-label={R.page.fx.facts.more}>+</summary><p>{B.crossMore}</p></details>
                </section>
              )
            })() : null}

            {month.length > 1 ? (() => {
              const vals = month.map((p) => p.value), lo = Math.min(...vals), hi = Math.max(...vals)
              const now = vals[vals.length - 1], pos = hi > lo ? ((now - lo) / (hi - lo)) * 100 : 50
              const d = now - vals[0], dr = Math.round(d * 100) / 100
              const dLot = Math.abs(d) * (toman ? 1 : lotRial)
              const head = dr === 0 ? B.monthFlat(short) : dr > 0 ? B.monthUp(short, fmtIqd(Math.abs(d))) : B.monthDown(short, fmtIqd(Math.abs(d)))
              return (
                <section className="id-print is-calm fx-fact" aria-label={B.month}>
                  <svg className="fx-ill" viewBox="0 0 64 64" aria-hidden="true"><rect x="10" y="14" width="44" height="40" rx="4" fill="var(--fill)" stroke="currentColor" strokeWidth="2.5"/><path d="M10 26h44M22 8v10M42 8v10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/><path d="M20 44l8-8 6 5 10-10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <h3 className={`fx-fact-head ${dr > 0 ? 'is-up' : dr < 0 ? 'is-down' : ''}`.trim()}>{head[0]}<em><bdi>{head[1]}</bdi></em>{head[2]}</h3>
                  {dr !== 0 ? <p className="fx-pocket">{B.monthPocket(lot, fmtIqd(dLot), dr > 0)}</p> : null}
                  <div className="fx-range">
                    <div className="fx-range-track" aria-hidden="true"><i style={{ insetInlineStart: `${pos}%` }} /></div>
                    <div className="fx-range-ends"><span><small>{R.fx.periodLow}</small> <bdi>{fmtIqd(lo)}</bdi></span><span><small>{R.fx.periodHigh}</small> <bdi>{fmtIqd(hi)}</bdi></span></div>
                  </div>
                  <details className="fx-more"><summary aria-label={R.page.fx.facts.more}>+</summary><p>{B.monthMore}</p></details>
                </section>
              )
            })() : null}
          </div>

          <section className="eco-faq id-panel" aria-label={P.faqTitle(name)}>
            <h2 className="id-h3">{P.faqTitle(name)}</h2>
            {P.faq(faqVars(code, name, short, cur, fx, toman, !!peg, locale)).map((q) => <details key={q.q} className="eco-q"><summary>{q.q}</summary><p className="id-body">{q.a}</p></details>)}
          </section>

          <AboutSection title={P.aboutTitle(name)} body={[meta?.why ?? '', ...R.page.currencies.about.body]} />

          <nav className="eco-others" aria-label={P.others}>
            <p className="id-cap">{P.others}</p>
            <div className="id-pills">
              {others.map((o) => <Link key={o.code} href={`/currencies/${o.slug}`} className="id-pill">{CURRENCY_FLAGS[o.code]} {R.page.currencies.names[o.code] ?? o.code}</Link>)}
              <Link href="/currencies" className="id-pill">{P.allCurrencies}</Link>
            </div>
          </nav>
        </div>
      </main>
    </SiteShell>
  )
}
