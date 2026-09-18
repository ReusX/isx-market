'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useLocale } from '@/context/LocaleContext'
import { localeDate } from '@/lib/date'
import { CBI_OFFICIAL_RATE } from '@/lib/fxOfficial'
import { SiteShell } from './SiteShell'
import { EconRail } from './EconRail'
import { PageTitle } from './PageTitle'
import { AboutSection } from './AboutSection'
import { CURRENCY_CODES, CURRENCY_FLAGS, type CurrenciesData, type CurrencyCode } from '@/lib/currencies'
import type { FxData } from '@/lib/rates'
import { currenciesFaqFigures } from '@/lib/ratesFaq'
import '@/styles/econ-page.css'

/**
 * /currencies · every currency the reader might hold, in dinars.
 *
 * The euro leads (the one people ask for after the dollar), then one table:
 * each currency at the parallel rate and the official rate, and its dollar
 * cross rate as published. A converter goes through the dollar. Nothing
 * here is a local list price — the page says so, and the About explains
 * why Baghdad has no direct euro market.
 */
const SMALL: CurrencyCode[] = ['IRR', 'SYP', 'LBP', 'KRW']  // shown per 1,000 units
/* Currencies with a page of their own (Arabic only) — the table links to them. */
const PAGES: Partial<Record<CurrencyCode, string>> = { TRY: 'try', SAR: 'sar', IRR: 'irr', EUR: 'eur', AED: 'aed', KWD: 'kwd', JOD: 'jod', GBP: 'gbp' }
const nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const nf2 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const nf4 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 })

