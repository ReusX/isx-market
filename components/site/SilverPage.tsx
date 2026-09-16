'use client'

import { useState } from 'react'
import { useLocale } from '@/context/LocaleContext'
import { localeDate } from '@/lib/date'
import { SiteShell } from './SiteShell'
import { EconRail } from './EconRail'
import { PageTitle } from './PageTitle'
import { AboutSection } from './AboutSection'
import { SeriesChart } from './SeriesChart'
import type { SilverData, FxData } from '@/lib/rates'
import { silverFaqFigures } from '@/lib/ratesFaq'
import '@/styles/econ-page.css'

/**
 * /silver · the silver list.
 *
 * The ounce in dollars leads — that is the figure the source publishes and
 * the one the market quotes — with its dinar equivalent at the parallel
 * rate stated as a conversion, never as a local list price. Then the gram
 * by purity as one table, the bars as published (buy new / resale), the
 * last ten ounce closes, and a weight calculator.
 */
const MITHQAL_G = 4.608
const OUNCE_G = 31.1035
const nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const nf2 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function SilverPage({ silver, fx }: { silver: SilverData | null; fx: FxData | null }) {
  const { t, locale } = useLocale()
  const R = t.rates
  const P = R.page.silver
  const G = R.gold
  const market = fx?.sell ?? fx?.buy ?? null
  const iqd = (usd: number | null | undefined) => (usd != null && market ? nf0.format(usd * market) : '—')
  const g999 = silver?.grams.find((g) => g.purity === 999) ?? silver?.grams[0]
  const g925 = silver?.grams.find((g) => g.purity === 925)

  const [w, setW] = useState('100')
  const [unit, setUnit] = useState<'gram' | 'mithqal' | 'ounce'>('gram')
  const [purity, setPurity] = useState<number>(999)
  const per = silver?.grams.find((g) => g.purity === purity)?.usd ?? g999?.usd ?? 0
  const gramsIn = unit === 'gram' ? 1 : unit === 'mithqal' ? MITHQAL_G : OUNCE_G
  const valueUsd = (parseFloat(w) || 0) * gramsIn * per
  const unitLabel = { gram: G.unitGram, mithqal: G.unitMithqal, ounce: G.unitOunce }

  return (
    <SiteShell>
      <main className="eco id-full iq-door">
        <EconRail />
        <div className="eco-body">
          <header className="eco-head">
            <p className="id-eyebrow">{R.page.eyebrow}</p>
            <PageTitle title={P.title} note={P.leadNote} />
            {!silver ? <p className="id-note">{R.tools.unavailable}</p> : (
              <>
                <p className="eco-lead id-num">
                  <strong><bdi>${silver.ounceUsd == null ? '—' : nf2.format(silver.ounceUsd)}</bdi></strong>
                  <span className="eco-unit">{P.perOunce} · {P.ounce}</span>
                  {silver.ounceChange != null ? <span className={`id-chg ${silver.ounceChange > 0 ? 'is-up' : silver.ounceChange < 0 ? 'is-down' : 'is-flat'}`}><bdi>{silver.ounceChange > 0 ? '+' : ''}{nf2.format(silver.ounceChange)}</bdi></span> : null}
                </p>
                <p className="id-cap eco-when">{silver.date ? R.tools.observedOn(localeDate(silver.date, locale)) : R.tools.noObserved}</p>
                <div className="id-stats id-num eco-stats">
                  <div className="id-stat"><small>{P.ounceIqd}</small><b><bdi>{iqd(silver.ounceUsd)}</bdi></b><span className="id-cap">{G.atMarketRate}</span></div>
                  <div className="id-stat"><small>{P.gram999}</small><b><bdi>{iqd(g999?.usd)}</bdi></b><span className="id-cap">${g999 ? nf2.format(g999.usd) : '—'}</span></div>
                  <div className="id-stat"><small>{P.gram925}</small><b><bdi>{iqd(g925?.usd)}</bdi></b><span className="id-cap">${g925 ? nf2.format(g925.usd) : '—'}</span></div>
                  <div className="id-stat"><small>{G.mithqal} · 999</small><b><bdi>{g999 ? iqd(g999.usd * MITHQAL_G) : '—'}</bdi></b><span className="id-cap">{G.iqd}</span></div>
                </div>
              </>
            )}
          </header>

          {silver?.grams.length ? (
            <section className="id-panel eco-panel" aria-label={P.byPurity}>
              <PageTitle as="h2" className="id-h3" title={P.byPurity} note={P.byPurityNote} />
              <div className="id-table-scroll">
                <table className="id-table eco-table id-num">
                  <thead><tr><th scope="col">{P.colPurity}</th><th scope="col" className="is-end">{P.colGramUsd}</th><th scope="col" className="is-end">{P.colGramIqd}</th><th scope="col" className="is-end">{P.colMithqal}</th></tr></thead>
                  <tbody>
                    {silver.grams.map((g) => (
                      <tr key={g.purity} className={g.purity === 999 ? 'is-lead' : ''}>
                        <td><span className="id-name"><bdi>{g.purity}</bdi></span></td>
                        <td className="is-end"><bdi>${nf2.format(g.usd)}</bdi></td>
                        <td className="is-end"><bdi>{iqd(g.usd)}</bdi></td>
                        <td className="is-end"><bdi>{iqd(g.usd * MITHQAL_G)}</bdi></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          {silver?.bars.length ? (
            <section className="id-panel eco-panel" aria-label={P.bars}>
              <PageTitle as="h2" className="id-h3" title={P.bars} note={P.barsNote} />
              <div className="id-table-scroll">
                <table className="id-table eco-table id-num">
                  <thead><tr><th scope="col">{P.colSize}</th><th scope="col" className="is-end">{P.colBuy} · $</th><th scope="col" className="is-end">{P.colBuy} · {G.iqd}</th><th scope="col" className="is-end">{P.colResale} · $</th><th scope="col" className="is-end">{P.colResale} · {G.iqd}</th></tr></thead>
                  <tbody>
                    {silver.bars.map((b) => (
                      <tr key={b.grams}>
                        <td><span className="id-name">{b.grams >= 1000 ? P.kilo : P.grams(String(b.grams))}</span></td>
                        <td className="is-end"><bdi>{b.buyUsd == null ? '—' : `$${nf2.format(b.buyUsd)}`}</bdi></td>
                        <td className="is-end"><bdi>{iqd(b.buyUsd)}</bdi></td>
                        <td className="is-end"><bdi>{b.sellUsd == null ? '—' : `$${nf2.format(b.sellUsd)}`}</bdi></td>
                        <td className="is-end"><bdi>{iqd(b.sellUsd)}</bdi></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          {silver && silver.history.length > 1 ? (
            <section className="id-panel eco-panel" aria-label={P.history}>
              <PageTitle as="h2" className="id-h3" title={P.history} note={P.historyNote} />
              <SeriesChart
                series={[{ key: 'ounce', label: P.ounce, points: [...silver.history, ...(silver.ounceUsd != null && silver.date ? [{ date: silver.date, value: silver.ounceUsd }] : [])].map((h) => ('usd' in h ? { date: h.date, value: h.usd } : h)) }]}
                ranges={[{ id: 'all', label: R.fx.period.MAX, days: null }]} defaultRange="all"
                format={(v) => `$${nf2.format(v)}`} label={P.history} height={220} />
            </section>
          ) : null}

          {silver?.grams.length ? (
            <section className="id-panel eco-panel" aria-label={P.calc}>
              <PageTitle as="h2" className="id-h3" title={P.calc} note={R.page.gold.calcNote} />
              <div className="eco-calc id-num">
                <label><span className="id-cap">{R.page.gold.weight}</span><input className="id-input" inputMode="decimal" value={w} onChange={(e) => setW(e.target.value)} aria-label={R.page.gold.weight} /></label>
                <div><span className="id-cap">{R.page.gold.unit}</span>
                  <div className="id-pills" role="group">{(['gram', 'mithqal', 'ounce'] as const).map((u) => <button key={u} type="button" className="id-pill is-sm" aria-pressed={unit === u} onClick={() => setUnit(u)}>{unitLabel[u]}</button>)}</div>
                </div>
                <div><span className="id-cap">{P.colPurity}</span>
                  <div className="id-pills" role="group">{silver.grams.map((g) => <button key={g.purity} type="button" className="id-pill is-sm" aria-pressed={purity === g.purity} onClick={() => setPurity(g.purity)}><bdi>{g.purity}</bdi></button>)}</div>
                </div>
                <p className="eco-conv-out"><span className="id-cap">{R.page.gold.value}</span><strong><bdi>${nf2.format(valueUsd)}</bdi></strong><span className="eco-unit">{market ? `≈ ${nf0.format(valueUsd * market)} ${G.iqd} ${G.atMarketRate}` : ''}</span></p>
              </div>
            </section>
          ) : null}

          <section className="eco-faq" aria-label={P.faqTitle}>
            <h2 className="id-h3">{P.faqTitle}</h2>
            {P.faq(silverFaqFigures(silver, fx, locale)).map((f) => <details key={f.q} className="eco-q"><summary>{f.q}</summary><p className="id-body">{f.a}</p></details>)}
          </section>

          <AboutSection title={P.about.title} body={P.about.body} />
        </div>
      </main>
    </SiteShell>
  )
}
