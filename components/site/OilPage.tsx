'use client'

import { useState } from 'react'
import { useLocale } from '@/context/LocaleContext'
import { localeDate } from '@/lib/date'
import { CBI_OFFICIAL_RATE } from '@/lib/fxOfficial'
import { SiteShell } from './SiteShell'
import { EconRail } from './EconRail'
import { PageTitle } from './PageTitle'
import { AboutSection } from './AboutSection'
import { DayChip } from './DayChip'
import type { OilData, OilBlend, FxData } from '@/lib/rates'
import { oilFaqFigures } from '@/lib/ratesFaq'
import '@/styles/econ-page.css'

/**
 * /oil · the barrel, Iraq's grades first, on the approved board (identity
 * v3, as /fx and /gold): Basrah in dinars leads with the swoosh and its
 * move; the source keeps no history, so in place of a chart the board draws
 * Basrah against the big benchmarks; the cargo calculator is the key card;
 * three story cards (Brent, the official rate, the day); then every blend
 * the source lists, each with its own observation time.
 */
const nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const nf2 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function OilPage({ oil, fx }: { oil: OilData | null; fx: FxData | null }) {
  const { t, locale } = useLocale()
  const R = t.rates
  const P = R.page.oil
  const B = P.board
  /* Flag by the source's country code; codes that are not countries get none. */
  const FLAG: Record<string, string> = {
    iraq: '🇮🇶', uk: '🇬🇧', usa: '🇺🇸', uae: '🇦🇪', qatar: '🇶🇦', kuwait: '🇰🇼', arab: '🇸🇦', iran: '🇮🇷',
    nig: '🇳🇬', libya: '🇱🇾', algeria: '🇩🇿', rus: '🇷🇺', mexico: '🇲🇽', ven: '🇻🇪', canada: '🇨🇦', india: '🇮🇳', bed: '🇴🇲',
  }
  const flag = (b: OilBlend) => (b.country && FLAG[b.country] ? <span aria-hidden="true">{FLAG[b.country]} </span> : null)
  /* The two Iraqi blends are named by us; the rest as published (Arabic). */
  const nameOf = (b: OilBlend) => {
    if (/basra.*heavy/i.test(b.key)) return P.basrahHeavy
    if (/basra.*medium/i.test(b.key)) return P.basrahMedium
    if (locale !== 'ar') return b.key.replace(/-/g, ' ')
    return P.names[b.key] ?? b.name
  }
  const blends = oil?.blends ?? []
  const brent = blends.find((b) => /brent/i.test(b.key) && !/urals/i.test(b.key))
  const wti = blends.find((b) => /^wti/i.test(b.key) && !/midland/i.test(b.key)) ?? blends.find((b) => /wti/i.test(b.key))
  const opec = blends.find((b) => /opec/i.test(b.key))
  const iraq = blends.filter((b) => b.country === 'iraq')
  const rest = blends.filter((b) => b.country !== 'iraq')
  const lead = iraq[0] ?? brent ?? null
  const market = fx?.sell ?? fx?.buy ?? null
  const when = (b: OilBlend) => (b.stamp ? localeDate(new Date(b.stamp * 1000).toISOString().slice(0, 10), locale) : '—')
  const dir = !lead || Math.round(lead.pct * 100) === 0 ? 0 : lead.pct > 0 ? 1 : -1

  /* The ladder in place of a chart: Basrah against the benchmarks, bars
     from a floor just under the cheapest so the differences show. */
  const ladder = [...iraq, brent, wti, opec].filter((b, i, a): b is OilBlend => !!b && a.indexOf(b) === i)
  const lo = ladder.length ? Math.min(...ladder.map((b) => b.usd)) : 0, hi = ladder.length ? Math.max(...ladder.map((b) => b.usd)) : 1
  const floor = Math.max(0, Math.floor(lo - (hi - lo || 4) * 0.8))

  const [n, setN] = useState('1000')
  const [pick, setPick] = useState<string>(lead?.key ?? '')
  const chosen = blends.find((b) => b.key === pick) ?? lead
  const num = parseFloat(n.replace(/,/g, '')) || 0
  const usd = chosen ? num * chosen.usd : 0

  return (
    <SiteShell>
      <main className="eco id-full iq-door" data-world="tile" data-level="accent">
        <EconRail />
        <div className="eco-body">
          <div className="fx-frame">
            <div className="fx-board">
              <div className="fx-lead">
                <header className="eco-head fx-head">
                  <PageTitle title={P.title} note={P.basrahNote} className="fx-title" />
                </header>
                {!lead ? <p className="id-note">{R.oil.unavailableWhat} · {R.oil.unavailableWhy}</p> : (
                  <>
                    <p className="fx-huge id-num">
                      <span className={`fx-huge-num ${dir === 0 ? '' : dir > 0 ? 'is-up' : 'is-down'}`.trim()}>
                        <bdi>{market ? nf0.format(lead.usd * market) : `$${nf2.format(lead.usd)}`}</bdi>
                        <svg className="fx-swoosh" viewBox="0 0 200 40" preserveAspectRatio="none" aria-hidden="true">
                          <path d="M4 30 C 50 10, 110 4, 196 20" pathLength={1} fill="none" stroke="currentColor" strokeWidth={5} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                        </svg>
                      </span>
                    </p>
                    <p className="fx-line">
                      <DayChip pct={lead.pct} label={when(lead)} />
                      <span>{market ? B.perBarrel : P.perBarrel} · {flag(lead)}{nameOf(lead)} · ${nf2.format(lead.usd)}</span>
                    </p>
                    {ladder.length > 1 ? (
                      <div className="oil-ladder" aria-label={B.ladder}>
                        {ladder.map((b) => (
                          <div key={b.key} className={b.country === 'iraq' ? 'is-iraq' : undefined}>
                            <span className="oil-ladder-name">{flag(b)}{nameOf(b)}</span>
                            <span className="oil-ladder-track"><i style={{ width: `${((b.usd - floor) / (hi - floor)) * 100}%` }} /></span>
                            <b className="id-num"><bdi>${nf2.format(b.usd)}</bdi></b>
                          </div>
                        ))}
                        <p className="fx-chart-note">{B.ladder}</p>
                      </div>
                    ) : null}
                  </>
                )}
              </div>

              {lead ? (
                <section className="id-print is-key fx-calc" aria-label={R.oil.calcLabel}>
                  <h2 className="fx-calc-title">{B.calcTitle}</h2>
                  <label className="fx-calc-in" htmlFor="oil-barrels">
                    <span>{B.barrels}</span>
                    <input id="oil-barrels" className="id-num" inputMode="decimal" dir="ltr" value={n} onChange={(e) => setN(e.target.value)} />
                  </label>
                  <div className="fx-quick" role="group" aria-label={R.page.fx.quick}>
                    {[100, 1000, 1000000].map((v) => <button key={v} type="button" className="fx-qbtn id-num" aria-pressed={num === v} onClick={() => setN(String(v))}>{nf0.format(v)}</button>)}
                  </div>
                  <div className="fx-quick" role="group" aria-label={B.blend}>
                    {[...iraq, brent].filter((b): b is OilBlend => !!b).map((b) => (
                      <button key={b.key} type="button" className="fx-qbtn" aria-pressed={chosen?.key === b.key} onClick={() => setPick(b.key)}>{nameOf(b)}</button>
                    ))}
                  </div>
                  {chosen ? <p className="fx-calc-note">{B.rateNote(nf2.format(chosen.usd))}</p> : null}
                  <p className="fx-calc-out id-num"><bdi>{market ? nf0.format(usd * market) : '—'}</bdi> <span>{R.page.fx.calcIqd}</span></p>
                  {usd > 0 ? <p className="fx-calc-prev id-num">{B.outUsd(nf0.format(usd))}</p> : null}
                </section>
              ) : null}
            </div>
          </div>
          <div className="fx-captions">
            <p className="id-cap eco-when">
              {lead ? R.tools.observedOn(when(lead)) : R.tools.noObserved}
              {market ? ` · ${R.oil.dinarAt} ${nf0.format(market)} · ${R.oil.marketRate}` : ''}
            </p>
          </div>

          {lead ? (
            <div className="fx-facts id-num">
              {brent && lead !== brent ? (() => {
                const d = lead.usd - brent.usd, cheaper = d < 0
                const head = B.brentHead(`$${nf2.format(Math.abs(d))}`, cheaper)
                return (
                  <section className="id-print is-calm fx-fact" aria-label={R.oil.brent}>
                    <svg className="fx-ill" viewBox="0 0 64 64" aria-hidden="true"><path d="M32 10v40M18 54h28" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/><path d="M10 20l44-6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/><path d="M4 34l6-14 6 14z M48 28l6-14 6 14z" fill="var(--fill)" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round"/></svg>
                    <h3 className="fx-fact-head">{head[0]}<em><bdi>{head[1]}</bdi></em>{head[2]}</h3>
                    <p className="fx-pocket">{B.brentPocket(`$${nf0.format(Math.abs(d) * 1_000_000)}`, cheaper)}</p>
                    <div className="fx-pair">
                      <div><small>{nameOf(lead)}</small><b><bdi>${nf2.format(lead.usd)}</bdi></b></div>
                      <div><small>{R.oil.brent}</small><b><bdi>${nf2.format(brent.usd)}</bdi></b></div>
                    </div>
                    <details className="fx-more"><summary aria-label={R.page.fx.facts.more}>+</summary><p>{B.brentMore}</p></details>
                  </section>
                )
              })() : null}

              {market ? (() => {
                const atOfficial = lead.usd * CBI_OFFICIAL_RATE, atMarket = lead.usd * market
                const head = B.rateHead(nf0.format(atOfficial))
                return (
                  <section className="id-print is-calm fx-fact" aria-label={B.official}>
                    <svg className="fx-ill" viewBox="0 0 64 64" aria-hidden="true"><path d="M20 10h24l-2 8H22z" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/><path d="M18 18h28v34a4 4 0 0 1-4 4H22a4 4 0 0 1-4-4z" fill="var(--fill)" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/><path d="M18 30h28M18 42h28" fill="none" stroke="currentColor" strokeWidth="2.2"/></svg>
                    <h3 className="fx-fact-head">{head[0]}<em><bdi>{head[1]}</bdi></em>{head[2]}</h3>
                    <p className="fx-pocket">{B.ratePocket(nf0.format(atMarket - atOfficial))}</p>
                    <div className="fx-bars is-wide" aria-hidden="true">
                      <div><span>{R.fx.tabMarket}</span><i style={{ width: '100%' }} className="is-market" /><b>{nf0.format(atMarket)}</b></div>
                      <div><span>{B.official}</span><i style={{ width: `${(atOfficial / atMarket) * 100}%` }} /><b>{nf0.format(atOfficial)}</b></div>
                    </div>
                    <details className="fx-more"><summary aria-label={R.page.fx.facts.more}>+</summary><p>{B.rateMore}</p></details>
                  </section>
                )
              })() : null}

              {(() => {
                const p = Math.round(lead.pct * 100) / 100
                const head = p === 0 ? B.dayFlat : p > 0 ? B.dayUp(`${p.toFixed(2)}%`) : B.dayDown(`${Math.abs(p).toFixed(2)}%`)
                return (
                  <section className="id-print is-calm fx-fact" aria-label={P.colChange}>
                    <svg className="fx-ill" viewBox="0 0 64 64" aria-hidden="true"><ellipse cx="32" cy="14" rx="16" ry="5" fill="var(--fill)" stroke="currentColor" strokeWidth="2.5"/><path d="M16 14v36c0 3 7 5 16 5s16-2 16-5V14" fill="none" stroke="currentColor" strokeWidth="2.5"/><path d="M16 28c0 3 7 5 16 5s16-2 16-5M16 40c0 3 7 5 16 5s16-2 16-5" fill="none" stroke="currentColor" strokeWidth="2"/></svg>
                    <h3 className={`fx-fact-head ${p > 0 ? 'is-up' : p < 0 ? 'is-down' : ''}`.trim()}>{head[0]}<em><bdi>{head[1]}</bdi></em>{head[2]}</h3>
                    {p !== 0 ? <p className="fx-pocket">{B.dayPocket(`$${nf2.format(Math.abs(lead.change) * 100)}`, p > 0)}</p> : null}
                    <div className="fx-pair">
                      <div><small>{P.colChange}</small><b><bdi className={p > 0 ? 'id-up' : p < 0 ? 'id-down' : ''}>{lead.change > 0 ? '+' : ''}{nf2.format(lead.change)} $</bdi></b></div>
                      <div><small>{P.colWhen}</small><b className="oil-when">{when(lead)}</b></div>
                    </div>
                    <details className="fx-more"><summary aria-label={R.page.fx.facts.more}>+</summary><p>{B.dayMore}</p></details>
                  </section>
                )
              })()}
            </div>
          ) : null}

          {blends.length ? (
            <section className="cur-all" aria-label={B.all}>
              <PageTitle as="h2" className="id-h3" title={B.all} note={P.tableNote} />
              <ul className="cmap-far-list oil-list id-num">
                {[...iraq, ...rest].map((b) => (
                  <li key={b.key} className={b.country === 'iraq' ? 'is-hit' : undefined}>
                    <span className="cmap-name">{flag(b)}{nameOf(b)}</span>
                    <span className="cmap-price"><bdi>${nf2.format(b.usd)}</bdi>{market ? <small>{nf0.format(b.usd * market)} {R.gold.iqd}</small> : null}</span>
                    <DayChip pct={b.pct} label={when(b)} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="eco-faq id-panel" aria-label={P.faqTitle}>
            <h2 className="id-h3">{P.faqTitle}</h2>
            {P.faq(oilFaqFigures(oil, fx, locale)).map((f) => (
              <details key={f.q} className="eco-q"><summary>{f.q}</summary><p className="id-body">{f.a}</p></details>
            ))}
          </section>

          <AboutSection title={P.about.title} body={P.about.body} />
        </div>
      </main>
    </SiteShell>
  )
}
