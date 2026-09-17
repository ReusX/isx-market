'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocale } from '@/context/LocaleContext'
import { shortDate, localeDate } from '@/lib/date'
import '@/styles/series-chart.css'

/**
 * A to-scale line chart for one or more dated series — the dollar against
 * the dinar, and whatever comes next. Plain SVG drawn at the panel's real
 * pixel size (viewBox follows a ResizeObserver, so nothing stretches), a
 * crosshair that reports every series at the hovered date, nice value
 * ticks, real dates on the axis, and the watermark in the emptier half.
 *
 * Series may have different dates; the crosshair snaps to the FIRST
 * series' points and reads the others at the latest point on or before
 * that date, which is what "the official rate on that day" means.
 */
export type SeriesPoint = { date: string; value: number }
export type ChartSeries = { key: string; label: string; points: SeriesPoint[]; dashed?: boolean; muted?: boolean }
export type ChartRange = { id: string; label: string; days: number | null }

const PT = 18, PB = 28, PL = 8, PR = 72

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

/** Latest value at or before `date`, by binary search. */
function at(points: SeriesPoint[], date: string): number | null {
  let lo = 0, hi = points.length - 1, best = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (points[mid].date <= date) { best = mid; lo = mid + 1 } else hi = mid - 1
  }
  return best >= 0 ? points[best].value : null
}

