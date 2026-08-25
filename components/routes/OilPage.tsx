'use client'

import { useMemo, useState } from 'react'
import { useLocale } from '@/context/LocaleContext'
import { useApp } from '@/context/AppContext'
import {
  ToolHead, MetaLine, Disclosure, NoHistoryNote, Unavailable, PartialNotice,
} from '@/components/design/ToolChrome'
import { DitherArt } from '@/components/design/DitherArt'
import {
  SOURCES, nf0, nf2, signed, signedPct, NA, agePhrase, today, daysBetween,
  type Freshness,
} from '@/lib/marketTools'
import {
  BLEND_DEFS, REGION_LABEL, HERO_KEY, REFERENCE_KEY, differential, iqdPerBarrel,
  type Region,
} from '@/lib/oilBlends'
import { CBI_OFFICIAL_RATE } from '@/lib/fxOfficial'
import type { OilData, OilBlend, FxData } from '@/lib/rates'
import '@/styles/market-tools.css'
import '@/styles/panels.css'

/**
 * سعر النفط — a direct port of the approved oil page.
 *
 * Iraq leads, and honestly: `Basrah-Heavy` and `Basrah-Medium` are real rows on
 * oilprice.com. Brent sits beside the hero because the differential between
 * them — Basrah minus Brent — is the single most Iraq-relevant fact this data
 * supports, and it is subtraction with both inputs on screen.
 *
 * ── Two defects the old page had ─────────────────────────────────────────
 * It rendered «مباشر» with a green dot in a card that also read «أسعار بتأخير
 * بسيط» — two contradictory claims about the same numbers, six lines apart.
 * And it collapsed every blend to one timestamp taken from `Math.max(...stamps)`,
 * so a four-day-old Iran Heavy quote inherited Brent's freshness. The source
 * stamps EACH blend, and here each row carries its own.
 *
 * ── Not built ────────────────────────────────────────────────────────────
 * No comparison against the Iraqi budget oil assumption, no export price, no
 * volume, no revenue: none of those exist anywhere in the product, and a
 * comparison without a real second number is not a comparison. No history —
 * nothing stores yesterday's table. The daily change and percent ARE shown,
 * because the source publishes them per blend.
 */

type RateId = 'market' | 'official'

/** The row as rendered: the source's numbers plus this page's presentation. */
type Row = OilBlend & { ar: string; en: string; region: Region; flag: string }

/** The source stamps each blend; that stamp is the observation, not our fetch. */
function freshnessFor(b: Row, stale = false): Freshness {
  const iso = b.stamp ? new Date(b.stamp * 1000).toISOString() : null
  return {
    observed: iso ? iso.slice(0, 10) : null,
    clock: iso ? iso.slice(11, 16) : null,
    stale,
    source: SOURCES.oil,
  }
}

function Age({ b }: { b: Row }) {
  const { t: T, locale } = useLocale()
  const o = T.rates.oil
  if (!b.stamp) return <span className="mv-dash">{NA}</span>
  const iso = new Date(b.stamp * 1000).toISOString().slice(0, 10)
  const age = daysBetween(iso, today())
  return <span title={iso}>{age <= 0 ? o.today : agePhrase(age, T.rates.tools, locale)}</span>
}

