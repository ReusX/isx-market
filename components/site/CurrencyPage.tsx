'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useLocale } from '@/context/LocaleContext'
import { localeDate } from '@/lib/date'
import { SiteShell } from './SiteShell'
import { EconRail } from './EconRail'
import { PageTitle } from './PageTitle'
import { AboutSection } from './AboutSection'
import { SeriesChart, type ChartRange } from './SeriesChart'
import { CURRENCY_FLAGS, type CurrenciesData, type CurrencyCode } from '@/lib/currencies'
import type { FxData } from '@/lib/rates'
import { faqVars, fmtIqd, fmtX, nf0, nf2, currencyFigures } from '@/lib/currencyFigures'
import '@/styles/econ-page.css'

/**
 * /currencies/{code} · one currency, in dinars, the way it is asked for.
 *
 * The dinar figure leads; the dollar cross and the official-rate figure sit
 * under it. A ready table answers «100 يورو كم دينار» without a converter,
 * the chart shows the dinar series, and the About says where the number comes
 * from — including, for the rial, which of Iran's several rates this is.
 */
export type CurrencyPageProps = {
  code: CurrencyCode
  peg: number | null
  toman: boolean
  cur: CurrenciesData | null
  fx: FxData | null
  history: { date: string; value: number }[]
  others: { code: CurrencyCode; slug: string }[]
}

const AMOUNTS = [1, 5, 10, 50, 100, 500, 1000, 5000]
/* Tomans, the unit Iranians and border exchangers actually quote in. */
const TOMAN_AMOUNTS = [10000, 50000, 100000, 500000, 1000000, 5000000, 10000000]
const IQD_AMOUNTS = [10000, 50000, 100000, 250000, 500000, 1000000]

