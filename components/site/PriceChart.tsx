'use client'

import { useMemo, useState } from 'react'
import { useLocale } from '@/context/LocaleContext'
import { shortDate, localeDate } from '@/lib/date'

/**
 * One company's closes, drawn to scale.
 *
 * The same idiom as site/IndexChart — a plain SVG line, no library, no
 * smoothing, every point a real close — but for a company rather than the
 * index, so it carries none of IndexChart's index semantics (no ISX60/RSISX
 * switch, no rebase floor, no /charts link).
 *
 * What a reader actually uses: the range, the first close of the range as a
 * dotted baseline so above/below reads at a glance, the period's high and
 * low marked where they happened, value gridlines, date labels, and a
 * crosshair reporting the exact close on hover.
 *
 * ⚠ Points are the server's — the page seeds this from `loadCompany`, so the
 * line exists in the HTML. It never fetches.
 */
export type ClosePoint = { date: string; close: number }
type Range = 'm1' | 'm3' | 'y1' | 'y3' | 'all'

const DAYS: Record<Range, number> = { m1: 31, m3: 92, y1: 366, y3: 3 * 366, all: Infinity }
const PT = 18, PB = 28, PL = 8, PR = 60

function niceTicks(lo: number, hi: number): number[] {
  const span = hi - lo || 1
  const mag = Math.pow(10, Math.floor(Math.log10(span / 4)))
  for (const m of [1, 2, 2.5, 5, 10, 20, 25, 50]) {
    const step = m * mag
    const first = Math.ceil(lo / step) * step
    const n = Math.floor((hi - first) / step) + 1
    if (n >= 3 && n <= 5) return Array.from({ length: n }, (_, i) => +(first + i * step).toFixed(6))
  }
  const step = span / 4
  return [1, 2, 3].map((i) => +(lo + i * step).toFixed(4))
}

export function PriceChart({ points, label }: { points: ClosePoint[]; label: string }) {
  const { t, locale } = useLocale()
  const C = t.company.chart
  const [range, setRange] = useState<Range>('y1')
  const [hover, setHover] = useState<number | null>(null)

  const pts = useMemo(() => {
    if (!points.length) return []
    if (DAYS[range] === Infinity) return points
    const last = points[points.length - 1].date
    const since = new Date(new Date(last).getTime() - DAYS[range] * 86400_000).toISOString().slice(0, 10)
    const win = points.filter((p) => p.date >= since)
    return win.length > 1 ? win : points.slice(-2)
  }, [points, range])

  if (pts.length < 2) return <p className="id-note">{C.noSeries}</p>

  const W = 900, H = 320
  const lows = pts.map((p) => p.close)
  const lo = Math.min(...lows), hi = Math.max(...lows)
  const pad = (hi - lo) * 0.08 || Math.max(0.01, hi * 0.02)
  const yLo = lo - pad, yHi = hi + pad
  const x = (i: number) => PL + (i / (pts.length - 1)) * (W - PL - PR)
  const y = (v: number) => PT + (1 - (v - yLo) / (yHi - yLo || 1)) * (H - PT - PB)
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.close).toFixed(1)}`).join(' ')
  const area = `${line} L${x(pts.length - 1).toFixed(1)},${H - PB} L${x(0).toFixed(1)},${H - PB} Z`
  const first = pts[0].close
  const lastP = pts[pts.length - 1].close
  const up = lastP >= first
  const hiI = lows.indexOf(hi), loI = lows.indexOf(lo)
  const ticks = niceTicks(yLo, yHi)
  const shown = hover != null ? pts[hover] : pts[pts.length - 1]
  const nf = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  /* About six date labels, each the real date of the point beneath it. */
  const labels: { i: number; label: string }[] = []
  const n = Math.min(6, pts.length)
  const long = range === 'y1' || range === 'y3' || range === 'all'
  for (let k = 0; k < n; k++) {
    const i = Math.round((k / (n - 1)) * (pts.length - 1))
    labels.push({ i, label: shortDate(pts[i].date, locale) + (long ? ` ${pts[i].date.slice(0, 4)}` : '') })
  }

  return (
    <div className="cmp-chart">
      <div className="cmp-chart-head">
        <p className="cmp-read id-num">
          <strong>{nf.format(shown.close)}</strong>
          <span className="id-cap">{localeDate(shown.date, locale)}</span>
        </p>
        <div className="id-pills" role="group" aria-label={C.range}>
          {(['m1', 'm3', 'y1', 'y3', 'all'] as const).map((r) => (
            <button key={r} type="button" className="id-pill is-sm" aria-pressed={range === r}
              onClick={() => { setRange(r); setHover(null) }}>{C.ranges[r]}</button>
          ))}
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="cmp-svg id-num" role="img" aria-label={label}
        onPointerLeave={() => setHover(null)}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          const rel = (e.clientX - r.left) / r.width * W
          const i = Math.round(((rel - PL) / (W - PL - PR)) * (pts.length - 1))
          setHover(Math.max(0, Math.min(pts.length - 1, i)))
        }}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={PL} x2={W - PR} y1={y(v)} y2={y(v)} className="cmp-grid" />
            <text x={W - PR + 8} y={y(v)} className="cmp-tick">{nf.format(v)}</text>
          </g>
        ))}
        {/* The range's opening close, dotted — so above or below it reads at a glance. */}
        <line x1={PL} x2={W - PR} y1={y(first)} y2={y(first)} className="cmp-base" />
        <path d={area} className={`cmp-area ${up ? 'is-up' : 'is-down'}`} />
        <path d={line} className={`cmp-line ${up ? 'is-up' : 'is-down'}`} />
        <circle cx={x(hiI)} cy={y(hi)} r="3" className="cmp-hi" />
        <circle cx={x(loI)} cy={y(lo)} r="3" className="cmp-lo" />
        {labels.map((l) => <text key={l.i} x={x(l.i)} y={H - 8} className="cmp-xlabel">{l.label}</text>)}
        {hover != null ? (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={PT} y2={H - PB} className="cmp-cross" />
            <circle cx={x(hover)} cy={y(pts[hover].close)} r="4" className="cmp-dot" />
          </g>
        ) : null}
      </svg>
    </div>
  )
}
