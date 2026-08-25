'use client'

import { useMemo, useState } from 'react'
import { useLocale } from '@/context/LocaleContext'
import { localeDate } from '@/lib/date'
import { useApp } from '@/context/AppContext'
import {
  ToolHead, MetaLine, Disclosure, NoHistoryNote, Unavailable, PartialNotice,
} from '@/components/design/ToolChrome'
import { DitherArt } from '@/components/design/DitherArt'
import { SOURCES, nf0, nf2, signed, signedPct, NA, type Freshness } from '@/lib/marketTools'
import { CBI_OFFICIAL_RATE, CBI_RATE_CONFIRMED } from '@/lib/fxOfficial'
import type { FxData } from '@/lib/rates'
import '@/styles/market-tools.css'
import '@/styles/panels.css'

/**
 * سعر الدولار — a direct port of the approved FX page.
 *
 * One Level-1 number: the parallel-market rate. The official rate is context
 * and is sized as context, the gap rides on its line, buy/sell/spread are one
 * utility line, and the explainers are collapsed.
 *
 * Everything here comes from a real field:
 *
 *   · market buy/sell     `fetchFx` — Alsumaria's daily closing article
 *   · official rate       CBI_OFFICIAL_RATE, a policy constant with its own
 *                         confirmation date in lib/fxCopy.ts
 *   · gap and spread      subtraction of two displayed figures
 *   · freshness           the source's own observation date, and `stale` when
 *                         the scrape fell back to the cached row
 *
 * NOT here, because nothing stores it: a daily change, a high/low, an intraday
 * move, and a trend. The source publishes one closing price per day and this
 * product keeps no previous reading, so there is no yesterday to subtract. The
 * disclosure says exactly that rather than leaving a blank space.
 */

type RateId = 'market' | 'official'

const CONVERT_RATES: { id: RateId }[] = [
  { id: 'market' as const },
  { id: 'official' as const },
]

/** الفجوة — market minus official, the gap the product's own FAQ names. */
function gap(market: number | null, official: number | null) {
  if (market == null || official == null) return null
  const abs = market - official
  return { abs, pct: (abs / official) * 100 }
}

/** الفرق — what the changers keep on a round trip. */
function spread(sell: number | null, buy: number | null) {
  if (sell == null || buy == null) return null
  const abs = sell - buy
  return { abs, pct: (abs / sell) * 100 }
}

