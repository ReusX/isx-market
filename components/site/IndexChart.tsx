'use client'

import { useMemo, useRef, useState } from 'react'
import { useLocale } from '@/context/LocaleContext'
import { shortDate } from '@/lib/date'

/**
 * The ISX60, drawn to scale.
 *
 * A plain SVG line — no library, no smoothing, every point is a real close —
 * with the things a reader actually uses: the range, the first close of the
 * range as a dotted baseline (so above/below it reads at a glance), the
 * period's high and low marked where they happened, three value gridlines,
 * month labels, and a crosshair on hover that reports the exact close. The
 * fill under the line is a faint blue wash; the line itself is the ink.
 */
export type IndexPoint = { date: string; isx60: number }
type Range = 'm1' | 'm3' | 'y1' | 'all'
const DAYS: Record<Range, number> = { m1: 31, m3: 92, y1: 366, all: 1e9 }

const W = 800, H = 300, PT = 18, PB = 28, PL = 8, PR = 64
const nf = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function niceTicks(lo: number, hi: number, n = 3): number[] {
  const span = hi - lo || 1
  const raw = span / n
  const mag = Math.pow(10, Math.floor(Math.log10(raw)))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw
  const out: number[] = []
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) out.push(+v.toFixed(6))
  return out
}

export function IndexChart({ series }: { series: IndexPoint[] }) {
  const { t, locale } = useLocale()
  const c = t.market.page.chart
  const [range, setRange] = useState<Range>('y1')
  const [hover, setHover] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const pts = useMemo(() => {
    if (!series.length) return []
    const last = new Date(series[series.length - 1].date).getTime()
    const since = last - DAYS[range] * 86400_000
    return series.filter((p) => new Date(p.date).getTime() >= since)
  }, [series, range])

  const geo = useMemo(() => {
    if (pts.length < 2) return null
    const vals = pts.map((p) => p.isx60)
    const lo = Math.min(...vals), hi = Math.max(...vals)
    const pad = (hi - lo) * 0.12 || 1
    const y0 = lo - pad, y1 = hi + pad
    const x = (i: number) => PL + (i / (pts.length - 1)) * (W - PL - PR)
    const y = (v: number) => PT + (1 - (v - y0) / (y1 - y0)) * (H - PT - PB)
    const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.isx60).toFixed(1)}`).join(' ')
    const area = `${line} L${x(pts.length - 1).toFixed(1)},${(H - PB).toFixed(1)} L${x(0).toFixed(1)},${(H - PB).toFixed(1)} Z`
    const iHi = vals.indexOf(hi), iLo = vals.indexOf(lo)
    /* Month labels: the first point of each month, thinned so they never collide. */
    const months: { i: number; label: string }[] = []
    let lastM = ''
    pts.forEach((p, i) => { const m = p.date.slice(0, 7); if (m !== lastM) { months.push({ i, label: shortDate(p.date, locale) }); lastM = m } })
    const every = Math.ceil(months.length / 6)
    return { x, y, line, area, lo, hi, iHi, iLo, ticks: niceTicks(y0, y1), months: months.filter((_, k) => k % every === 0), first: pts[0].isx60 }
  }, [pts, locale])

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!geo || !svgRef.current) return
    const r = svgRef.current.getBoundingClientRect()
    const px = ((e.clientX - r.left) / r.width) * W
    const i = Math.round(((px - PL) / (W - PL - PR)) * (pts.length - 1))
    setHover(Math.max(0, Math.min(pts.length - 1, i)))
  }

  const last = pts[pts.length - 1]
  const shown = hover != null ? pts[hover] : last
  const pct = geo && shown ? ((shown.isx60 - geo.first) / geo.first) * 100 : 0

  return (
    <section className="ix id-panel" aria-label={c.label}>
      <header className="ix-head">
        <div>
          <h2 className="id-h3 ix-title">{c.title}</h2>
          <p className="ix-value id-num">
            <strong>{shown ? nf.format(shown.isx60) : '—'}</strong>
            {shown ? <span className={`id-chg ${pct > 0 ? 'is-up' : pct < 0 ? 'is-down' : 'is-flat'}`}>{pct > 0 ? '▲' : pct < 0 ? '▼' : ''} {Math.abs(pct).toFixed(2)}%</span> : null}
            {shown ? <span className="id-cap">{hover != null ? shortDate(shown.date, locale) : c.since(shortDate(pts[0].date, locale))}</span> : null}
          </p>
        </div>
        <div className="id-pills" role="group">
          {(['m1', 'm3', 'y1', 'all'] as Range[]).map((r) => (
            <button key={r} type="button" className="id-pill is-sm" aria-pressed={range === r} onClick={() => { setRange(r); setHover(null) }}>{c.ranges[r]}</button>
          ))}
        </div>
      </header>

      {geo ? (
        <svg ref={svgRef} className="ix-svg id-num" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
          onPointerMove={onMove} onPointerLeave={() => setHover(null)} role="img" aria-label={c.label}>
          <defs>
            <linearGradient id="ix-wash" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--blue)" stopOpacity=".16" />
              <stop offset="1" stopColor="var(--blue)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {geo.ticks.map((v) => (
            <g key={v}>
              <line x1={PL} x2={W - PR} y1={geo.y(v)} y2={geo.y(v)} className="ix-grid" />
              <text x={W - PR + 8} y={geo.y(v)} className="ix-tick">{nf.format(v)}</text>
            </g>
          ))}
          <line x1={PL} x2={W - PR} y1={geo.y(geo.first)} y2={geo.y(geo.first)} className="ix-base" />
          <path d={geo.area} fill="url(#ix-wash)" />
          <path d={geo.line} className="ix-line" />
          {[{ i: geo.iHi, v: geo.hi, k: c.high, up: true }, { i: geo.iLo, v: geo.lo, k: c.low, up: false }].map((m) => (
            <g key={m.k}>
              <circle cx={geo.x(m.i)} cy={geo.y(m.v)} r="3" className="ix-mark" />
              <text x={geo.x(m.i)} y={geo.y(m.v) + (m.up ? -9 : 16)} className="ix-marklabel">{m.k} {nf.format(m.v)}</text>
            </g>
          ))}
          {geo.months.map((m) => <text key={m.i} x={geo.x(m.i)} y={H - 8} className="ix-month">{m.label}</text>)}
          {hover != null ? (
            <g>
              <line x1={geo.x(hover)} x2={geo.x(hover)} y1={PT} y2={H - PB} className="ix-cross" />
              <circle cx={geo.x(hover)} cy={geo.y(pts[hover].isx60)} r="4.5" className="ix-dot" />
            </g>
          ) : (
            <circle cx={geo.x(pts.length - 1)} cy={geo.y(last.isx60)} r="4.5" className="ix-dot" />
          )}
        </svg>
      ) : <p className="id-note">{c.empty}</p>}
    </section>
  )
}
