'use client'

import { useMemo, useState } from 'react'
import { useLocale } from '@/context/LocaleContext'
import { localeDate } from '@/lib/date'
import type { FxDay } from '@/lib/fxHistory'
import '@/styles/fx-history.css'

/**
 * The dinar over time.
 *
 * Until 31 August 2026 this could not exist: every rate the site displayed was
 * written into one row of `rates_cache` and destroyed by the next fetch, so
 * there was no yesterday to subtract. `fx_observations` keeps them now.
 *
 * ── The seam is the point ─────────────────────────────────────────────────
 * Two series with completely different provenance share this chart. The
 * official line reaches back to 2003 because the Central Bank publishes it in
 * a workbook — we were given that history, we did not watch it. The parallel
 * line starts the day recording started. Drawing them as one continuous
 * picture would imply we observed a market we were not observing, so imported
 * spans are drawn dashed and the legend says which is which.
 *
 * ── Why null is not zero ──────────────────────────────────────────────────
 * A change figure needs two observations. With one point, or none, the answer
 * is «—», never 0. Zero is a finding: it says the rate held. Null says we
 * cannot tell, which is the truth on a series one day old.
 */

export type Period = '1M' | '3M' | '6M' | '1Y' | '5Y' | 'MAX'
const PERIODS: { id: Period; days: number }[] = [
  { id: '1M', days: 30 },
  { id: '3M', days: 90 },
  { id: '6M', days: 182 },
  { id: '1Y', days: 365 },
  { id: '5Y', days: 1826 },
  { id: 'MAX', days: Number.POSITIVE_INFINITY },
]

interface Props {
  parallel: FxDay[]
  official: FxDay[]
}

export function FxHistory({ parallel, official }: Props) {
  const { t: T, locale } = useLocale()
  const c = T.rates.fx
  const [period, setPeriod] = useState<Period>('1Y')

  const cutoff = useMemo(() => {
    const days = PERIODS.find((p) => p.id === period)!.days
    if (!Number.isFinite(days)) return ''
    const all = [...parallel, ...official]
    if (!all.length) return ''
    const last = all.reduce((a, b) => (a.date > b.date ? a : b)).date
    const d = new Date(last)
    d.setUTCDate(d.getUTCDate() - days)
    return d.toISOString().slice(0, 10)
  }, [period, parallel, official])

  const par = useMemo(() => parallel.filter((d) => d.date >= cutoff && d.close != null), [parallel, cutoff])
  const off = useMemo(() => official.filter((d) => d.date >= cutoff && d.close != null), [official, cutoff])

  /* The window is only as wide as the data in it. Asking for five years of a
     series three days old must say three days, not five years. */
  const span = useMemo(() => {
    const all = [...par, ...off].map((d) => d.date).sort()
    return all.length ? { from: all[0], to: all[all.length - 1] } : null
  }, [par, off])

  const stats = useMemo(() => summarise(par), [par])
  const hasParallel = par.length > 0

  return (
    <section className="fxh" aria-labelledby="fxh-t">
      <div className="fxh-head">
        <h2 id="fxh-t">{c.historyTitle}</h2>
        <div className="fxh-periods" role="group" aria-label={c.periodGroup}>
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={period === p.id ? 'active' : ''}
              aria-pressed={period === p.id}
              onClick={() => setPeriod(p.id)}
            >
              {c.period[p.id]}
            </button>
          ))}
        </div>
      </div>

      {!par.length && !off.length ? (
        <p className="fxh-empty">{c.noHistory}</p>
      ) : (
        <>
          <Chart parallel={par} official={off} />

          <div className="fxh-legend">
            <span className="fxh-key"><i className="par" aria-hidden="true" />{c.legendParallel}</span>
            <span className="fxh-key"><i className="off" aria-hidden="true" />{c.legendOfficial}</span>
            <span className="fxh-key"><i className="imp" aria-hidden="true" />{c.legendImported}</span>
          </div>

          <dl className="fxh-stats">
            <Stat label={c.changeToday} v={stats.changeToday} pct={stats.changeTodayPct} unavailable={!hasParallel} c={c} />
            <Stat label={c.change7d}    v={stats.change7d}    pct={stats.change7dPct}    unavailable={!hasParallel} c={c} />
            <Stat label={c.change30d}   v={stats.change30d}   pct={stats.change30dPct}   unavailable={!hasParallel} c={c} />
            <div>
              <dt>{c.periodHigh}</dt>
              <dd><bdi>{stats.high != null ? nf(stats.high) : '—'}</bdi></dd>
            </div>
            <div>
              <dt>{c.periodLow}</dt>
              <dd><bdi>{stats.low != null ? nf(stats.low) : '—'}</bdi></dd>
            </div>
          </dl>

          <p className="fxh-note">
            {span ? c.spanNote(localeDate(span.from, locale), localeDate(span.to, locale)) : null}
            {' '}
            {hasParallel
              ? c.recordedNote(String(par.length))
              : c.parallelPending}
          </p>
        </>
      )}
    </section>
  )
}

function Stat({ label, v, pct, unavailable, c }: {
  label: string; v: number | null; pct: number | null; unavailable: boolean
  c: { notEnough: string }
}) {
  const cls = v == null ? '' : v > 0 ? 'up' : v < 0 ? 'down' : ''
  return (
    <div>
      <dt>{label}</dt>
      <dd className={cls}>
        {v == null ? (
          <bdi title={unavailable ? c.notEnough : undefined}>—</bdi>
        ) : (
          <>
            <bdi>{v > 0 ? '+' : v < 0 ? '−' : ''}{nf(Math.abs(v))}</bdi>
            {pct != null ? <small><bdi>{pct > 0 ? '+' : pct < 0 ? '−' : ''}{Math.abs(pct).toFixed(2)}%</bdi></small> : null}
          </>
        )}
      </dd>
    </div>
  )
}