export function SeriesChart({ series, ranges, defaultRange, format, label, height = 300, mark = true }: {
  series: ChartSeries[]
  ranges: ChartRange[]
  defaultRange: string
  /** Value formatter for ticks and the readout. */
  format: (v: number) => string
  label: string
  height?: number
  mark?: boolean
}) {
  const { locale } = useLocale()
  const [rangeId, setRangeId] = useState(defaultRange)
  const [hover, setHover] = useState<number | null>(null)
  const plotRef = useRef<HTMLDivElement>(null)
  const [[W, H], setSize] = useState<[number, number]>([800, height])
  useEffect(() => {
    const el = plotRef.current
    if (!el) return
    const measure = () => {
      const r = el.getBoundingClientRect()
      if (r.width > 0 && r.height > 0) setSize(([w, h]) => (w === Math.round(r.width) && h === Math.round(r.height) ? [w, h] : [Math.round(r.width), Math.round(r.height)]))
    }
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    measure()
    window.addEventListener('resize', measure)
    return () => { ro.disconnect(); window.removeEventListener('resize', measure) }
  }, [])

  const range = ranges.find((r) => r.id === rangeId) ?? ranges[0]
  const lead = series[0]
  /* The window is measured from the LEAD series' last date — the market's
     own clock, not today's. */
  const since = useMemo(() => {
    if (!lead?.points.length || range.days == null) return ''
    const last = new Date(lead.points[lead.points.length - 1].date).getTime()
    return new Date(last - range.days * 86400_000).toISOString().slice(0, 10)
  }, [lead, range])
  const view = useMemo(() => series.map((s) => ({ ...s, points: s.points.filter((p) => p.date >= since) })), [series, since])
  const main = useMemo(() => view[0]?.points ?? [], [view])

  const geo = useMemo(() => {
    if (main.length < 2) return null
    const vals = view.flatMap((s) => s.points.map((p) => p.value))
    const lo = Math.min(...vals), hi = Math.max(...vals)
    const pad = (hi - lo) * 0.12 || Math.max(1, hi * 0.02)
    const y0 = lo - pad, y1 = hi + pad
    const t0 = new Date(main[0].date).getTime(), t1 = new Date(main[main.length - 1].date).getTime()
    const x = (date: string) => PL + ((new Date(date).getTime() - t0) / Math.max(1, t1 - t0)) * (W - PL - PR)
    const y = (v: number) => PT + (1 - (v - y0) / (y1 - y0)) * (H - PT - PB)
    const path = (pts: SeriesPoint[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.date).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')
    const lines = view.map((s) => ({ ...s, d: path(s.points) }))
    /* Date labels: about six, on real points of the lead series. */
    const n = Math.min(6, main.length)
    const long = range.days == null || range.days > 200
    const labels: { date: string; k: number }[] = []
    for (let k = 0; k < n; k++) {
      const i = Math.round((k / (n - 1)) * (main.length - 1))
      if (!labels.some((l) => l.date === main[i].date)) labels.push({ date: main[i].date, k })
    }
    const fmt = (d: string) => long
      ? new Date(d).toLocaleDateString(locale === 'ar' ? 'ar-u-nu-latn' : 'en-GB', { month: 'short', year: 'numeric' })
      : shortDate(d, locale)
    const mid = Math.floor(main.length / 2)
    const mean = (a: SeriesPoint[]) => a.reduce((t, p) => t + p.value, 0) / Math.max(1, a.length)
    const markX = mean(main.slice(0, mid)) <= mean(main.slice(mid)) ? x(main[Math.floor(mid / 2)].date) : x(main[mid + Math.floor(mid / 2)].date)
    return { x, y, lines, ticks: niceTicks(y0, y1), labels: labels.map((l) => ({ ...l, text: fmt(l.date) })), markX, markY: PT + (H - PT - PB) * 0.28 }
  }, [view, main, W, H, range, locale])

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!geo) return
    const r = e.currentTarget.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width * W
    /* Nearest lead point to the pointer's x. */
    let best = 0, bd = Infinity
    for (let i = 0; i < main.length; i++) { const d = Math.abs(geo.x(main[i].date) - px); if (d < bd) { bd = d; best = i } }
    setHover(best)
  }

  const shownDate = hover != null ? main[hover]?.date : main[main.length - 1]?.date
  const readout = shownDate ? view.map((s) => ({ key: s.key, label: s.label, v: at(s.points, shownDate), muted: s.muted, dashed: s.dashed })) : []

  return (
    <div className="lch">
      <div className="lch-head">
        <p className="lch-read id-num">
          {shownDate ? <span className="lch-date">{localeDate(shownDate, locale)}</span> : null}
          {readout.map((r) => (
            <span key={r.key} className={`lch-val ${r.muted ? 'is-muted' : ''}`.trim()}>
              <i className={`lch-swatch ${r.dashed ? 'is-dashed' : ''}`.trim()} aria-hidden="true" />
              {r.label} <b><bdi>{r.v == null ? '—' : format(r.v)}</bdi></b>
            </span>
          ))}
        </p>
        <div className="id-pills lch-ranges" role="group">
          {ranges.map((r) => (
            <button key={r.id} type="button" className="id-pill is-sm" aria-pressed={range.id === r.id} onClick={() => { setRangeId(r.id); setHover(null) }}>{r.label}</button>
          ))}
        </div>
      </div>
      <div ref={plotRef} className="lch-plot" style={{ height }}>
        {geo ? (
          <svg className="lch-svg id-num" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}
            onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={(e) => { if (e.pointerType !== 'touch') setHover(null) }}>
            {geo.ticks.map((v) => (
              <g key={v}>
                <line x1={PL} x2={W - PR} y1={geo.y(v)} y2={geo.y(v)} className="lch-grid" />
                <text x={W - PR + 8} y={geo.y(v)} className="lch-tick">{format(v)}</text>
              </g>
            ))}
            {mark ? <text x={geo.markX} y={geo.markY} className="lch-mark" aria-hidden="true">IRAQSM.COM</text> : null}
            {geo.lines.map((s) => <path key={s.key} d={s.d} className={`lch-line ${s.dashed ? 'is-dashed' : ''} ${s.muted ? 'is-muted' : ''}`.trim()} />)}
            {geo.labels.map((l) => <text key={l.date} x={geo.x(l.date)} y={H - 8} className="lch-xlabel" style={{ textAnchor: l.k === 0 ? 'start' : l.k === geo.labels.length - 1 ? 'end' : 'middle' }}>{l.text}</text>)}
            {hover != null && main[hover] ? (
              <g>
                <line x1={geo.x(main[hover].date)} x2={geo.x(main[hover].date)} y1={PT} y2={H - PB} className="lch-cross" />
                <circle cx={geo.x(main[hover].date)} cy={geo.y(main[hover].value)} r="4.5" className="lch-dot" />
              </g>
            ) : (
              <circle cx={geo.x(main[main.length - 1].date)} cy={geo.y(main[main.length - 1].value)} r="4.5" className="lch-dot" />
            )}
          </svg>
        ) : null}
      </div>
    </div>
  )
}
