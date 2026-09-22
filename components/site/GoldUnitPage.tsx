'use client'

import Link from 'next/link'
import { useLocale } from '@/context/LocaleContext'
import { localeDate } from '@/lib/date'
import { SiteShell } from './SiteShell'
import { EconRail } from './EconRail'
import { PageTitle } from './PageTitle'
import { AboutSection } from './AboutSection'
import type { GoldData, FxData } from '@/lib/rates'
import {
  GOLD_PAGES, GOLD_WEIGHTS, MITHQAL_G, OUNCE_G,
  goldFigures, goldUnitVars, unitGrams, type GoldPageDef, type GoldUnit,
} from '@/lib/goldPages'
import '@/styles/econ-page.css'

/**
 * /gold/{slug} · one cut of the local gold list.
 *
 * The lead figure is the exact number the page's query asks for — the mithqal
 * at 21 karat, the gram, the ounce — so the answer is the first thing on the
 * screen and the first thing in the title. Everything under it is the same
 * published list read along the page's own axis, plus the two fixed ratios
 * (4.608 and 31.1035) that people search for on their own.
 */
const nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const nf3 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 })
const UNITS: GoldUnit[] = ['gram', 'mithqal', 'ounce']

export function GoldUnitPage({ def, gold, fx }: { def: GoldPageDef; gold: GoldData | null; fx: FxData | null }) {
  const { t, locale } = useLocale()
  const R = t.rates
  const P = R.page.goldUnit
  const G = R.gold
  const meta = P.meta[def.slug]
  const f = goldFigures(def, gold, fx)
  const v = goldUnitVars(def, f, f.date ? localeDate(f.date, locale) : '—')
  const unitName = { gram: G.unitGram, mithqal: G.unitMithqal, ounce: G.unitOunce }
  /* A karat page is priced in mithqals; a unit page in its own unit. */
  const pageUnit: GoldUnit = def.kind === 'karat' ? 'mithqal' : (def.unit as GoldUnit)
  const mult = unitGrams(pageUnit)
  const row21 = f.byKarat.find((g) => g.karat === 21) ?? f.byKarat[0] ?? null
  const karatRow = def.kind === 'karat' ? f.byKarat.find((g) => g.karat === def.karat) ?? row21 : row21
  const weights = GOLD_WEIGHTS[def.slug] ?? []
  const others = GOLD_PAGES.filter((g) => g.slug !== def.slug)

  return (
    <SiteShell>
      <main className="eco id-full iq-door">
        <EconRail />
        <div className="eco-body">
          <header className="eco-head">
            <p className="id-eyebrow">{R.page.eyebrow}</p>
            <PageTitle title={meta.h1} note={meta.lead} />
            {f.lead == null ? <p className="id-note">{G.unavailableWhat} · {G.unavailableWhy}</p> : (
              <>
                <p className="eco-lead id-num">
                  <strong><bdi>{def.slug === 'ounce' ? `$${nf0.format(f.ounceUsd ?? 0)}` : nf0.format(f.lead)}</bdi></strong>
                  <span className="eco-unit">{def.slug === 'ounce' ? G.unitOunce : meta.unit}</span>
                </p>
                <p className="id-cap eco-when">
                  {f.date ? R.tools.observedOn(localeDate(f.date, locale)) : R.tools.noObserved}
                </p>
                <div className="id-stats id-num eco-stats">
                  {def.kind === 'karat' && karatRow ? (
                    UNITS.map((u) => (
                      <div key={u} className="id-stat"><small>{unitName[u]}</small><b><bdi>{nf0.format(karatRow.gram * unitGrams(u))}</bdi></b></div>
                    ))
                  ) : (
                    f.byKarat.slice(0, 3).map((g) => (
                      <div key={g.karat} className="id-stat"><small>{G.karat(String(g.karat))}</small><b><bdi>{nf0.format(g.gram * mult)}</bdi></b></div>
                    ))
                  )}
                  {/* The ounce page already leads with this figure. */}
                  {def.slug === 'ounce' ? null : <div className="id-stat"><small>{G.ounce} · {G.sell}</small><b><bdi>{f.ounceUsd ? `$${nf0.format(f.ounceUsd)}` : '—'}</bdi></b></div>}
                </div>
              </>
            )}
          </header>

          {f.byKarat.length ? (
            <section className="id-panel eco-panel" aria-label={meta.table}>
              <PageTitle as="h2" className="id-h3" title={meta.table} note={meta.tableNote} />
              <div className="id-table-scroll">
                <table className="id-table eco-table id-num">
                  {def.kind === 'karat' && karatRow ? (
                    <>
                      <thead><tr><th scope="col">{P.colUnit}</th><th scope="col" className="is-end">{P.colGrams}</th><th scope="col" className="is-end">{P.colIqd}</th><th scope="col" className="is-end">{P.colUsd}</th></tr></thead>
                      <tbody>
                        {UNITS.map((u) => (
                          <tr key={u} className={u === 'mithqal' ? 'is-lead' : ''}>
                            <td><span className="id-name">{unitName[u]}</span>{u === 'mithqal' ? <span className="id-sub">{G.mostTraded}</span> : null}</td>
                            <td className="is-end"><bdi>{nf3.format(unitGrams(u))}</bdi></td>
                            <td className="is-end"><bdi>{nf0.format(karatRow.gram * unitGrams(u))}</bdi></td>
                            <td className="is-end"><bdi>${nf0.format(karatRow.usd * unitGrams(u))}</bdi></td>
                          </tr>
                        ))}
                      </tbody>
                    </>
                  ) : (
                    <>
                      <thead><tr><th scope="col">{P.colKarat}</th><th scope="col" className="is-end">{P.colIqd}</th><th scope="col" className="is-end">{P.colUsd}</th></tr></thead>
                      <tbody>
                        {f.byKarat.map((g) => (
                          <tr key={g.karat} className={g.karat === 21 ? 'is-lead' : ''}>
                            <td><span className="id-name">{G.karat(String(g.karat))}</span>{g.karat === 21 ? <span className="id-sub">{G.mostTraded}</span> : null}</td>
                            <td className="is-end"><bdi>{nf0.format(g.gram * mult)}</bdi></td>
                            <td className="is-end"><bdi>${nf0.format(g.usd * mult)}</bdi></td>
                          </tr>
                        ))}
                      </tbody>
                    </>
                  )}
                </table>
              </div>
            </section>
          ) : null}

          {weights.length && karatRow ? (
            <section className="id-panel eco-panel" aria-label={P.weights}>
              <PageTitle as="h2" className="id-h3" title={P.weights} note={P.weightsNote(unitName[pageUnit])} />
              <div className="id-table-scroll">
                <table className="id-table eco-table id-num">
                  <thead><tr><th scope="col">{P.colWeight}</th><th scope="col" className="is-end">{P.colGrams}</th><th scope="col" className="is-end">{P.colValue}</th></tr></thead>
                  <tbody>
                    {weights.map((w) => (
                      <tr key={w.label}>
                        <td><bdi>{nf3.format(w.label)} {unitName[pageUnit]}</bdi></td>
                        <td className="is-end"><bdi>{nf3.format(w.grams)}</bdi></td>
                        <td className="is-end"><bdi>{nf0.format(karatRow.gram * w.grams)}</bdi></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          <section className="id-panel eco-panel" aria-label={P.convert}>
            <PageTitle as="h2" className="id-h3" title={P.convert} note={P.convertNote} />
            <div className="id-stats id-num eco-stats">
              <div className="id-stat"><small>{G.unitMithqal} · {P.colGrams}</small><b><bdi>{nf3.format(MITHQAL_G)}</bdi></b></div>
              <div className="id-stat"><small>{G.unitOunce} · {P.colGrams}</small><b><bdi>{nf3.format(OUNCE_G)}</bdi></b></div>
              <div className="id-stat"><small>{G.unitOunce} · {G.unitMithqal}</small><b><bdi>{nf3.format(OUNCE_G / MITHQAL_G)}</bdi></b></div>
            </div>
          </section>

          <section className="eco-faq" aria-label={P.faqTitle(meta.h1)}>
            <h2 className="id-h3">{P.faqTitle(meta.h1)}</h2>
            {P.faq(def.slug, v).map((q) => <details key={q.q} className="eco-q"><summary>{q.q}</summary><p className="id-body">{q.a}</p></details>)}
          </section>

          <AboutSection title={P.aboutTitle(meta.h1)} body={P.about} />

          <nav className="eco-others" aria-label={P.others}>
            <p className="id-cap">{P.others}</p>
            <div className="id-pills">
              {others.map((o) => <Link key={o.slug} href={`/gold/${o.slug}`} className="id-pill">{P.meta[o.slug].short}</Link>)}
              <Link href="/gold" className="id-pill">{P.allGold}</Link>
            </div>
          </nav>
        </div>
      </main>
    </SiteShell>
  )
}
