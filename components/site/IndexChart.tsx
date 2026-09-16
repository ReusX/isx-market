'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
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
type Range = 'm1' | 'm3' | 'y1' | 'y3' | 'all'
/* Calendar days back from the LAST session in the series, not from today:
   a range is measured against the market's own clock. */
const DAYS: Record<Range, number> = { m1: 31, m3: 92, y1: 366, y3: 3 * 366, all: Infinity }

const PT = 18, PB = 28, PL = 8, PR = 64
const nf = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/* Value gridlines: a round step that yields three to five lines inside the
   plotted range, whatever the range's span. */
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
  return [1, 2, 3].map((i) => +(lo + i * step).toFixed(2))
}

/* Date labels: about six, evenly spaced through the plotted points, each
   the real date of the point it sits under — day and month for short
   ranges, month and year for long ones. */
function dateLabels(pts: IndexPoint[], range: Range, fmt: (d: string, long: boolean) => string) {
  const n = Math.min(6, pts.length)
  const long = range === 'y1' || range === 'y3' || range === 'all'
  const out: { i: number; label: string }[] = []
  for (let k = 0; k < n; k++) {
    const i = Math.round((k / (n - 1)) * (pts.length - 1))
    if (!out.some((o) => o.i === i)) out.push({ i, label: fmt(pts[i].date, long) })
  }
  return out
}

export function IndexChart({ series }: { series: IndexPoint[] }) {
  const { t, locale, href: L } = useLocale()
  const c = t.market.page.chart
  const [range, setRange] = useState<Range>('y1')
  const [hover, setHover] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  /* The SVG is drawn at the panel's real pixel width — its viewBox follows
     the container — instead of being stretched to fit. Stretching a fixed
     viewBox distorts everything drawn in it: circles become ellipses, the
     crosshair drifts off the line, text widens. */
  const plotRef = useRef<HTMLDivElement>(null)
  const [[W, H], setSize] = useState<[number, number]>([800, 300])
  /* Observe the plot BOX, which is always mounted — the SVG itself only
     exists once data has arrived, and an observer attached before that
     watched nothing, leaving the viewBox at its default and the pointer
     mapped to the wrong x. */
  useEffect(() => {
    const el = plotRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => { const w = Math.round(e.contentRect.width), h = Math.round(e.contentRect.height); if (w > 0 && h > 0) setSize([w, h]) })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

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
    const fmt = (d: string, long: boolean) => long
      ? new Date(d).toLocaleDateString(locale === 'ar' ? 'ar-u-nu-latn' : 'en-GB', { month: 'short', year: 'numeric' })
      : shortDate(d, locale)
    /* The watermark goes where the line is not: the half of the range whose
       closes sit lower leaves more room above them. */
    const mid = Math.floor(pts.length / 2)
    const mean = (a: IndexPoint[]) => a.reduce((t, p) => t + p.isx60, 0) / a.length
    const markX = mean(pts.slice(0, mid)) <= mean(pts.slice(mid)) ? x(Math.floor(mid / 2)) : x(mid + Math.floor(mid / 2))
    const markY = PT + (H - PT - PB) * 0.28
    return { x, y, line, area, lo, hi, iHi, iLo, ticks: niceTicks(y0, y1), months: dateLabels(pts, range, fmt), first: pts[0].isx60, markX, markY }
  }, [pts, locale, range, W, H])

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!geo || !svgRef.current) return
    const r = svgRef.current.getBoundingClientRect()
    const px = e.clientX - r.left
    const i = Math.round(((px - PL) / (W - PL - PR)) * (pts.length - 1))
    setHover(Math.max(0, Math.min(pts.length - 1, i)))
  }

  /* The caption always carries the year: a chart that spans years cannot
     say «14 سبتمبر» and expect the reader to know which. */
  const fullDate = (d: string) => new Date(d).toLocaleDateString(locale === 'ar' ? 'ar-u-nu-latn' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const last = pts[pts.length - 1]
  const shown = hover != null ? pts[hover] : last
  const pct = geo && shown ? ((shown.isx60 - geo.first) / geo.first) * 100 : 0

  return (
    <section className="ix id-panel" aria-label={c.label}>
      <header className="ix-head">
        <div className="ix-lead">
          <h2 className="id-h3 ix-title">{c.title}</h2>
          <p className="ix-value id-num">
            <strong>{shown ? nf.format(shown.isx60) : '—'}</strong>
            {shown ? <span className={`id-chg ${pct > 0 ? 'is-up' : pct < 0 ? 'is-down' : 'is-flat'}`}>{pct > 0 ? '▲' : pct < 0 ? '▼' : ''} {Math.abs(pct).toFixed(2)}%</span> : null}
          </p>
          {/* Its own line, so a long date on hover never reflows the pills. */}
          <p className="id-cap ix-when">{shown ? (hover != null ? fullDate(shown.date) : c.since(fullDate(pts[0].date))) : '\u00a0'}</p>
        </div>
        <div className="id-pills ix-ranges" role="group">
          {(['m1', 'm3', 'y1', 'y3', 'all'] as Range[]).map((r) => (
            <button key={r} type="button" className="id-pill is-sm" aria-pressed={range === r} onClick={() => { setRange(r); setHover(null) }}>{c.ranges[r]}</button>
          ))}
        </div>
      </header>

      <div ref={plotRef} className="ix-plot">
      {geo ? (
        <svg ref={svgRef} className="ix-svg id-num" viewBox={`0 0 ${W} ${H}`}
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
          <text x={geo.markX} y={geo.markY} className="ix-mark" aria-hidden="true">IRAQSM.COM</text>
          <line x1={PL} x2={W - PR} y1={geo.y(geo.first)} y2={geo.y(geo.first)} className="ix-base" />
          <path d={geo.area} fill="url(#ix-wash)" />
          <path d={geo.line} className="ix-line" />
          {[{ i: geo.iHi, v: geo.hi, k: c.high, up: true }, { i: geo.iLo, v: geo.lo, k: c.low, up: false }].map((m) => (
            <g key={m.k}>
              <circle cx={geo.x(m.i)} cy={geo.y(m.v)} r="3" className="ix-mark" />
              <text x={geo.x(m.i)} y={geo.y(m.v) + (m.up ? -9 : 16)} className="ix-marklabel">{m.k} {nf.format(m.v)}</text>
            </g>
          ))}
          {geo.months.map((m, k) => <text key={m.i} x={geo.x(m.i)} y={H - 8} className="ix-month" style={{ textAnchor: k === 0 ? 'start' : k === geo.months.length - 1 ? 'end' : 'middle' }}>{m.label}</text>)}
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
      </div>
      {/* /charts exists in Arabic only for now; no link to a 404. */}
      {locale === 'ar' ? (
        <footer className="ix-foot">
          <Link href={L('/charts')} className="id-btn is-sm">{c.full} →</Link>
        </footer>
      ) : null}
    </section>
  )
}
