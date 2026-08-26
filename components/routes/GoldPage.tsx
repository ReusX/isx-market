'use client'

import { useMemo, useState } from 'react'
import { useLocale } from '@/context/LocaleContext'
import type { Messages } from '@/lib/i18n'
import { localeDate } from '@/lib/date'
import { useApp } from '@/context/AppContext'
import {
  ToolHead, MetaLine, Disclosure, NoHistoryNote, Unavailable, PartialNotice,
} from '@/components/design/ToolChrome'
import { DitherArt } from '@/components/design/DitherArt'
import { SOURCES, sourceNote, nf0, nf2, NA, type Freshness } from '@/lib/marketTools'
import { CBI_OFFICIAL_RATE } from '@/lib/fxOfficial'
import type { GoldData, FxData } from '@/lib/rates'
import '@/styles/market-tools.css'
import '@/styles/panels.css'

/**
 * سعر الذهب — a direct port of the approved gold page.
 *
 * ── What this page is, and what the old copy claimed it was ──────────────
 * iraqgoldprice.com publishes an Iraqi price list: a per-gram price for each
 * karat, in BOTH dinars and dollars, plus an ounce buy and sell. That is a
 * LOCAL QUOTE. The product has no spot feed — no XAU source, no metals API,
 * nothing — so a page describing itself as the international spot converted at
 * the exchange rate would be describing a pipeline that does not exist. This
 * one says what is true.
 *
 * ── The units, and the arithmetic behind them ────────────────────────────
 *   gram    the source's own published figure, untouched
 *   mithqal gram × 4.608     — the traditional Iraqi unit
 *   ounce   gram × 31.1035   — the troy ounce
 * Both are a multiplication of a published number, shown with the factor
 * printed. No making charge, no jeweller margin, no local premium.
 *
 * ── The dollar column is the source's, not ours ──────────────────────────
 * Dividing the source's IQD figures by its own USD figures implies a rate near
 * the OFFICIAL 1,320 rather than the parallel market. A reader holding dollars
 * converts at the rate they can actually get, so the implied rate is printed
 * and the market-rate equivalent is shown beside it.
 *
 * ── Not built ────────────────────────────────────────────────────────────
 * No jeweller spread from the ounce buy/sell: they differ by about 0.03% and
 * the source does not document whose side is whose. Both are shown as
 * published. And no history — nothing stores yesterday's list.
 */

const MITHQAL_G = 4.608
const OUNCE_G = 31.1035
const LEAD_KARAT = 21

type UnitId = 'gram' | 'mithqal' | 'ounce'
const UNITS: { id: UnitId }[] = [
  { id: 'gram' as const },
  { id: 'mithqal' as const },
  { id: 'ounce' as const },
]
const unitGrams = (u: UnitId) => (u === 'gram' ? 1 : u === 'mithqal' ? MITHQAL_G : OUNCE_G)

/** What each karat is used for locally. Descriptive, not a rating. */
const USE: Record<number, string> = {
  24: 'useBullion', 22: 'useJewellery',
  21: 'useMostTraded', 18: 'useJewellery', 14: 'useJewellery',
}

type GoldCopy = Messages['rates']['gold']
const unitName = (id: UnitId, g: GoldCopy) =>
  id === 'gram' ? g.unitGram : id === 'mithqal' ? g.unitMithqal : g.unitOunce