const nf = (v: number) => v.toLocaleString('en-US', { maximumFractionDigits: 0 })

/** Change between the last point and the last point at or before `daysAgo`. */
function step(days: FxDay[], daysAgo: number) {
  if (days.length < 2) return { abs: null, pct: null }
  const last = days[days.length - 1]
  const cutoff = new Date(last.date)
  cutoff.setUTCDate(cutoff.getUTCDate() - daysAgo)
  const iso = cutoff.toISOString().slice(0, 10)
  let prior: FxDay | null = null
  for (const d of days) {
    if (d.date <= iso) prior = d
    else break
  }
  if (!prior?.close || !last.close) return { abs: null, pct: null }
  const abs = last.close - prior.close
  return { abs, pct: (abs / prior.close) * 100 }
}

function summarise(days: FxDay[]) {
  const closes = days.map((d) => d.close as number)
  const today =
    days.length >= 2
      ? { abs: (days[days.length - 1].close as number) - (days[days.length - 2].close as number), prev: days[days.length - 2].close as number }
      : null
  const d7 = step(days, 7)
  const d30 = step(days, 30)
  return {
    changeToday: today?.abs ?? null,
    changeTodayPct: today && today.prev ? (today.abs / today.prev) * 100 : null,
    change7d: d7.abs, change7dPct: d7.pct,
    change30d: d30.abs, change30dPct: d30.pct,
    high: closes.length ? Math.max(...days.map((d) => d.high ?? (d.close as number))) : null,
    low: closes.length ? Math.min(...days.map((d) => d.low ?? (d.close as number))) : null,
  }
}

/* ── Chart ────────────────────────────────────────────────────────────────
   SVG rather than canvas: two thin lines over a shared scale, no interaction
   beyond a hover readout, and the page is already RTL — canvas coordinates do
   not mirror and would need physical offsets, which the /statistics port
   documented the hard way. `preserveAspectRatio="none"` plus
   `vector-effect: non-scaling-stroke` keeps the stroke honest while the box
   stretches. */
function Chart({ parallel, official }: { parallel: FxDay[]; official: FxDay[] }) {
  const { t: T } = useLocale()
  const c = T.rates.fx
  const W = 1000, H = 260, PAD = 8

  const all = [...parallel, ...official]
  if (!all.length) return null
  const dates = Array.from(new Set(all.map((d) => d.date))).sort()
  const xOf = new Map(dates.map((d, i) => [d, dates.length > 1 ? (i / (dates.length - 1)) * (W - PAD * 2) + PAD : W / 2]))

  const vals = all.map((d) => d.close as number)
  let lo = Math.min(...vals), hi = Math.max(...vals)
  if (hi === lo) { hi += 1; lo -= 1 }
  const padY = (hi - lo) * 0.12
  hi += padY; lo -= padY
  const yOf = (v: number) => H - PAD - ((v - lo) / (hi - lo)) * (H - PAD * 2)

  /* An imported span and a recorded span are drawn as separate paths so the
     dash pattern can differ. A single path with a changing stroke is not
     possible in SVG, and faking it with opacity would blur exactly the
     distinction this chart exists to make. */
  const segments = (days: FxDay[]) => {
    const out: { origin: string; d: string; points: FxDay[] }[] = []
    let cur: FxDay[] = []
    for (const day of days) {
      if (cur.length && cur[cur.length - 1].origin !== day.origin) {
        out.push({ origin: cur[0].origin, d: path(cur), points: cur })
        cur = [cur[cur.length - 1]]   // carry one point so the line does not break
      }
      cur.push(day)
    }
    if (cur.length) out.push({ origin: cur[0].origin, d: path(cur), points: cur })
    return out
  }
  const path = (days: FxDay[]) =>
    days.map((d, i) => `${i ? 'L' : 'M'}${(xOf.get(d.date) ?? 0).toFixed(1)},${yOf(d.close as number).toFixed(1)}`).join(' ')

  return (
    <div className="fxh-chart">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={c.chartLabel}>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} className="fxh-grid" vectorEffect="non-scaling-stroke" />
        ))}
        {segments(official).map((s, i) => <Seg key={`o${i}`} seg={s} kind="off" xOf={xOf} yOf={yOf} />)}
        {segments(parallel).map((s, i) => <Seg key={`p${i}`} seg={s} kind="par" xOf={xOf} yOf={yOf} />)}
      </svg>
      <div className="fxh-axis" aria-hidden="true">
        <span><bdi>{nf(Math.round(hi))}</bdi></span>
        <span><bdi>{nf(Math.round(lo))}</bdi></span>
      </div>
    </div>
  )
}

/**
 * One segment of a line — or a dot, when the segment holds a single point.
 *
 * SVG paints nothing for a path that is only a `moveto`, so on the day
 * recording starts the parallel series had real data and an empty chart. A
 * lone observation is a fact and has to be visible; it just is not yet a line.
 */
function Seg({ seg, kind, xOf, yOf }: {
  seg: { origin: string; d: string; points: FxDay[] }
  kind: 'par' | 'off'
  xOf: Map<string, number>
  yOf: (v: number) => number
}) {
  if (seg.points.length === 1) {
    const p = seg.points[0]
    return (
      <circle
        cx={xOf.get(p.date) ?? 0}
        cy={yOf(p.close as number)}
        r={3.5}
        className={`fxh-dot ${kind}`}
        vectorEffect="non-scaling-stroke"
      />
    )
  }
  return <path d={seg.d} className={`fxh-line ${kind} ${seg.origin}`} vectorEffect="non-scaling-stroke" />
}