export function CurrencyPage({ code, peg, toman, cur, fx, history, others }: CurrencyPageProps) {
  const { t, locale } = useLocale()
  const R = t.rates
  const P = R.page.currency
  const meta = P.meta[code]
  const name = meta?.page ?? R.page.currencies.names[code] ?? code
  const f = currencyFigures(code, cur, fx)
  /* Small-unit currencies are shown per 1,000 — the rial is quoted that way everywhere. */
  const unit = toman ? 1_000_000 : 1
  const iqdUnit = f.iqd != null ? f.iqd * unit : null
  const iqdOfficialUnit = f.iqdOfficial != null ? f.iqdOfficial * unit : null

  const ranges: ChartRange[] = [
    { id: '1M', label: R.fx.period['1M'], days: 31 }, { id: '3M', label: R.fx.period['3M'], days: 92 },
    { id: '6M', label: R.fx.period['6M'], days: 183 }, { id: '1Y', label: R.fx.period['1Y'], days: 366 },
  ]
  const series = useMemo(() => [{ key: 'iqd', label: name, points: history.map((p) => ({ date: p.date, value: p.value * unit })) }], [history, name, unit])

  const [amount, setAmount] = useState('100')
  const [dir, setDir] = useState<'cur' | 'iqd'>('cur')
  const num = parseFloat(amount.replace(/,/g, '')) || 0
  /* The rial page converts tomans. */
  const rate = f.iqd ? (toman ? f.iqd * 10 : f.iqd) : null
  const out = rate ? (dir === 'cur' ? num * rate : num / rate) : null

  return (
    <SiteShell>
      <main className="eco id-full iq-door">
        <EconRail />
        <div className="eco-body">
          <header className="eco-head">
            <p className="id-eyebrow">{R.page.eyebrow}</p>
            <PageTitle title={`${CURRENCY_FLAGS[code]} ${P.title(name)}`} note={P.leadNote(name)} />
            {iqdUnit == null || !f.market ? <p className="id-note">{R.tools.unavailable}</p> : (
              <>
                <p className="eco-lead id-num">
                  <strong><bdi>{fmtIqd(iqdUnit)}</bdi></strong>
                  <span className="eco-unit">{meta?.unit ?? R.gold.iqd}</span>
                </p>
                <p className="eco-hundred id-num">
                  {P.perUsd(fmtX(toman ? (f.perUsd as number) / 10 : (f.perUsd as number)), toman ? (meta?.short ?? name) : name)} · {P.officialAt(fmtIqd(iqdOfficialUnit))}
                </p>
                {toman && f.iqd != null ? <p className="eco-hundred id-num">{P.tomanNote(fmtIqd(f.iqd * 1_000_000))}</p> : null}
                {peg ? <p className="id-cap eco-when">{P.pegNote(name, fmtX(peg))}</p> : null}
                <p className="id-cap eco-when">{f.date ? R.tools.observedOn(localeDate(f.date, locale)) : R.tools.noObserved} · {R.gold.atMarketRate} {nf0.format(f.market)} {R.gold.iqd}</p>
              </>
            )}
          </header>

          {f.iqd != null ? (
            <section className="id-panel eco-panel" aria-label={P.table}>
              <PageTitle as="h2" className="id-h3" title={P.table} note={P.tableNote(name)} />
              <div className="eco-two">
                <div className="id-table-scroll">
                  <table className="id-table eco-table id-num">
                    <thead><tr><th>{P.colAmount}</th><th className="is-end">{P.colIqd}</th><th className="is-end">{P.colIqdOfficial}</th></tr></thead>
                    <tbody>
                      {(toman ? TOMAN_AMOUNTS : AMOUNTS).map((a) => {
                        /* Toman amounts are ×10 in rials for the arithmetic. */
                        const rial = toman ? a * 10 : a
                        return <tr key={a}><td><bdi>{nf0.format(a)} {meta?.short ?? code}</bdi></td><td className="is-end"><bdi>{fmtIqd((f.iqd as number) * rial)}</bdi></td><td className="is-end"><bdi>{fmtIqd((f.iqdOfficial as number) * rial)}</bdi></td></tr>
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="id-table-scroll">
                  <table className="id-table eco-table id-num">
                    <thead><tr><th>{P.colDinars}</th><th className="is-end">{P.reverse(meta?.short ?? name)}</th></tr></thead>
                    <tbody>
                      {IQD_AMOUNTS.map((a) => (
                        <tr key={a}><td><bdi>{nf0.format(a)}</bdi></td><td className="is-end"><bdi>{toman ? nf0.format(a / (f.iqd as number) / 10) : nf2.format(a / (f.iqd as number))}</bdi></td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          ) : null}

          <section className="id-panel eco-panel" aria-label={P.chart(name)}>
            <PageTitle as="h2" className="id-h3" title={P.chart(name)} note={history.length ? `${peg ? P.chartPeg : P.chartNote} ${P.chartSince(localeDate(history[0].date, locale))}` : P.noChart} />
            {history.length > 1 ? <SeriesChart series={series} ranges={ranges} defaultRange="1M" format={(v) => fmtIqd(v)} label={P.chart(name)} /> : null}
          </section>

          {f.iqd != null ? (
            <section className="id-panel eco-panel" aria-label={P.calc}>
              <PageTitle as="h2" className="id-h3" title={P.calc} note={P.calcNote} />
              <div className="eco-calc id-num">
                <label><span className="id-cap">{R.page.currencies.amount}</span><input className="id-input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} aria-label={R.page.currencies.amount} /></label>
                <div className="id-pills" role="group">
                  <button type="button" className={`id-pill ${dir === 'cur' ? 'is-on' : ''}`} aria-pressed={dir === 'cur'} onClick={() => setDir('cur')}>{meta?.short ?? code} ← {R.page.currencies.dinar}</button>
                  <button type="button" className={`id-pill ${dir === 'iqd' ? 'is-on' : ''}`} aria-pressed={dir === 'iqd'} onClick={() => setDir('iqd')}>{R.page.currencies.dinar} ← {meta?.short ?? code}</button>
                </div>
                <p className="eco-conv-out"><span className="id-cap">{dir === 'cur' ? R.page.currencies.dinar : name}</span><strong><bdi>{out == null ? '—' : out >= 100 ? nf0.format(out) : nf2.format(out)}</bdi></strong></p>
              </div>
            </section>
          ) : null}

          <section className="eco-faq" aria-label={P.faqTitle(name)}>
            <h2 className="id-h3">{P.faqTitle(name)}</h2>
            {P.faq(faqVars(code, name, meta?.short ?? code, cur, fx, toman, !!peg, locale)).map((q) => <details key={q.q} className="eco-q"><summary>{q.q}</summary><p className="id-body">{q.a}</p></details>)}
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

