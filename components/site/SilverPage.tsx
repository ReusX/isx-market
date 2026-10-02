'use client'

import { useMemo, useState } from 'react'
import { useLocale } from '@/context/LocaleContext'
import { localeDate, shortDate } from '@/lib/date'
import { SiteShell } from './SiteShell'
import { EconRail } from './EconRail'
import { PageTitle } from './PageTitle'
import { AboutSection } from './AboutSection'
import { MiniArea } from './MiniArea'
import { DayChip } from './DayChip'
import type { SilverData, FxData } from '@/lib/rates'
import { silverFaqFigures } from '@/lib/ratesFaq'
import '@/styles/econ-page.css'

/**
 * /silver · the silver list, on the approved board (identity v3, as /fx and
 * /gold): the ounce in dinars leads with the swoosh, its move and the
 * source's last closes as the chart (in dollars, as published); the
 * calculator is the key card; three story cards: purity, bars, the move.
 * The source publishes dollars only; every dinar figure is a conversion at
 * the parallel rate, and the copy says so.
 */
const MITHQAL_G = 4.608
const OUNCE_G = 31.1035
const nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const nf2 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
type Unit = 'gram' | 'mithqal' | 'ounce' | 'kilo'
const GRAMS: Record<Unit, number> = { gram: 1, mithqal: MITHQAL_G, ounce: OUNCE_G, kilo: 1000 }