export function CurrenciesPage({ cur, fx }: { cur: CurrenciesData | null; fx: FxData | null }) {
  const { t, locale } = useLocale()
  const R = t.rates
  const P = R.page.currencies
  const market = fx?.sell ?? fx?.buy ?? null
  const perUsd = (c: CurrencyCode) => cur?.perUsd[c] ?? null
  /* Dinars per ONE unit of the currency, at a given dinar-per-dollar rate. */
  const iqdPer = (c: CurrencyCode, usdRate: number | null) => { const r = perUsd(c); return r && usdRate ? usdRate / r : null }
  const mult = (c: CurrencyCode) => (SMALL.includes(c) ? 1000 : 1)
  const fmtIqd = (v: number | null) => (v == null ? '—' : v >= 100 ? nf0.format(v) : nf2.format(v))
  const eur = iqdPer('EUR', market)
  const codes = CURRENCY_CODES.filter((c) => perUsd(c))

  /* Converter: amount in `from` → `to`, both via the dollar at the market rate. */
  const [amount, setAmount] = useState('100')
  const [from, setFrom] = useState<string>('EUR')
  const [to, setTo] = useState<string>('IQD')
  const toUsd = (code: string, v: number) => (code === 'USD' ? v : code === 'IQD' ? (market ? v / market : 0) : v / (perUsd(code as CurrencyCode) ?? NaN))
  const fromUsd = (code: string, v: number) => (code === 'USD' ? v : code === 'IQD' ? (market ? v * market : 0) : v * (perUsd(code as CurrencyCode) ?? NaN))
  const out = fromUsd(to, toUsd(from, parseFloat(amount) || 0))
  const label = (code: string) => (code === 'IQD' ? P.dinar : code === 'USD' ? P.dollar : P.names[code] ?? code)
  const options = ['IQD', 'USD', ...codes]

  return (
    <SiteShell>
      <main className="eco id-full iq-door">
        <EconRail />
        <div className="eco-body">
          <header className="eco-head">
            <p className="id-eyebrow">{R.page.eyebrow}</p>
            <PageTitle title={P.title} note={P.leadNote} />
            {!cur || !market ? <p className="id-note">{R.tools.unavailable}</p> : (
              <>
                <p className="eco-lead id-num">
                  <strong><bdi>{fmtIqd(eur)}</bdi></strong>
                  <span className="eco-unit">{P.perUnit} · {P.headline}</span>
                </p>
                <p className="id-cap eco-when">{R.tools.observedOn(localeDate(cur.updatedAt.slice(0, 10), locale))} · {R.gold.atMarketRate} {nf0.format(market)} {R.gold.iqd}</p>
                <div className="id-stats id-num eco-stats">
                  {(['GBP', 'TRY', 'AED', 'SAR', 'KWD'] as CurrencyCode[]).map((c) => (
                    <div key={c} className="id-stat"><small><span className="oil-flag" aria-hidden="true">{CURRENCY_FLAGS[c]}</span>{P.names[c]}</small><b><bdi>{fmtIqd(iqdPer(c, market))}</bdi></b><span className="id-cap">{R.gold.iqd}</span></div>
                  ))}
                </div>
              </>
            )}
          </header>

          {cur && market ? (
            <section className="id-panel eco-panel" aria-label={P.table}>
              <PageTitle as="h2" className="id-h3" title={P.table} note={P.tableNote} />
              <div className="id-table-scroll">
                <table className="id-table eco-table id-num">
                  <thead><tr><th>{P.colCurrency}</th><th className="is-end">{P.colMarket}</th><th className="is-end">{P.colOfficial}</th><th className="is-end">{P.colPerUsd}</th></tr></thead>
                  <tbody>
                    {codes.map((c) => {
                      const m = mult(c)
                      return (
                        <tr key={c} className={c === 'EUR' ? 'is-lead' : undefined}>
                          <td><span className="id-name"><span className="oil-flag" aria-hidden="true">{CURRENCY_FLAGS[c]}</span>{PAGES[c] && locale === 'ar' ? <Link href={`/currencies/${PAGES[c]}`}>{P.names[c] ?? c}</Link> : (P.names[c] ?? c)}</span><span className="id-sub"><bdi>{c}</bdi>{m > 1 ? ` · ${P.thousand}` : ''}</span></td>
                          <td className="is-end"><bdi>{fmtIqd((iqdPer(c, market) ?? 0) * m || null)}</bdi></td>
                          <td className="is-end"><bdi>{fmtIqd((iqdPer(c, CBI_OFFICIAL_RATE) ?? 0) * m || null)}</bdi></td>
                          <td className="is-end"><bdi>{nf4.format(perUsd(c) as number)}</bdi></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          {cur && market ? (
            <section className="id-panel eco-panel" aria-label={P.calc}>
              <PageTitle as="h2" className="id-h3" title={P.calc} note={P.calcNote} />
              <div className="eco-calc id-num">
                <label><span className="id-cap">{P.amount}</span><input className="id-input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} aria-label={P.amount} /></label>
                <label><span className="id-cap">{P.from}</span>
                  <select className="id-input" value={from} onChange={(e) => setFrom(e.target.value)}>{options.map((c) => <option key={c} value={c}>{label(c)}</option>)}</select>
                </label>
                <label><span className="id-cap">{P.to}</span>
                  <select className="id-input" value={to} onChange={(e) => setTo(e.target.value)}>{options.map((c) => <option key={c} value={c}>{label(c)}</option>)}</select>
                </label>
                <p className="eco-conv-out"><span className="id-cap">{label(to)}</span><strong><bdi>{Number.isFinite(out) ? (out >= 100 ? nf0.format(out) : nf2.format(out)) : '—'}</bdi></strong></p>
              </div>
            </section>
          ) : null}

          <section className="eco-faq" aria-label={P.faqTitle}>
            <h2 className="id-h3">{P.faqTitle}</h2>
            {P.faq(currenciesFaqFigures(cur, fx, locale)).map((f) => <details key={f.q} className="eco-q"><summary>{f.q}</summary><p className="id-body">{f.a}</p></details>)}
          </section>

          <AboutSection title={P.about.title} body={P.about.body} />
        </div>
      </main>
    </SiteShell>
  )
}