export default function OilPage({ oil, fx }: { oil: OilData | null; fx: FxData | null }) {
  const { t: T, locale } = useLocale()
  const o = T.rates.oil
  const { theme } = useApp()
  const [barrels, setBarrels] = useState('1000')
  const [iqdRate, setIqdRate] = useState<RateId>('market')

  const rows: Row[] = useMemo(() => {
    const bySlug = new Map((oil?.blends ?? []).map(b => [b.key, b]))
    return BLEND_DEFS
      .map(d => {
        const b = bySlug.get(d.key)
        return b && b.usd > 0 ? { ...b, ar: d.ar, en: d.en, region: d.region, flag: d.flag } : null
      })
      .filter(Boolean) as Row[]
  }, [oil])

  const hero = rows.find(b => b.key === HERO_KEY) ?? rows.find(b => b.region === 'iraq') ?? rows[0]
  const brent = rows.find(b => b.key === REFERENCE_KEY) ?? null
  const down = !oil || !rows.length

  const marketRate = fx?.sell ?? fx?.buy ?? null
  const fxDown = marketRate == null
  const rate = fxDown ? null : iqdRate === 'market' ? marketRate : CBI_OFFICIAL_RATE
  const rateLabel = iqdRate === 'market' ? o.marketRate : o.officialRate

  const n = parseFloat(barrels)
  const usdTotal = hero && Number.isFinite(n) ? hero.usd * n : 0
  const iqdTotal = iqdPerBarrel(usdTotal, rate)

  // The bars start above zero so dollar-level differences between crudes are
  // visible; a zero-based bar makes eleven near-identical blends look identical.
  const scale = useMemo(() => {
    const vals = rows.map(b => b.usd)
    if (!vals.length) return { floor: 0, span: 1 }
    const lo = Math.min(...vals), hi = Math.max(...vals)
    const floor = Math.max(0, Math.floor((lo - (hi - lo) * 0.35) / 5) * 5)
    return { floor, span: Math.max(hi - floor, 1) }
  }, [rows])
  const pctOf = (usd: number) => Math.max(2, ((usd - scale.floor) / scale.span) * 100)

  const strip = useMemo(
    () => rows.filter(b => b.region === 'iraq' || b.key === REFERENCE_KEY || b.key === 'WTI-Crude' || b.key === 'Opec-Basket'),
    [rows])

  const diff = hero && brent ? differential(hero, brent) : null

  return (
    <main className="mt-page ol-page iq-page">
      <ToolHead
        title={o.pageTitle}
        freshness={hero ? freshnessFor(hero) : { observed: null, stale: true, source: SOURCES.oil }}
        unavailable={down}
        actions={null}
      />

      {!down && fxDown ? (
        <PartialNotice>
          {o.fxDownNote}
        </PartialNotice>
      ) : null}

      {down || !hero ? (
        <Unavailable
          what={o.unavailableWhat}
          why={o.unavailableWhy}
          source={SOURCES.oil}
        />
      ) : (
        <>
          {/* ═══ Hero · Basrah, with Brent as immediate context ═════════════ */}
          <section className="mt-hero" aria-label={o.basrahHeroLabel}>
            <div className="mt-art"><DitherArt scene="oil" theme={theme === 'dark' ? 'dark' : 'light'} /></div>

            <div className="mt-quote">
              <p className="mt-quote-label">
                <span className="ol-flag" aria-hidden="true">{hero.flag}</span>
                {locale === 'ar' ? hero.ar : hero.en}
              </p>
              <p className="mt-quote-value">
                <bdi>${nf2.format(hero.usd)}</bdi>
                <span>{o.barrelShort}</span>
              </p>
              <p className={`ol-change ${hero.pct > 0 ? 'is-up' : hero.pct < 0 ? 'is-down' : ''}`}>
                <bdi>{signed(hero.change)}</bdi>
                <bdi>{signedPct(hero.pct)}</bdi>
              </p>
              <MetaLine freshness={freshnessFor(hero)} extra={o.assessmentNote} />

              {brent ? (
                <div className="ol-vs-brent">
                  <span>{o.brent} <bdi>${nf2.format(brent.usd)}</bdi></span>
                  <span className="ol-vs-gap">
                    {o.differential} <bdi className={diff && diff.abs < 0 ? 'is-down' : 'is-up'}>
                      ${diff ? signed(diff.abs) : NA}
                    </bdi>
                  </span>
                </div>
              ) : null}
            </div>
          </section>

          {/* ═══ The comparison, as bars ═══════════════════════════════════ */}
          <section className="ol-strip" aria-label={o.compareLabel}>
            <div className="ol-strip-head">
              <h2>{o.whereIraqi}</h2>
              <span>{o.usdPerBarrel}</span>
            </div>
            <ul>
              {strip.map(b => (
                <li key={b.key} className={b.region === 'iraq' ? 'is-iraq' : ''}>
                  <span className="ol-bar-name">
                    <span className="ol-flag" aria-hidden="true">{b.flag}</span>
                    {locale === 'ar' ? b.ar : b.en}
                  </span>
                  <span className="ol-bar-track">
                    <span className="ol-bar-fill" style={{ inlineSize: `${pctOf(b.usd)}%` }} />
                  </span>
                  <bdi className="ol-bar-val">{nf2.format(b.usd)}</bdi>
                </li>
              ))}
            </ul>
            <p className="ol-strip-note">
              {o.scaleNote(`$${nf0.format(scale.floor)}`)}
            </p>
          </section>

          {/* ═══ Calculator · secondary, one line ══════════════════════════ */}
          <section className="ol-calc" aria-label={o.calcLabel}>
            <div className="ol-calc-row">
              <label className="mt-field is-inline">
                <span>{o.barrelsOf(locale === 'ar' ? hero.ar : hero.en)}</span>
                <input value={barrels} inputMode="decimal" placeholder="0"
                  onChange={e => setBarrels(e.target.value.replace(/[^\d.]/g, ''))} />
              </label>
              <p className="ol-calc-value"><bdi>${nf2.format(usdTotal)}</bdi></p>
            </div>
            <p className="ol-calc-note">
              {iqdTotal == null || rate == null
                ? o.noRate
                : <>{o.iqdTotal(nf0.format(iqdTotal), rateLabel, nf0.format(rate))}</>}
            </p>
          </section>

          {/* ═══ Reference data, behind a tap ══════════════════════════════ */}
          <div className="mt-more">
            <Disclosure label={o.allBlends}>
              <div className="ol-rate-row" role="group" aria-label={o.rateUsed}>
                <span>{o.dinarAt}</span>
                <div className="mt-seg">
                  {([['market', o.marketRate], ['official', o.officialRate]] as const).map(([id, label]) => (
                    <button key={id} type="button" disabled={fxDown}
                      className={!fxDown && iqdRate === id ? 'is-on' : ''}
                      aria-pressed={!fxDown && iqdRate === id}
                      onClick={() => setIqdRate(id)}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mv-board-scroll ol-scroll">
                <table className="mv-table ol-table">
                  <thead>
                    <tr>
                      <th scope="col" className="ol-col-blend">{o.colBlend}</th>
                      <th scope="col" className="mv-col-num">{o.colUsd}</th>
                      <th scope="col" className="mv-col-num">%</th>
                      <th scope="col" className="mv-col-num">{o.colVsBrent}</th>
                      <th scope="col" className="mv-col-num ol-col-iqd">{o.colIqd}</th>
                      <th scope="col" className="ol-col-when">{o.colWhen}</th>
                    </tr>
                  </thead>
                  {(['iraq', 'benchmark', 'regional'] as const).map(region => (
                    rows.some(b => b.region === region) ? (
                      <tbody key={region}>
                        <tr className="ol-group">
                          <th scope="colgroup" colSpan={6}>{REGION_LABEL[region][locale]}</th>
                        </tr>
                        {rows.filter(b => b.region === region).map(b => {
                          const d = brent ? differential(b, brent) : null
                          const iqd = iqdPerBarrel(b.usd, rate)
                          return (
                            <tr key={b.key} className="ol-row">
                              <td className="mv-col-company ol-col-blend">
                                <span className="ol-blend-id">
                                  <span className="ol-flag" aria-hidden="true">{b.flag}</span>
                                  <strong>{locale === 'ar' ? b.ar : b.en}</strong>
                                </span>
                              </td>
                              <td className="mv-col-num ol-price"><bdi>{nf2.format(b.usd)}</bdi></td>
                              <td className={`mv-col-num ${b.pct > 0 ? 'is-up' : b.pct < 0 ? 'is-down' : ''}`}>
                                <bdi>{signedPct(b.pct)}</bdi>
                              </td>
                              <td className="mv-col-num ol-vs">
                                {b.key === REFERENCE_KEY
                                  ? <span className="ol-ref">{o.reference}</span>
                                  : d ? <bdi className={d.abs < 0 ? 'is-down' : 'is-up'}>{signed(d.abs)}</bdi>
                                      : <span className="mv-dash">{NA}</span>}
                              </td>
                              <td className="mv-col-num ol-col-iqd">
                                <bdi>{iqd == null ? NA : nf0.format(iqd)}</bdi>
                              </td>
                              <td className="ol-col-when"><Age b={b} /></td>
                            </tr>
                          )
                        })}
                      </tbody>
                    ) : null
                  ))}
                </table>
              </div>
              <p className="mt-caveat">
                {o.perBlendTime}
              </p>
            </Disclosure>

            <Disclosure label={o.aboutSource}>
              <p>
                {o.sourceNote(SOURCES.oil.host, SOURCES.oil.note)}
              </p>
              <p>
                {o.noBudgetCompare}
              </p>
              <NoHistoryNote />
            </Disclosure>
          </div>
        </>
      )}
    </main>
  )
}
