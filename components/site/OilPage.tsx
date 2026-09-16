'use client'

import { useLocale } from '@/context/LocaleContext'
import { localeDate } from '@/lib/date'
import { SiteShell } from './SiteShell'
import { EconRail } from './EconRail'
import { PageTitle } from './PageTitle'
import { AboutSection } from './AboutSection'
import type { OilData, OilBlend, FxData } from '@/lib/rates'
import '@/styles/econ-page.css'

/**
 * /oil · the barrel, with Iraq's grades first.
 *
 * Basrah Heavy and Basrah Medium lead — they are what Iraq sells — each
 * with its dollar price, daily change, difference to Brent and the dinar
 * equivalent at the market rate. Then every blend the source lists as one
 * table. Each blend carries its own observation time; there is no single
 * "updated at".
 */
const nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const nf2 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function OilPage({ oil, fx }: { oil: OilData | null; fx: FxData | null }) {
  const { t, locale } = useLocale()
  /* The source is read in Arabic; its slug is the English name. */
  const nameOf = (b: OilBlend) => (locale === 'ar' ? b.name : b.key.replace(/-/g, ' '))
  const R = t.rates
  const P = R.page.oil
  const blends = oil?.blends ?? []
  const brent = blends.find((b) => /brent/i.test(b.key))
  const iraq = blends.filter((b) => b.country === 'iraq')
  const rest = blends.filter((b) => b.country !== 'iraq')
  const market = fx?.sell ?? fx?.buy ?? null
  const when = (b: OilBlend) => (b.stamp ? localeDate(new Date(b.stamp * 1000).toISOString().slice(0, 10), locale) : '—')
  const chgCls = (v: number) => (v > 0 ? 'id-up' : v < 0 ? 'id-down' : '')

  const row = (b: OilBlend) => (
    <tr key={b.key} className={b.country === 'iraq' ? 'is-lead' : ''}>
      <td><span className="id-name">{nameOf(b)}</span>{b.country === 'iraq' ? <span className="id-sub">{P.iraq}</span> : null}</td>
      <td className="is-end"><bdi>{nf2.format(b.usd)}</bdi></td>
      <td className="is-end"><bdi className={chgCls(b.pct)}>{b.change > 0 ? '+' : ''}{nf2.format(b.change)} · {b.pct > 0 ? '+' : ''}{b.pct.toFixed(2)}%</bdi></td>
      <td className="is-end">{brent && b.key !== brent.key ? <bdi>{b.usd - brent.usd > 0 ? '+' : ''}{nf2.format(b.usd - brent.usd)}</bdi> : <span className="id-cap">—</span>}</td>
      <td className="is-end">{market ? <bdi>{nf0.format(b.usd * market)}</bdi> : <span className="id-cap">—</span>}</td>
      <td className="is-end"><span className="id-cap">{when(b)}</span></td>
    </tr>
  )

  return (
    <SiteShell>
      <main className="eco id-full iq-door">
        <EconRail />
        <div className="eco-body">
          <header className="eco-head">
            <p className="id-eyebrow">{R.page.eyebrow}</p>
            <PageTitle title={P.title} note={P.basrahNote} />
            {!blends.length ? <p className="id-note">{R.oil.unavailableWhat} · {R.oil.unavailableWhy}</p> : (
              <>
                {iraq[0] ? (
                  <p className="eco-lead id-num">
                    <strong><bdi>${nf2.format(iraq[0].usd)}</bdi></strong>
                    <span className="eco-unit">{P.perBarrel} · {nameOf(iraq[0])}</span>
                    <span className={`id-chg ${iraq[0].pct > 0 ? 'is-up' : iraq[0].pct < 0 ? 'is-down' : 'is-flat'}`}><bdi>{iraq[0].pct > 0 ? '+' : ''}{iraq[0].pct.toFixed(2)}%</bdi></span>
                  </p>
                ) : null}
                <p className="id-cap eco-when">{oil?.source ? `${R.page.source}: ${oil.source}` : ''}</p>
                <div className="id-stats id-num eco-stats">
                  {iraq.map((b) => (
                    <div className="id-stat" key={b.key}><small>{nameOf(b)}</small><b><bdi>${nf2.format(b.usd)}</bdi></b><span className="id-cap">{market ? `${nf0.format(b.usd * market)} ${P.iqdPerBarrel}` : R.oil.noRate}</span></div>
                  ))}
                  {brent ? <div className="id-stat"><small>{R.oil.brent}</small><b><bdi>${nf2.format(brent.usd)}</bdi></b><span className="id-cap">{iraq[0] ? `${P.colVsBrent}: ${iraq[0].usd - brent.usd > 0 ? '+' : ''}${nf2.format(iraq[0].usd - brent.usd)}` : ''}</span></div> : null}
                </div>
              </>
            )}
          </header>

          {blends.length ? (
            <section className="id-panel eco-panel" aria-label={P.table}>
              <PageTitle as="h2" className="id-h3" title={P.table} note={P.tableNote} />
              <div className="id-table-scroll">
                <table className="id-table eco-table id-num">
                  <thead>
                    <tr>
                      <th scope="col">{P.colBlend}</th>
                      <th scope="col" className="is-end">{P.colUsd}</th>
                      <th scope="col" className="is-end">{P.colChange}</th>
                      <th scope="col" className="is-end">{P.colVsBrent}</th>
                      <th scope="col" className="is-end">{P.colIqd}</th>
                      <th scope="col" className="is-end">{P.colWhen}</th>
                    </tr>
                  </thead>
                  <tbody>{[...iraq, ...rest].map(row)}</tbody>
                </table>
              </div>
              {market ? <p className="id-cap">{R.oil.dinarAt} <bdi>{nf0.format(market)}</bdi> · {R.oil.marketRate}</p> : null}
            </section>
          ) : null}

          <section className="eco-faq" aria-label={P.faqTitle}>
            <h2 className="id-h3">{P.faqTitle}</h2>
            {P.faq.map((f) => (
              <details key={f.q} className="eco-q"><summary>{f.q}</summary><p className="id-body">{f.a}</p></details>
            ))}
          </section>

          <AboutSection title={P.about.title} body={P.about.body} />
        </div>
      </main>
    </SiteShell>
  )
}
