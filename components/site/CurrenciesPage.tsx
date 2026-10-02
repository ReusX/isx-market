'use client'

import { useMemo, useRef, useState } from 'react'
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
import type { CurrencyMoves } from '@/lib/currencyMoves'
import { DayChip } from './DayChip'
import { MiniArea } from './MiniArea'
import { CurrencyMap, MAP_FLAGS, type MapCard, type MapCode } from './CurrencyMap'
import '@/styles/econ-page.css'

/**
 * /currencies · every currency the reader might hold, in dinars.
 *
 * The euro leads (the one people ask for after the dollar) on the shared
 * board frame with its month chart and the converter as the key card; then
 * one table: each currency at the parallel and official rate, and its move.
 * The converter goes through the dollar. Nothing
 * here is a local list price — the page says so, and the About explains
 * why Baghdad has no direct euro market.
 */
const SMALL: CurrencyCode[] = ['IRR', 'SYP', 'LBP', 'KRW']  // shown per 1,000 units
/* Currencies with a page of their own (Arabic only) — the table links to them. */
const PAGES: Partial<Record<CurrencyCode, string>> = { TRY: 'try', SAR: 'sar', IRR: 'irr', EUR: 'eur', AED: 'aed', KWD: 'kwd', JOD: 'jod', GBP: 'gbp' }
const nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const nf2 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function CurrenciesPage({ cur, fx, moves, eurHistory = [] }: { cur: CurrenciesData | null; fx: FxData | null; moves?: CurrencyMoves | null; eurHistory?: { date: string; value: number }[] }) {
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
  const vsPrev = moves ? R.tools.vsPrev(localeDate(moves.prevDate, locale)) : ''
  const chip = (c: CurrencyCode) => (moves?.pct[c] != null ? <DayChip pct={moves.pct[c]} label={vsPrev} /> : null)

  /* Converter: amount in `from` → `to`, both via the dollar at the market rate. */
  const [amount, setAmount] = useState('100')
  const [from, setFrom] = useState<string>('EUR')
  const [to, setTo] = useState<string>('IQD')
  const toUsd = (code: string, v: number) => (code === 'USD' ? v : code === 'IQD' ? (market ? v / market : 0) : v / (perUsd(code as CurrencyCode) ?? NaN))
  const fromUsd = (code: string, v: number) => (code === 'USD' ? v : code === 'IQD' ? (market ? v * market : 0) : v * (perUsd(code as CurrencyCode) ?? NaN))
  const out = fromUsd(to, toUsd(from, parseFloat(amount) || 0))
  const label = (code: string) => (code === 'IQD' ? P.dinar : code === 'USD' ? P.dollar : P.names[code] ?? code)
  const options = ['IQD', 'USD', ...codes]

  const B = P.board
  const eurPct = moves?.pct.EUR
  const dir = eurPct == null || Math.round(eurPct * 100) === 0 ? 0 : eurPct > 0 ? 1 : -1
  const month = useMemo(() => {
    if (!eurHistory.length) return []
    const since = new Date(new Date(eurHistory[eurHistory.length - 1].date).getTime() - 31 * 86400_000).toISOString().slice(0, 10)
    return eurHistory.filter((p) => p.date >= since)
  }, [eurHistory])
  const swap = () => { setFrom(to); setTo(from) }

  /* The map's cards: one per currency we price, plus the dollar for Iraq. */
  const cards = useMemo(() => {
    const out: Partial<Record<MapCode, MapCard>> = {}
    if (!cur || !market) return out
    for (const c of codes) {
      const m = mult(c), pc = moves?.pct[c], x = perUsd(c) as number
      out[c] = {
        code: c, flag: CURRENCY_FLAGS[c], name: P.names[c] ?? c, unit: R.gold.iqd,
        price: fmtIqd((iqdPer(c, market) ?? 0) * m || null),
        sub: m > 1 ? B.perThousand : undefined,
        tone: pc == null || Math.round(pc * 100) === 0 ? '' : pc > 0 ? 'is-up' : 'is-down',
        chip: chip(c),
        official: fmtIqd((iqdPer(c, CBI_OFFICIAL_RATE) ?? 0) * m || null),
        cross: B.cross(x >= 100 ? nf0.format(x) : x.toFixed(4).replace(/0+$/, '').replace(/\.$/, ''), P.names[c] ?? c),
        href: PAGES[c] && locale === 'ar' ? `/currencies/${PAGES[c]}` : undefined,
        hrefLabel: B.openPage(P.names[c] ?? c),
      }
    }
    out.USD = {
      code: 'USD', flag: '🇺🇸', name: B.usdName, unit: R.gold.iqd, price: nf0.format(market), tone: '', chip: null,
      official: nf0.format(CBI_OFFICIAL_RATE), href: '/fx', hrefLabel: B.usdPage,
    }
    return out
  // eslint-disable-next-line react-hooks/exhaustive-deps -- derived from cur/market/moves/locale only
  }, [cur, market, moves, locale])
  const far = codes.filter((c) => !MAP_FLAGS.some((f) => f.code === c))
  const [active, setActive] = useState<string | null>(null)
  const [farHit, setFarHit] = useState<CurrencyCode | null>(null)
  const [q, setQ] = useState('')
  const mapRef = useRef<HTMLDivElement>(null)
  /* Arabic-tolerant match: «اليورو», «يورو» and «EUR» all find the euro. */
  const norm = (v: string) => v.toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/(^|\s)ال/g, '$1').trim()
  const hits = useMemo(() => {
    const n = norm(q)
    if (!n) return []
    return codes.filter((c) => {
      const names = [P.names[c] ?? '', c, ...MAP_FLAGS.filter((f) => f.code === c).map((f) => B.countries[f.id] ?? '')]
      return names.some((x) => norm(x).includes(n))
    }).slice(0, 6)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, codes.length, locale])
  const pick = (c: CurrencyCode) => {
    setQ('')
    const f = MAP_FLAGS.find((x) => x.code === c)
    if (f) { setFarHit(null); setActive(f.id); mapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }
    else { setActive(null); setFarHit(c); document.getElementById(`cur-${c}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }
  }

  return (
    <SiteShell>
      <main className="eco id-full iq-door" data-world="dinar" data-level="accent">
        <EconRail />
        <div className="eco-body">
          {/* Identity v3, the approved dollar board for the list: the euro
              (the one people ask for after the dollar) as the figure, the
              converter as the key card, then every currency in one table. */}
          <div className="fx-frame">
            <div className="fx-board">
              <div className="fx-lead">
                <header className="eco-head fx-head">
                  <PageTitle title={P.title} note={P.leadNote} className="fx-title" />
                </header>
                <p className="fx-huge id-num">
                  <span className={`fx-huge-num ${dir === 0 ? '' : dir > 0 ? 'is-up' : 'is-down'}`.trim()}>
                    <bdi>{fmtIqd(eur)}</bdi>
                    <svg className="fx-swoosh" viewBox="0 0 200 40" preserveAspectRatio="none" aria-hidden="true">
                      <path d="M4 30 C 50 10, 110 4, 196 20" pathLength={1} fill="none" stroke="currentColor" strokeWidth={5} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                    </svg>
                  </span>
                </p>
                <p className="fx-line">
                  {chip('EUR')}
                  <span>{CURRENCY_FLAGS.EUR} {P.perUnit}{moves ? ` · ${vsPrev}` : ''}</span>
                </p>
                {month.length > 1 ? (
                  <>
                    <MiniArea points={month} format={(v) => fmtIqd(v)} label={B.lead} tone={dir === 0 ? 'world' : dir > 0 ? 'up' : 'down'} />
                    <p className="fx-chart-note">{R.page.currency.board.chartNote}</p>
                  </>
                ) : null}
              </div>

              {cur && market ? (
                <section className="id-print is-key fx-calc" aria-label={P.calc}>
                  <h2 className="fx-calc-title">{B.calcTitle}</h2>
                  <label className="fx-calc-in" htmlFor="cur-amount">
                    <span>{P.amount}</span>
                    <input id="cur-amount" className="id-num" inputMode="decimal" dir="ltr" value={amount} onChange={(e) => setAmount(e.target.value)} />
                  </label>
                  <div className="fx-pairsel">
                    <label className="fx-calc-in"><span>{P.from}</span>
                      <select value={from} onChange={(e) => setFrom(e.target.value)}>{options.map((c) => <option key={c} value={c}>{label(c)}</option>)}</select>
                    </label>
                    <button type="button" className="fx-swap" onClick={swap} aria-label={R.page.fx.swap}>⇄</button>
                    <label className="fx-calc-in"><span>{P.to}</span>
                      <select value={to} onChange={(e) => setTo(e.target.value)}>{options.map((c) => <option key={c} value={c}>{label(c)}</option>)}</select>
                    </label>
                  </div>
                  <p className="fx-calc-note">{P.calcNote}</p>
                  <p className="fx-calc-out id-num"><bdi>{Number.isFinite(out) ? (out >= 100 ? nf0.format(out) : nf2.format(out)) : '—'}</bdi> <span>{label(to)}</span></p>
                </section>
              ) : null}
            </div>
          </div>
          <div className="fx-captions">
            <p className="id-cap eco-when">{cur ? R.tools.observedOn(localeDate(cur.updatedAt.slice(0, 10), locale)) : R.tools.noObserved}{market ? ` · ${R.gold.atMarketRate} ${nf0.format(market)} ${R.gold.iqd}` : ''}</p>
          </div>

          {cur && market ? (
            <section className="cur-all" aria-label={B.all}>
              <PageTitle as="h2" className="id-h3" title={B.all} note={P.tableNote} />
              {/* Search: a name, a country or a code opens that currency's
                  card on the map, or marks it in the list under the map. */}
              <div className="cur-search">
                <input type="search" className="cur-search-in" placeholder={B.search} aria-label={B.searchLabel} value={q}
                  onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && hits[0]) pick(hits[0]) }} />
                {q.trim() ? (
                  <ul className="cur-search-res" role="listbox" aria-label={B.searchLabel}>
                    {hits.length ? hits.map((c) => (
                      <li key={c}><button type="button" role="option" aria-selected={false} onClick={() => pick(c)}>
                        <span aria-hidden="true">{CURRENCY_FLAGS[c]}</span> {P.names[c] ?? c} <small><bdi>{c}</bdi></small>
                        <b className="id-num"><bdi>{fmtIqd((iqdPer(c, market) ?? 0) * mult(c) || null)}</bdi></b>
                      </button></li>
                    )) : <li className="cur-search-none">{B.noMatch}</li>}
                  </ul>
                ) : null}
              </div>

              <div ref={mapRef}>
                <CurrencyMap cards={cards} countries={B.countries} active={active} onActive={setActive}
                  label={B.all} hint={B.hint} closeLabel={B.close} officialLabel={B.official}
                  zoomIn={B.zoomIn} zoomOut={B.zoomOut} zoomReset={B.zoomReset} />
              </div>
              {far.length ? (
                <div className="cmap-far">
                  <p className="id-cap">{B.far}</p>
                  <ul className="cmap-far-list id-num">
                    {far.map((c) => {
                      const k = cards[c] as MapCard
                      return (
                        <li key={c} id={`cur-${c}`} className={farHit === c ? 'is-hit' : undefined}>
                          <span className="cmap-name"><span aria-hidden="true">{k.flag}</span> {k.name}</span>
                          <span className={`cmap-price ${k.tone}`.trim()}><bdi>{k.price}</bdi>{k.sub ? <small>{k.sub}</small> : null}</span>
                          {k.chip}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ) : null}
            </section>
          ) : null}

          <section className="eco-faq id-panel" aria-label={P.faqTitle}>
            <h2 className="id-h3">{P.faqTitle}</h2>
            {P.faq(currenciesFaqFigures(cur, fx, locale)).map((f) => <details key={f.q} className="eco-q"><summary>{f.q}</summary><p className="id-body">{f.a}</p></details>)}
          </section>

          <AboutSection title={P.about.title} body={P.about.body} />
        </div>
      </main>
    </SiteShell>
  )
}
