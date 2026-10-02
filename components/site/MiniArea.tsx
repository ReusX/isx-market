'use client'

import { useRef, useState } from 'react'
import { useLocale } from '@/context/LocaleContext'
import { shortDate } from '@/lib/date'

/**
 * The chart under a headline figure (identity v3, the approved board's
 * dollar page), drawn on the board's own geometry: a 560×210 frame, about
 * eight thin grid lines, a 2.5px line over a soft fill, three dates, the
 * latest point marked. Time runs right to left in Arabic, as on the board.
 *
 * Interactive: hover or touch any day for its date and value. The colour
 * follows the day's move (`tone`): green when the figure rose, red when it
 * fell, the world ink when there is no move to judge.
 */
const W = 560, H = 210, PT = 14, PB = 30, AXIS = 58, EDGE = 14

function ticksFor(lo: number, hi: number): number[] {
  const span = hi - lo || 1
  const mag = Math.pow(10, Math.floor(Math.log10(span)) - 1)
  const step = [1, 2, 2.5, 5, 10, 20, 25, 50, 100].map((m) => m * mag).find((s) => span / s <= 7) ?? span / 7
  const out: number[] = []
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(+v.toFixed(6))
  /* Always the board's eight lines: widen evenly around the data. */
  while (out.length < 8) {
    if (out.length % 2) out.push(+(out[out.length - 1] + step).toFixed(6))
    else out.unshift(+(out[0] - step).toFixed(6))
  }
  return out
}

export function MiniArea({ points, format, label, tone = 'world', dateLabel, step = false }: {
  points: { date: string; value: number }[]
  format: (v: number) => string
  label: string
  tone?: 'up' | 'down' | 'world'
  /** How a point's date is written (default: day and month); yearly series pass the year. */
  dateLabel?: (date: string) => string
  /** Draw as steps (a rate that holds until the next decision), not a slope. */
  step?: boolean
}) {
  const { locale } = useLocale()
  const svgRef = useRef<SVGSVGElement>(null)
  const [hover, setHover] = useState<number | null>(null)
  if (points.length < 2) return null

  const rtl = locale === 'ar'
  const vals = points.map((p) => p.value)
  const min = Math.min(...vals), max = Math.max(...vals)
  const pad = (max - min) * 0.12 || Math.max(1, max * 0.004)
  const ticks = ticksFor(min - pad, max + pad)
  const lo = Math.min(ticks[0], min - pad), hi = Math.max(ticks[ticks.length - 1], max + pad)
  const L = rtl ? EDGE : AXIS, R = rtl ? AXIS : EDGE
  const x = (i: number) => { const f = i / (points.length - 1); return L + (W - L - R) * (rtl ? 1 - f : f) }
  const y = (v: number) => PT + (H - PT - PB) * (1 - (v - lo) / (hi - lo))
  const line = points.map((p, i) => i === 0 ? `M${x(0).toFixed(1)},${y(p.value).toFixed(1)}`
    : step ? `L${x(i).toFixed(1)},${y(points[i - 1].value).toFixed(1)} L${x(i).toFixed(1)},${y(p.value).toFixed(1)}`
    : `L${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')
  const dl = dateLabel ?? ((d: string) => shortDate(d, locale))
  const area = `${line} L${x(points.length - 1).toFixed(1)},${H - PB} L${x(0).toFixed(1)},${H - PB} Z`
  const last = points.length - 1
  const marks = [0, Math.floor(last / 2), last]
  const at = hover ?? last

  const pick = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = svgRef.current?.getBoundingClientRect()
    if (!r) return
    const px = ((e.clientX - r.left) / r.width) * W
    let best = 0, bd = Infinity
    for (let i = 0; i < points.length; i++) { const d = Math.abs(x(i) - px); if (d < bd) { bd = d; best = i } }
    setHover(best)
  }

  /* The readout sits beside the point, on whichever side has room. */
  const tipX = x(at), tipRight = tipX > W / 2
  return (
    <div className={`mna is-${tone}`}>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}
        onPointerMove={pick} onPointerDown={pick} onPointerLeave={(e) => { if (e.pointerType !== 'touch') setHover(null) }}>
        {ticks.map((v) => (
          <g key={v}>
            <line className="mna-grid" x1={L} x2={W - R} y1={y(v)} y2={y(v)} />
            <text className="mna-tick" x={rtl ? W - 2 : 2} y={y(v) + 4} textAnchor={rtl ? 'end' : 'start'}>{format(v)}</text>
          </g>
        ))}
        <path className="mna-area" d={area} />
        <path className="mna-line" d={line} />
        {hover != null ? <line className="mna-cross" x1={tipX} x2={tipX} y1={PT} y2={H - PB} /> : null}
        <circle className="mna-dot" cx={tipX} cy={y(points[at].value)} r="6" />
        {marks.map((i) => (
          <text key={i} className="mna-date" x={x(i)} y={H - 8} textAnchor={i === 0 ? (rtl ? 'end' : 'start') : i === last ? (rtl ? 'start' : 'end') : 'middle'}>{dl(points[i].date)}</text>
        ))}
      </svg>
      {hover != null ? (
        <p className="mna-tip" style={{ [tipRight ? 'right' : 'left']: `${((tipRight ? W - tipX : tipX) / W) * 100 + 2}%` }} aria-live="polite">
          <span>{dl(points[at].date)}</span><b>{format(points[at].value)}</b>
        </p>
      ) : null}
    </div>
  )
}
