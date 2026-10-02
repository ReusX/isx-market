'use client'

import { useMemo, useState } from 'react'
import { useLocale } from '@/context/LocaleContext'
import { localeDate, shortDate } from '@/lib/date'
import { PageTitle } from './PageTitle'
import type { GoldData, FxData } from '@/lib/rates'
import { MAIN_KARATS, OUNCE_G, MITHQAL_G, goldMove, unitGrams, type GoldUnit } from '@/lib/goldPages'
import { DayChip } from './DayChip'
import { MiniArea } from './MiniArea'
import '@/styles/econ-page.css'

/**
 * The approved dollar board (FxBlocks) in gold: the framed block (the
 * page's figure with the swoosh, its move, the week chart, the calculator
 * card) and three story cards: karat, world ounce, the week.
 *
 * Shared by /gold and the four /gold/{slug} pages. `unit` and `karat` are
 * the page's own cut; `ounceLead` makes the headline the world ounce in
 * dollars (the ounce page), with the chart on 24K, the karat the ounce is
 * quoted for. The chart is the source's own «الايام السابقة» table, about a
 * week; the caption says how many days.
 */
const nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const UNITS: GoldUnit[] = ['gram', 'mithqal', 'ounce']

export function GoldBlocks({ gold, fx, title, titleNote, unit, karat = 21, ounceLead = false }: {
  gold: GoldData | null
  fx: FxData | null
  title: string
  titleNote: string
  unit: GoldUnit
  karat?: number
  ounceLead?: boolean
}) {
  const { t, locale } = useLocale()
  const R = t.rates
  const G = R.gold
  const B = R.page.gold.board
  const P = R.page.gold
  const market = fx?.sell ?? fx?.buy ?? null
  const grams = useMemo(() => (gold?.grams ?? []).filter((g) => MAIN_KARATS.includes(g.karat)).sort((a, b) => b.karat - a.karat), [gold])
  const gramOf = (k: number) => grams.find((g) => g.karat === k)?.iqd ?? null
  const mult = unitGrams(unit)
  const uName = B.unitName[unit]
  const ounceUsd = gold?.ounceSell?.usd ?? gold?.ounceBuy?.usd ?? null
  const ounceChg = gold?.ounceChange ?? null
  const ounceMove = ounceUsd != null && ounceChg != null && ounceUsd - ounceChg > 0 ? { pct: (ounceChg / (ounceUsd - ounceChg)) * 100 } : null

  const chartKarat = ounceLead ? 24 : karat
  const kMove = goldMove(gold, karat)
  /* The chart's colour follows the chart's own figure: on the ounce page the
     dollar ounce and the dinar 24K list can move opposite ways in a day. */
  const cm = goldMove(gold, chartKarat)
  const chartTone = !cm || Math.round(cm.pct * 100) === 0 ? 'world' : cm.pct > 0 ? 'up' : 'down'
  const move = ounceLead ? (ounceMove ? { pct: ounceMove.pct, prevDate: gold?.prev?.date ?? null } : null) : kMove
  const vsPrev = move?.prevDate ? R.tools.vsPrev(shortDate(move.prevDate, locale)) : null
  const dir = !move || Math.round(move.pct * 100) === 0 ? 0 : move.pct > 0 ? 1 : -1
  const lead = ounceLead ? ounceUsd : gramOf(karat) != null ? (gramOf(karat) as number) * mult : null

  /* The week, from the source's own table; today is the live list, not the
     table's row for today (the list is re-read through the day). */
  const today = gold?.date ? gold.date.replace(/\//g, '-') : null
  const week = useMemo(() => {
    const pts = (gold?.history ?? []).filter((h) => !today || h.date < today)
      .map((h) => ({ date: h.date, value: h.grams.find((g) => g.karat === chartKarat)?.iqd ?? 0 }))
      .filter((p) => p.value > 0)
    const now = (gold?.grams ?? []).find((g) => g.karat === chartKarat)?.iqd
    if (today && now) pts.push({ date: today, value: now })
    return pts.map((p) => ({ ...p, value: p.value * mult }))
  }, [gold, today, chartKarat, mult])

  /* Calculator: a weight, its unit, its karat. */
  const [w, setW] = useState('1')
  const [cUnit, setCUnit] = useState<GoldUnit>(unit)
  const [cKarat, setCKarat] = useState<number>(karat)
  const cGram = gramOf(cKarat) ?? gramOf(21) ?? 0
  const wNum = parseFloat(w.replace(/,/g, '')) || 0
  const value = wNum * unitGrams(cUnit) * cGram
  const cMove = goldMove(gold, cKarat)

  return (
    <>
    <div className="fx-frame">
    <div className="fx-board">
      <div className="fx-lead">
        <header className="eco-head fx-head">
          <PageTitle title={title} note={titleNote} className="fx-title" />
        </header>
        <p className="fx-huge id-num">
          <span className={`fx-huge-num ${dir === 0 ? '' : dir > 0 ? 'is-up' : 'is-down'}`.trim()}>
            <bdi>{lead == null ? '—' : `${ounceLead ? '$' : ''}${nf0.format(lead)}`}</bdi>
            <svg className="fx-swoosh" viewBox="0 0 200 40" preserveAspectRatio="none" aria-hidden="true">
              <path d="M4 30 C 50 10, 110 4, 196 20" pathLength={1} fill="none" stroke="currentColor" strokeWidth={5} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            </svg>
          </span>
        </p>
        <p className="fx-line">
          {move && vsPrev ? <DayChip pct={move.pct} label={vsPrev} /> : null}
          <span>{ounceLead ? B.perOunceUsd : `${B.perUnit(uName)} · ${G.karat(String(karat))}`}{vsPrev ? ` · ${vsPrev}` : ''}</span>
        </p>
        {week.length > 1 ? (
          <>
            <MiniArea points={week} format={(v) => nf0.format(v)} label={B.chartNote(uName, String(chartKarat), week.length)} tone={chartTone} />
            <p className="fx-chart-note">{B.chartNote(uName, String(chartKarat), week.length)}</p>
          </>
        ) : null}
      </div>

      {grams.length ? (
        <section className="id-print is-key fx-calc" aria-label={P.calc}>
          <h2 className="fx-calc-title">{B.calcTitle}</h2>
          <label className="fx-calc-in" htmlFor="gold-weight">
            <span>{B.weight}</span>
            <input id="gold-weight" className="id-num" inputMode="decimal" dir="ltr" value={w} onChange={(e) => setW(e.target.value)} />
          </label>
          <div className="fx-quick" role="group" aria-label={P.unit}>
            {UNITS.map((u) => <button key={u} type="button" className="fx-qbtn" aria-pressed={cUnit === u} onClick={() => setCUnit(u)}>{B.unitName[u]}</button>)}
          </div>
          <div className="fx-quick" role="group" aria-label={P.karat}>
            {grams.map((g) => <button key={g.karat} type="button" className="fx-qbtn id-num" aria-pressed={cKarat === g.karat} onClick={() => setCKarat(g.karat)}>{G.karat(String(g.karat))}</button>)}
          </div>
          <p className="fx-calc-note">{B.rateNote(String(cKarat), B.unitName[cUnit], nf0.format(cGram * unitGrams(cUnit)))}</p>
          <p className="fx-calc-out id-num"><bdi>{nf0.format(value)}</bdi> <span>{R.page.fx.calcIqd}</span></p>
          {market && value > 0 ? <p className="fx-calc-prev id-num">{B.usd(nf0.format(value / market))}</p> : null}
          {cMove && value > 0 && Math.round(wNum * unitGrams(cUnit) * cMove.abs) !== 0 ? (
            <p className="fx-calc-prev">{R.page.fx.calcVsPrev(nf0.format(Math.abs(wNum * unitGrams(cUnit) * cMove.abs)), cMove.abs < 0)}</p>
          ) : null}
        </section>
      ) : null}
    </div>
    </div>
    <div className="fx-captions">
      <p className="id-cap eco-when">
        {gold?.date ? R.tools.observedOn(localeDate(gold.date.replace(/\//g, '-'), locale)) : R.tools.noObserved}
        {' · '}{G.metalValueNote.replace(/^ — /, '')}
      </p>
    </div>

    {/* The three story cards, as on /fx: a headline with its number marked,
        what it means in your pocket, the figures behind it, «+» for why. */}
    <div className="fx-facts id-num">
      {gramOf(24) != null && gramOf(21) != null ? (() => {
        const diff = ((gramOf(24) as number) - (gramOf(21) as number)) * mult
        const head = B.karatHead(nf0.format(diff), uName)
        const top = (gramOf(24) as number) * mult
        return (
          <section className="id-print is-calm fx-fact" aria-label={P.byKarat}>
            <svg className="fx-ill" viewBox="0 0 64 64" aria-hidden="true"><path d="M8 50l8-16h32l8 16z" fill="var(--fill)" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/><path d="M18 34l6-14h16l6 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/><path d="M26 14l2-6M36 14l-2-6M44 18l4-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg>
            <h3 className="fx-fact-head">{head[0]}<em><bdi>{head[1]}</bdi></em>{head[2]}</h3>
            <p className="fx-pocket">{B.karatPocket(B.ten[unit], nf0.format(diff * 10))}</p>
            <div className="fx-bars is-wide" aria-hidden="true">
              {grams.map((g) => (
                <div key={g.karat}><span>{G.karat(String(g.karat))}</span><i style={{ width: `${((g.iqd * mult) / top) * 100}%` }} className={g.karat === karat ? 'is-market' : ''} /><b>{nf0.format(g.iqd * mult)}</b></div>
              ))}
            </div>
            <details className="fx-more"><summary aria-label={R.page.fx.facts.more}>+</summary><p>{B.karatMore}</p></details>
          </section>
        )
      })() : null}

      {ounceUsd != null ? (() => {
        const head = B.ounceHead(`$${nf0.format(ounceUsd)}`)
        return (
          <section className="id-print is-calm fx-fact" aria-label={P.published}>
            <svg className="fx-ill" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="22" fill="var(--fill)" stroke="currentColor" strokeWidth="2.5"/><path d="M10 32h44M32 10c-8 7-8 37 0 44M32 10c8 7 8 37 0 44" fill="none" stroke="currentColor" strokeWidth="2.2"/></svg>
            <h3 className="fx-fact-head">{head[0]}<em><bdi>{head[1]}</bdi></em>{head[2]}</h3>
            <p className="fx-pocket">{B.ouncePocket(nf0.format(ounceUsd / OUNCE_G), nf0.format((ounceUsd / OUNCE_G) * MITHQAL_G))}</p>
            <div className="fx-pair">
              {gold?.ounceSell ? <div><small>{G.sell}</small><b><bdi>${nf0.format(gold.ounceSell.usd)}</bdi></b></div> : null}
              {gold?.ounceBuy ? <div><small>{G.buy}</small><b><bdi>${nf0.format(gold.ounceBuy.usd)}</bdi></b></div> : null}
            </div>
            {ounceMove && ounceChg != null ? (
              <p className="fx-fact-note">{B.ounceDay} <DayChip pct={ounceMove.pct} abs={ounceChg} fmt={(v) => nf0.format(v)} unit=" $" label={B.ounceDay} /></p>
            ) : null}
            <details className="fx-more"><summary aria-label={R.page.fx.facts.more}>+</summary><p>{B.ounceMore}</p></details>
          </section>
        )
      })() : null}

      {week.length > 1 ? (() => {
        const vals = week.map((p) => p.value), lo = Math.min(...vals), hi = Math.max(...vals)
        const now = vals[vals.length - 1], pos = hi > lo ? ((now - lo) / (hi - lo)) * 100 : 50
        const d = Math.round(now - vals[0])
        const head = d === 0 ? B.weekFlat : d > 0 ? B.weekUp(nf0.format(d), uName) : B.weekDown(nf0.format(-d), uName)
        return (
          <section className="id-print is-calm fx-fact" aria-label={B.weekChange}>
            <svg className="fx-ill" viewBox="0 0 64 64" aria-hidden="true"><rect x="10" y="14" width="44" height="40" rx="4" fill="var(--fill)" stroke="currentColor" strokeWidth="2.5"/><path d="M10 26h44M22 8v10M42 8v10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/><path d="M20 44l8-8 6 5 10-10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <h3 className={`fx-fact-head ${d > 0 ? 'is-up' : d < 0 ? 'is-down' : ''}`.trim()}>{head[0]}<em><bdi>{head[1]}</bdi></em>{head[2]}</h3>
            {/* The ounce page's chart is 24K in dinars; its pocket line says so. */}
            {ounceLead ? <p className="fx-pocket">{B.chartNote(uName, '24', week.length)}</p>
              : d !== 0 ? <p className="fx-pocket">{B.weekPocket(B.ten[unit], nf0.format(Math.abs(d) * 10), d > 0)}</p> : null}
            <div className="fx-range">
              <div className="fx-range-track" aria-hidden="true"><i style={{ insetInlineStart: `${pos}%` }} /></div>
              <div className="fx-range-ends"><span><small>{R.fx.periodLow}</small> <bdi>{nf0.format(lo)}</bdi></span><span><small>{R.fx.periodHigh}</small> <bdi>{nf0.format(hi)}</bdi></span></div>
            </div>
            <details className="fx-more"><summary aria-label={R.page.fx.facts.more}>+</summary><p>{B.weekMore}</p></details>
          </section>
        )
      })() : null}

    </div>
    </>
  )
}