export function SilverPage({ silver, fx }: { silver: SilverData | null; fx: FxData | null }) {
  const { t, locale } = useLocale()
  const R = t.rates
  const P = R.page.silver
  const B = P.board
  const market = fx?.sell ?? fx?.buy ?? null
  const iqd = (usd: number | null | undefined) => (usd != null && market ? usd * market : null)
  const g = (p: number) => silver?.grams.find((x) => x.purity === p) ?? null
  const ounceUsd = silver?.ounceUsd ?? null
  const chg = silver?.ounceChange ?? null
  const pct = ounceUsd != null && chg != null && ounceUsd - chg > 0 ? (chg / (ounceUsd - chg)) * 100 : null
  const dir = pct == null || Math.round(pct * 100) === 0 ? 0 : pct > 0 ? 1 : -1
  const prevDate = silver?.history.length ? silver.history[silver.history.length - 1].date : null
  const vsPrev = prevDate ? R.tools.vsPrev(shortDate(prevDate, locale)) : null

  /* The source's last closes, then today. */
  const series = useMemo(() => {
    const pts = (silver?.history ?? []).filter((h) => !silver?.date || h.date < silver.date).map((h) => ({ date: h.date, value: h.usd }))
    if (silver?.date && ounceUsd != null) pts.push({ date: silver.date, value: ounceUsd })
    return pts
  }, [silver, ounceUsd])

  const [w, setW] = useState('100')
  const [unit, setUnit] = useState<Unit>('gram')
  const [purity, setPurity] = useState<number>(999)
  const per = g(purity)?.usd ?? g(999)?.usd ?? 0
  const wNum = parseFloat(w.replace(/,/g, '')) || 0
  const valueUsd = wNum * GRAMS[unit] * per

  return (
    <SiteShell>
      <main className="eco id-full iq-door" data-world="ochre" data-level="accent">
        <EconRail />
        <div className="eco-body">
          <div className="fx-frame">
            <div className="fx-board">
              <div className="fx-lead">
                <header className="eco-head fx-head">
                  <PageTitle title={P.title} note={P.leadNote} className="fx-title" />
                </header>
                <p className="fx-huge id-num">
                  <span className={`fx-huge-num ${dir === 0 ? '' : dir > 0 ? 'is-up' : 'is-down'}`.trim()}>
                    <bdi>{iqd(ounceUsd) == null ? '—' : nf0.format(iqd(ounceUsd) as number)}</bdi>
                    <svg className="fx-swoosh" viewBox="0 0 200 40" preserveAspectRatio="none" aria-hidden="true">
                      <path d="M4 30 C 50 10, 110 4, 196 20" pathLength={1} fill="none" stroke="currentColor" strokeWidth={5} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                    </svg>
                  </span>
                </p>
                <p className="fx-line">
                  {pct != null && vsPrev ? <DayChip pct={pct} label={vsPrev} /> : null}
                  <span>{B.perOunce}{ounceUsd != null ? ` · $${nf2.format(ounceUsd)}` : ''}{vsPrev ? ` · ${vsPrev}` : ''}</span>
                </p>
                {series.length > 1 ? (
                  <>
                    <MiniArea points={series} format={(v) => `$${nf2.format(v)}`} label={P.history} tone={dir === 0 ? 'world' : dir > 0 ? 'up' : 'down'} />
                    <p className="fx-chart-note">{B.chartNote(series.length)}</p>
                  </>
                ) : null}
              </div>

              {silver?.grams.length ? (
                <section className="id-print is-key fx-calc" aria-label={P.calc}>
                  <h2 className="fx-calc-title">{B.calcTitle}</h2>
                  <label className="fx-calc-in" htmlFor="silver-weight">
                    <span>{B.weight}</span>
                    <input id="silver-weight" className="id-num" inputMode="decimal" dir="ltr" value={w} onChange={(e) => setW(e.target.value)} />
                  </label>
                  <div className="fx-quick" role="group" aria-label={R.page.gold.unit}>
                    {(['gram', 'mithqal', 'ounce', 'kilo'] as Unit[]).map((u) => <button key={u} type="button" className="fx-qbtn" aria-pressed={unit === u} onClick={() => setUnit(u)}>{B.unitName[u]}</button>)}
                  </div>
                  <div className="fx-quick" role="group" aria-label={P.colPurity}>
                    {silver.grams.map((x) => <button key={x.purity} type="button" className="fx-qbtn id-num" aria-pressed={purity === x.purity} onClick={() => setPurity(x.purity)}><bdi>{x.purity}</bdi></button>)}
                  </div>
                  <p className="fx-calc-note">{B.rateNote(String(purity), iqd(per) == null ? '—' : nf0.format(iqd(per) as number))}</p>
                  <p className="fx-calc-out id-num"><bdi>{market ? nf0.format(valueUsd * market) : '—'}</bdi> <span>{R.page.fx.calcIqd}</span></p>
                  {valueUsd > 0 ? <p className="fx-calc-prev id-num">{B.usd(nf2.format(valueUsd))}</p> : null}
                </section>
              ) : null}
            </div>
          </div>
          <div className="fx-captions">
            <p className="id-cap eco-when">
              {silver?.date ? R.tools.observedOn(localeDate(silver.date, locale)) : R.tools.noObserved}
              {market ? ` · ${R.gold.atMarketRate} ${nf0.format(market)} ${R.gold.iqd}` : ''}
            </p>
          </div>

          <div className="fx-facts id-num">
            {g(999) && g(925) && market ? (() => {
              const diff = ((g(999) as { usd: number }).usd - (g(925) as { usd: number }).usd) * market
              const head = B.purityHead(nf0.format(diff))
              const top = (g(999) as { usd: number }).usd
              return (
                <section className="id-print is-calm fx-fact" aria-label={P.byPurity}>
                  <svg className="fx-ill" viewBox="0 0 64 64" aria-hidden="true"><path d="M8 50l8-16h32l8 16z" fill="var(--fill)" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/><path d="M18 34l6-14h16l6 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/><path d="M26 14l2-6M36 14l-2-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg>
                  <h3 className="fx-fact-head">{head[0]}<em><bdi>{head[1]}</bdi></em>{head[2]}</h3>
                  <p className="fx-pocket">{B.purityPocket(nf0.format(diff * 100))}</p>
                  <div className="fx-bars is-wide" aria-hidden="true">
                    {silver?.grams.slice(0, 5).map((x) => (
                      <div key={x.purity}><span><bdi>{x.purity}</bdi></span><i style={{ width: `${(x.usd / top) * 100}%` }} className={x.purity === 999 ? 'is-market' : ''} /><b>{nf0.format(x.usd * market)}</b></div>
                    ))}
                  </div>
                  <details className="fx-more"><summary aria-label={R.page.fx.facts.more}>+</summary><p>{B.purityMore}</p></details>
                </section>
              )
            })() : null}

            {silver?.bars.length && market ? (() => {
              const bar = silver.bars.find((b) => b.grams === 1000) ?? silver.bars[silver.bars.length - 1]
              const size = bar.grams >= 1000 ? P.kilo : P.grams(String(bar.grams))
              const head = B.barHead(size, bar.buyUsd == null ? '—' : nf0.format(bar.buyUsd * market))
              const loss = bar.buyUsd != null && bar.sellUsd != null ? (bar.buyUsd - bar.sellUsd) * market : null
              return (
                <section className="id-print is-calm fx-fact" aria-label={B.bars}>
                  <svg className="fx-ill" viewBox="0 0 64 64" aria-hidden="true"><path d="M6 46l10-14h32l10 14z" fill="var(--fill)" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/><path d="M16 32l6-10h20l6 10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/><path d="M6 46h52v6H6z" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/></svg>
                  <h3 className="fx-fact-head">{head[0]}<em><bdi>{head[1]}</bdi></em>{head[2]}</h3>
                  {loss != null && loss > 0 ? <p className="fx-pocket">{B.barPocket(nf0.format(loss))}</p> : null}
                  <ul className="fx-sizes">
                    {silver.bars.map((b) => (
                      <li key={b.grams}>
                        <span>{b.grams >= 1000 ? P.kilo : P.grams(String(b.grams))}</span>
                        <b><bdi>{b.buyUsd == null ? '—' : nf0.format(b.buyUsd * market)}</bdi></b>
                        <small><bdi>{b.sellUsd == null ? '—' : nf0.format(b.sellUsd * market)}</bdi></small>
                      </li>
                    ))}
                  </ul>
                  <p className="fx-fact-note">{B.buy} · {B.resale} · {R.gold.iqd}</p>
                  <details className="fx-more"><summary aria-label={R.page.fx.facts.more}>+</summary><p>{B.barMore}</p></details>
                </section>
              )
            })() : null}

            {series.length > 1 ? (() => {
              const vals = series.map((p) => p.value), lo = Math.min(...vals), hi = Math.max(...vals)
              const now = vals[vals.length - 1], pos = hi > lo ? ((now - lo) / (hi - lo)) * 100 : 50
              const d = Math.round((now - vals[0]) * 100) / 100
              const head = d === 0 ? B.histFlat : d > 0 ? B.histUp(`$${nf2.format(d)}`) : B.histDown(`$${nf2.format(-d)}`)
              return (
                <section className="id-print is-calm fx-fact" aria-label={B.history}>
                  <svg className="fx-ill" viewBox="0 0 64 64" aria-hidden="true"><rect x="10" y="14" width="44" height="40" rx="4" fill="var(--fill)" stroke="currentColor" strokeWidth="2.5"/><path d="M10 26h44M22 8v10M42 8v10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/><path d="M20 44l8-8 6 5 10-10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <h3 className={`fx-fact-head ${d > 0 ? 'is-up' : d < 0 ? 'is-down' : ''}`.trim()}>{head[0]}<em><bdi>{head[1]}</bdi></em>{head[2]}</h3>
                  <p className="fx-pocket">{B.histPocket(series.length)}</p>
                  <div className="fx-range">
                    <div className="fx-range-track" aria-hidden="true"><i style={{ insetInlineStart: `${pos}%` }} /></div>
                    <div className="fx-range-ends"><span><small>{R.fx.periodLow}</small> <bdi>${nf2.format(lo)}</bdi></span><span><small>{R.fx.periodHigh}</small> <bdi>${nf2.format(hi)}</bdi></span></div>
                  </div>
                  <details className="fx-more"><summary aria-label={R.page.fx.facts.more}>+</summary><p>{B.histMore}</p></details>
                </section>
              )
            })() : null}
          </div>

          <section className="eco-faq id-panel" aria-label={P.faqTitle}>
            <h2 className="id-h3">{P.faqTitle}</h2>
            {P.faq(silverFaqFigures(silver, fx, locale)).map((f) => <details key={f.q} className="eco-q"><summary>{f.q}</summary><p className="id-body">{f.a}</p></details>)}
          </section>

          <AboutSection title={P.about.title} body={P.about.body} />
        </div>
      </main>
    </SiteShell>
  )
}
