'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useLocale } from '@/context/LocaleContext'
import { localeDate } from '@/lib/date'
import { SiteShell } from './SiteShell'
import { EconRail } from './EconRail'
import { PageTitle } from './PageTitle'
import { AboutSection } from './AboutSection'
import type { GoldData, FxData } from '@/lib/rates'
import { goldFaqFigures } from '@/lib/ratesFaq'
import { GOLD_PAGES } from '@/lib/goldPages'
import '@/styles/econ-page.css'

/**
 * /gold · the local gold list.
 *
 * The number a buyer asks for first — a 21K mithqal — leads; then the
 * whole list by karat as one table (gram, mithqal, ounce, the source's own
 * dollar figure), a weight calculator, and the ounce as published. These
 * are a published local list, re-read every three hours, not a converted
 * world price; the copy says so.
 */
const MITHQAL_G = 4.608
const OUNCE_G = 31.1035
const nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

export function GoldPage({ gold, fx }: { gold: GoldData | null; fx: FxData | null }) {
  const { t, locale } = useLocale()
  const R = t.rates
  const P = R.page.gold
  const G = R.gold
  const grams = (gold?.grams ?? []).slice().sort((a, b) => b.karat - a.karat)
  const k21 = grams.find((g) => g.karat === 21) ?? grams[0]
  const market = fx?.sell ?? fx?.buy ?? null

  const [w, setW] = useState('1')
  const [unit, setUnit] = useState<'gram' | 'mithqal' | 'ounce'>('mithqal')
  const [karat, setKarat] = useState<number>(21)
  const per = grams.find((g) => g.karat === karat)?.iqd ?? k21?.iqd ?? 0
  const gramsIn = unit === 'gram' ? 1 : unit === 'mithqal' ? MITHQAL_G : OUNCE_G
  const value = (parseFloat(w) || 0) * gramsIn * per
  const unitLabel = { gram: G.unitGram, mithqal: G.unitMithqal, ounce: G.unitOunce }

  return (
    <SiteShell>
      <main className="eco id-full iq-door">
        <EconRail />
        <div className="eco-body">
          <header className="eco-head">
            <p className="id-eyebrow">{R.page.eyebrow}</p>
            <PageTitle title={P.title} note={P.leadNote} />
            {!k21 ? <p className="id-note">{G.unavailableWhat} · {G.unavailableWhy}</p> : (
              <>
                <p className="eco-lead id-num">
                  <strong><bdi>{nf0.format(k21.iqd * MITHQAL_G)}</bdi></strong>
                  <span className="eco-unit">{G.iqd} · {P.mithqal21}</span>
                </p>
                <p className="id-cap eco-when">
                  {gold?.date ? R.tools.observedOn(localeDate(gold.date.replace(/\//g, '-'), locale)) : R.tools.noObserved}
                </p>
                <div className="id-stats id-num eco-stats">
                  <div className="id-stat"><small>{P.gram21}</small><b><bdi>{nf0.format(k21.iqd)}</bdi></b></div>
                  <div className="id-stat"><small>{G.k24} · {G.unitGram}</small><b><bdi>{nf0.format(grams.find((g) => g.karat === 24)?.iqd ?? 0) || '—'}</bdi></b></div>
                  <div className="id-stat"><small>{G.k18} · {G.unitGram}</small><b><bdi>{nf0.format(grams.find((g) => g.karat === 18)?.iqd ?? 0) || '—'}</bdi></b></div>
                  <div className="id-stat"><small>{P.ounce} · {G.sell}</small><b><bdi>{gold?.ounceSell ? `$${nf0.format(gold.ounceSell.usd)}` : '—'}</bdi></b></div>
                </div>
              </>
            )}
          </header>

          {/* The four cuts people actually search for, each on its own page.
              Listed first so a reader who came for «المثقال» sees that page
              immediately rather than scrolling a table of every unit. */}
          <nav className="eco-others" aria-label={R.page.goldUnit.others}>
            <p className="id-cap">{R.page.goldUnit.others}</p>
            <div className="id-pills">
              {GOLD_PAGES.map((g) => <Link key={g.slug} href={`/gold/${g.slug}`} className="id-pill">{R.page.goldUnit.meta[g.slug].short}</Link>)}
            </div>
          </nav>

          {grams.length ? (
            <section className="id-panel eco-panel" aria-label={P.byKarat}>
              <PageTitle as="h2" className="id-h3" title={P.byKarat} note={P.byKaratNote} />
              <div className="id-table-scroll">
                <table className="id-table eco-table id-num">
                  <thead>
                    <tr>
                      <th scope="col">{P.colKarat}</th>
                      <th scope="col" className="is-end">{P.colGram}</th>
                      <th scope="col" className="is-end">{P.colMithqal}</th>
                      <th scope="col" className="is-end">{P.colOunce}</th>
                      <th scope="col" className="is-end">{P.colUsd}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grams.map((g) => (
                      <tr key={g.karat} className={g.karat === 21 ? 'is-lead' : ''}>
                        <td><span className="id-name">{G.karat(String(g.karat))}</span>{g.karat === 21 ? <span className="id-sub">{G.mostTraded}</span> : null}</td>
                        <td className="is-end"><bdi>{nf0.format(g.iqd)}</bdi></td>
                        <td className="is-end"><bdi>{nf0.format(g.iqd * MITHQAL_G)}</bdi></td>
                        <td className="is-end"><bdi>{nf0.format(g.iqd * OUNCE_G)}</bdi></td>
                        <td className="is-end"><bdi>${g.usd}</bdi></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="id-cap">{G.perUnit(G.unitGram)} · {G.iqd}</p>
            </section>
          ) : null}

          {grams.length ? (
            <section className="id-panel eco-panel" aria-label={P.calc}>
              <PageTitle as="h2" className="id-h3" title={P.calc} note={P.calcNote} />
              <div className="eco-calc id-num">
                <label><span className="id-cap">{P.weight}</span><input className="id-input" inputMode="decimal" value={w} onChange={(e) => setW(e.target.value)} aria-label={P.weight} /></label>
                <div><span className="id-cap">{P.unit}</span>
                  <div className="id-pills" role="group" aria-label={P.unit}>
                    {(['gram', 'mithqal', 'ounce'] as const).map((u) => <button key={u} type="button" className="id-pill is-sm" aria-pressed={unit === u} onClick={() => setUnit(u)}>{unitLabel[u]}</button>)}
                  </div>
                </div>
                <div><span className="id-cap">{P.karat}</span>
                  <div className="id-pills" role="group" aria-label={P.karat}>
                    {grams.map((g) => <button key={g.karat} type="button" className="id-pill is-sm" aria-pressed={karat === g.karat} onClick={() => setKarat(g.karat)}>{G.karat(String(g.karat))}</button>)}
                  </div>
                </div>
                <p className="eco-conv-out"><span className="id-cap">{P.value}</span><strong><bdi>{nf0.format(value)}</bdi></strong><span className="eco-unit">{G.iqd}{market ? ` · ≈ $${nf0.format(value / market)} ${G.atMarketRate}` : ''}</span></p>
              </div>
            </section>
          ) : null}

          {gold?.ounceSell || gold?.ounceBuy ? (
            <section className="id-panel eco-panel" aria-label={P.published}>
              <PageTitle as="h2" className="id-h3" title={P.published} note={P.publishedNote} />
              <div className="id-stats id-num eco-stats">
                {gold.ounceSell ? <div className="id-stat"><small>{G.sell} · {G.iqd}</small><b><bdi>{nf0.format(gold.ounceSell.iqd)}</bdi></b><span className="id-cap">${nf0.format(gold.ounceSell.usd)}</span></div> : null}
                {gold.ounceBuy ? <div className="id-stat"><small>{G.buy} · {G.iqd}</small><b><bdi>{nf0.format(gold.ounceBuy.iqd)}</bdi></b><span className="id-cap">${nf0.format(gold.ounceBuy.usd)}</span></div> : null}
              </div>
            </section>
          ) : null}

          <section className="eco-faq" aria-label={P.faqTitle}>
            <h2 className="id-h3">{P.faqTitle}</h2>
            {P.faq(goldFaqFigures(gold, locale)).map((f) => (
              <details key={f.q} className="eco-q"><summary>{f.q}</summary><p className="id-body">{f.a}</p></details>
            ))}
          </section>

          <AboutSection title={P.about.title} body={P.about.body} />
        </div>
      </main>
    </SiteShell>
  )
}