export default function FxPage({ fx }: { fx: FxData | null }) {
  const { t: T, locale } = useLocale()
  const rt = T.rates
  const { theme } = useApp()
  const [convertWith, setConvertWith] = useState<RateId>('market')

  const marketSell = fx?.sell ?? null
  const marketBuy = fx?.buy ?? null
  const marketDown = marketSell == null && marketBuy == null
  // The sell price is the quoted one; fall back to buy rather than showing
  // nothing when only one side parsed.
  const headline = marketSell ?? marketBuy

  const [usd, setUsd] = useState('100')
  const [iqd, setIqd] = useState(() => (headline ? String(Math.round(100 * headline)) : ''))

  const fresh: Freshness = useMemo(() => ({
    observed: fx?.date ?? null,
    stale: Boolean(fx?.stale),
    source: SOURCES.fx,
  }), [fx])

  const theGap = gap(headline, CBI_OFFICIAL_RATE)
  const theSpread = spread(marketSell, marketBuy)

  const activeId: RateId = marketDown ? 'official' : convertWith
  const active = activeId === 'market' ? headline : CBI_OFFICIAL_RATE

  function onUsd(v: string) {
    const c = v.replace(/[^\d.]/g, '')
    setUsd(c)
    setIqd(active && c ? String(Math.round(parseFloat(c) * active)) : '')
  }
  function onIqd(v: string) {
    const c = v.replace(/[^\d.]/g, '')
    setIqd(c)
    setUsd(active && c ? (parseFloat(c) / active).toFixed(2) : '')
  }
  function switchRate(id: RateId) {
    setConvertWith(id)
    const r = id === 'market' ? headline : CBI_OFFICIAL_RATE
    const n = parseFloat(usd)
    if (r && Number.isFinite(n)) setIqd(String(Math.round(n * r)))
  }

  return (
    <main className="mt-page fx-page iq-page">
      <ToolHead
        title={rt.fx.pageTitle}
        freshness={fresh}
        unavailable={marketDown}
        actions={null}
      />

      {fx?.stale ? (
        <PartialNotice>
          {rt.fx.staleNotice}
          {fx.date ? <>{rt.fx.fromDate(localeDate(fx.date, locale))}</> : null}.
        </PartialNotice>
      ) : null}
      {!marketDown && marketBuy == null ? (
        <PartialNotice>
          {rt.fx.partialNotice}
        </PartialNotice>
      ) : null}
      {marketDown ? (
        <PartialNotice>
          {rt.fx.marketDownNotice}
        </PartialNotice>
      ) : null}

      {/* ═══ Hero · art beside ONE number ═══════════════════════════════════ */}
      <section className="mt-hero" aria-label={rt.fx.heroLabel}>
        <div className="mt-art"><DitherArt scene="fx" theme={theme === 'dark' ? 'dark' : 'light'} /></div>

        <div className="mt-quote">
          {headline == null ? (
            <Unavailable
              what={rt.fx.marketUnavailableWhat}
              why={rt.fx.marketUnavailableWhy}
              source={SOURCES.fx}
            />
          ) : (
            <>
              <p className="mt-quote-label">{rt.fx.marketRate}</p>
              <p className="mt-quote-value">
                <bdi>{nf0.format(headline)}</bdi>
                <span>{rt.fx.perDollar} <bdi>$1</bdi></span>
              </p>

              {/* Utility data, treated as utility data — one line, not a card. */}
              <p className="fx-sides">
                <span>{rt.fx.buy} <bdi>{marketBuy == null ? NA : nf2.format(marketBuy)}</bdi></span>
                <i aria-hidden="true">·</i>
                <span>{rt.fx.sell} <bdi>{marketSell == null ? NA : nf2.format(marketSell)}</bdi></span>
                <i aria-hidden="true">·</i>
                <span>{rt.fx.spread} <bdi>{theSpread ? nf2.format(theSpread.abs) : NA}</bdi></span>
              </p>

              <MetaLine freshness={fresh} />
            </>
          )}

          {/* Context, sized as context. The official rate and its gap ride on
              one line — the relationship is the point, not two headlines. */}
          <div className="fx-official">
            <span className="fx-official-label">{rt.fx.officialRate}</span>
            <span className="fx-official-value"><bdi>{nf0.format(CBI_OFFICIAL_RATE)}</bdi> {rt.fx.iqd}</span>
            <span className="fx-official-gap">
              {rt.fx.gap}{' '}
              {theGap
                ? <><bdi>{signed(theGap.abs, 1)}</bdi> {rt.fx.iqd} · <bdi>{signedPct(theGap.pct, 1)}</bdi></>
                : <bdi>{NA}</bdi>}
            </span>
          </div>
        </div>
      </section>

      {/* ═══ The converter ══════════════════════════════════════════════════ */}
      <section className="fx-convert" aria-label={rt.fx.converterLabel}>
        <div className="fx-convert-top">
          <h2>{rt.fx.convert}</h2>
          <div className="mt-seg" role="group" aria-label={rt.fx.rateUsed}>
            {CONVERT_RATES.map(r => (
              <button key={r.id} type="button"
                className={activeId === r.id ? 'is-on' : ''}
                aria-pressed={activeId === r.id}
                disabled={r.id === 'market' && marketDown}
                onClick={() => switchRate(r.id)}>
                {r.id === 'market' ? rt.fx.tabMarket : rt.fx.tabOfficial}
              </button>
            ))}
          </div>
        </div>

        <div className="fx-convert-row">
          <label className="mt-field">
            <span>{rt.fx.dollars}</span>
            <input value={usd} onChange={e => onUsd(e.target.value)} inputMode="decimal" placeholder="0" />
          </label>
          <i className="fx-eq" aria-hidden="true">=</i>
          <label className="mt-field">
            <span>{rt.fx.dinars}</span>
            <input value={iqd} onChange={e => onIqd(e.target.value)} inputMode="decimal" placeholder="0" />
          </label>
        </div>

        <p className="fx-convert-rate">
          {rt.fx.atRate(active == null ? NA : nf0.format(active))}
          {marketDown ? rt.fx.marketUnavailable : null}
        </p>
      </section>

      <div className="mt-more">
        <Disclosure label={rt.fx.whyTwo}>
          <p>
            {rt.fx.whyOfficial(nf0.format(CBI_OFFICIAL_RATE))}
          </p>
          <p>
            {rt.fx.whyMarket}
          </p>
          <p className="mt-caveat">
            {rt.fx.referenceCaveat}
          </p>
        </Disclosure>

        <Disclosure label={rt.fx.aboutSource}>
          <p>
            {rt.fx.sourceNote(SOURCES.fx.host, localeDate(CBI_RATE_CONFIRMED, locale))}
          </p>
          <p>
            {rt.fx.noDailyChange}
          </p>
          <NoHistoryNote />
        </Disclosure>
      </div>
    </main>
  )
}