export default function GoldPage({ gold, fx }: { gold: GoldData | null; fx: FxData | null }) {
  const { t: T, locale } = useLocale()
  const g = T.rates.gold
  const { theme } = useApp()
  const karats = useMemo(
    () => (gold?.grams ?? []).filter(g => g.iqd > 0).sort((a, b) => b.karat - a.karat),
    [gold])

  const [karat, setKarat] = useState<number>(() =>
    karats.some(k => k.karat === LEAD_KARAT) ? LEAD_KARAT : (karats[0]?.karat ?? LEAD_KARAT))
  const [unit, setUnit] = useState<UnitId>('gram')
  const [qty, setQty] = useState('1')

  const down = !gold || !karats.length
  const marketRate = fx?.sell ?? fx?.buy ?? null
  const fxDown = marketRate == null

  const fresh: Freshness = useMemo(() => ({
    observed: gold?.date ?? null, stale: false, source: SOURCES.gold,
  }), [gold])

  const sel = karats.find(k => k.karat === karat) ?? karats[0]
  const unitMeta = UNITS.find(u => u.id === unit)!
  const unitPrice = (k: { iqd: number }) => k.iqd * unitGrams(unit)

  const n = parseFloat(qty)
  const calcTotal = sel && Number.isFinite(n) ? unitPrice(sel) * n : null

  /** The rate the source's own two columns imply. Division, both inputs real. */
  const impliedRate = useMemo(() => {
    const usable = karats.filter(k => k.usd > 0 && k.iqd > 0)
    if (!usable.length) return null
    const rates = usable.map(k => k.iqd / k.usd).sort((a, b) => a - b)
    return rates[Math.floor(rates.length / 2)]
  }, [karats])

  return (
    <main className="mt-page gd-page iq-page">
      <ToolHead title={g.pageTitle} freshness={fresh} unavailable={down} actions={null} />

      {!down && fxDown ? (
        <PartialNotice>
          {g.fxDownNote}
        </PartialNotice>
      ) : null}

      {down ? (
        <Unavailable
          what={g.unavailableWhat}
          why={g.unavailableWhy}
          source={SOURCES.gold}
        />
      ) : (
        <>
          {/* ═══ Hero · one karat, one unit, one number ═════════════════════ */}
          <section className="mt-hero" aria-label={g.heroLabel}>
            <div className="mt-art"><DitherArt scene="gold" theme={theme === 'dark' ? 'dark' : 'light'} /></div>

            <div className="mt-quote">
              <p className="mt-quote-label">
                {g.karat(String(sel.karat))}
                {sel.karat === LEAD_KARAT ? <em> · {g.mostTraded}</em> : null}
              </p>
              <p className="mt-quote-value">
                <bdi>{nf0.format(unitPrice(sel))}</bdi>
                <span>{g.perUnit(unitName(unit, g))}</span>
              </p>

              {/* The unit switch sits directly under the number it changes. */}
              <div className="mt-seg gd-units" role="group" aria-label={g.unitGroup}>
                {UNITS.map(u => (
                  <button key={u.id} type="button"
                    className={unit === u.id ? 'is-on' : ''}
                    aria-pressed={unit === u.id}
                    onClick={() => setUnit(u.id)}>
                    {unitName(u.id, g)}
                  </button>
                ))}
              </div>

              <MetaLine
                freshness={fresh}
                extra={
                  <span className="gd-kind" title={g.localKindTitle}>
                    {g.localKind}
                  </span>
                }
              />
            </div>
          </section>

          {/* ═══ Karat strip · a list, not a table ══════════════════════════ */}
          <section className="gd-strip" aria-label={g.byKaratLabel}>
            <div className="gd-strip-head">
              <h2>{g.byKarat}</h2>
              <span>{g.inUnit(unitName(unit, g))}</span>
            </div>
            <ul>
              {karats.map(k => (
                <li key={k.karat} className={k.karat === sel.karat ? 'is-on' : ''}>
                  <button type="button" onClick={() => setKarat(k.karat)}
                    aria-pressed={k.karat === sel.karat}>
                    <span className="gd-strip-k">
                      {g.karat(String(k.karat))}
                      {k.karat === LEAD_KARAT ? <em>{USE[k.karat] ?? ''}</em> : null}
                    </span>
                    <bdi className="gd-strip-v">{nf0.format(unitPrice(k))}</bdi>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {/* ═══ Calculator ════════════════════════════════════════════════ */}
          <section className="gd-calc" aria-label={g.calcLabel}>
            <div className="gd-calc-top">
              <h2>{g.weightCalc}</h2>
              <label className="mt-field is-inline">
                <span>{g.amountIn(unitName(unit, g))}</span>
                <input value={qty} inputMode="decimal" placeholder="0"
                  onChange={e => setQty(e.target.value.replace(/[^\d.]/g, ''))} />
              </label>
            </div>
            <p className="gd-calc-value">
              <bdi>{calcTotal == null ? NA : nf0.format(Math.round(calcTotal))}</bdi>
              <span>{g.iqd}</span>
            </p>
            <p className="gd-calc-note">
              {g.karatIn(String(sel.karat), unitName(unit, g))}
              {!fxDown && calcTotal != null && marketRate
                ? <> · ≈ <bdi>${nf2.format(calcTotal / marketRate)}</bdi> {g.atMarketRate}</>
                : null}
              {g.metalValueNote}
            </p>
          </section>

          <div className="mt-more">
            <Disclosure label={g.priceInfo}>
              <p>
                {g.localListNote(String(MITHQAL_G), String(OUNCE_G))}
              </p>
              {impliedRate ? (
                <p>
                  {g.impliedRateNote(nf0.format(impliedRate), nf0.format(CBI_OFFICIAL_RATE), marketRate ? nf0.format(marketRate) : '')}
                </p>
              ) : null}
              <p className="gd-usd-row">
                {g.karatPrice(String(sel.karat), unitName(unit, g), nf0.format(unitPrice(sel)))}
                {sel.usd > 0 ? <>{g.sourceFigure(`$${nf0.format(sel.usd * unitGrams(unit))}`)}</> : null}
                {marketRate ? <>{g.atMarket(`$${nf0.format(unitPrice(sel) / marketRate)}`)}</> : null}
              </p>
            </Disclosure>

            {gold?.ounceSell || gold?.ounceBuy ? (
              <Disclosure label={g.ounceAsPublished}>
                {/* Neither side coloured. The old page painted شراء green, which
                    reads as "up" everywhere else — this is a price, not a change. */}
                <p className="gd-ounce">
                  <span>{g.ounceSell} <bdi>{gold.ounceSell ? nf0.format(gold.ounceSell.iqd) : NA}</bdi> {g.iqd}</span>
                  <i aria-hidden="true">·</i>
                  <span>{g.ounceBuy} <bdi>{gold.ounceBuy ? nf0.format(gold.ounceBuy.iqd) : NA}</bdi> {g.iqd}</span>
                </p>
                <p>
                  {g.ounceSideNote}
                </p>
              </Disclosure>
            ) : null}

            <Disclosure label={g.aboutSource}>
              <p>
                {SOURCES.gold.host} · {sourceNote(SOURCES.gold, locale)}.
                {!fxDown ? <>{g.fxSourceNote(SOURCES.fx.host)}</> : null}
              </p>
              <NoHistoryNote />
            </Disclosure>
          </div>
        </>
      )}
    </main>
  )
}
