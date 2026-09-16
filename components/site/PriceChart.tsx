'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocale } from '@/context/LocaleContext'
import { shortDate, localeDate } from '@/lib/date'

/**
 * One company's price, drawn to scale — candles, line or area.
 *
 * Built fresh for this identity (components/design/ChartEngine is out of
 * scope for the redesign), and deliberately a plain SVG: no charting
 * library, no smoothing, every bar a real session.
 *
 * What it does: candlestick / line / area views, a volume pane, moving
 * averages, a crosshair reporting the full OHLC of the hovered session,
 * wheel-zoom and drag-pan over the window, log or linear price scale, and a
 * toolbar with reset, fullscreen and PNG export.
 *
 * Drawing tools: trend lines, horizontal price levels, rectangles and
 * Fibonacci retracements, with select, delete and clear.
 *
 * ⚠ ANCHORS ARE STORED IN DATA SPACE — a bar's index in the full series and
 * a price — never in pixels. That is what keeps a trend line attached to the
 * two sessions it was drawn between when the reader zooms, pans, switches
 * range, or flips to log scale. Storing screen coordinates would look right
 * until the first interaction and then quietly lie.
 *
 * What it does NOT do: indicator sub-panes (RSI, MACD) or multi-symbol
 * comparison.
 *
 * ⚠ Bars are the SERVER's. The page seeds this from `loadCompany`, so the
 * chart's data is in the HTML; this component never fetches.
 */
export type Bar = { date: string; open: number; high: number; low: number; close: number; volume: number }
type Range = 'm1' | 'm3' | 'y1' | 'y3' | 'all'
type View = 'candles' | 'line' | 'area'
type Tool = 'cursor' | 'trend' | 'hline' | 'rect' | 'fib'
/** `i` indexes the FULL bar series; `p` is a price. Never pixels. */
type Anchor = { i: number; p: number }
type Drawing =
  | { id: string; kind: 'trend' | 'rect' | 'fib'; a: Anchor; b: Anchor }
  | { id: string; kind: 'hline'; p: number }

const FIBS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1]
const HIT = 8   // px; how close a click must land to select a shape

const DAYS: Record<Range, number> = { m1: 31, m3: 92, y1: 366, y3: 3 * 366, all: Infinity }
const MAS = [20, 50, 200] as const
const PT = 14, PB = 26, PL = 8, PR = 62
const H_PRICE = 300, H_VOL = 64, GAP = 10
const H = PT + H_PRICE + GAP + H_VOL + PB
const W = 960

function niceTicks(lo: number, hi: number): number[] {
  const span = hi - lo || 1
  const mag = Math.pow(10, Math.floor(Math.log10(span / 4)))
  for (const m of [1, 2, 2.5, 5, 10, 20, 25, 50]) {
    const step = m * mag
    const first = Math.ceil(lo / step) * step
    const n = Math.floor((hi - first) / step) + 1
    if (n >= 3 && n <= 6) return Array.from({ length: n }, (_, i) => +(first + i * step).toFixed(6))
  }
  const step = span / 4
  return [1, 2, 3].map((i) => +(lo + i * step).toFixed(4))
}

/** Simple moving average, null until there are `n` closes behind a bar. */
function sma(bars: Bar[], n: number): (number | null)[] {
  const out: (number | null)[] = []
  let sum = 0
  for (let i = 0; i < bars.length; i++) {
    sum += bars[i].close
    if (i >= n) sum -= bars[i - n].close
    out.push(i >= n - 1 ? sum / n : null)
  }
  return out
}

export function PriceChart({ bars, label, sym }: { bars: Bar[]; label: string; sym: string }) {
  const { t, locale } = useLocale()
  const C = t.company.chart
  const K = C.chartTools
  const [range, setRange] = useState<Range>('y1')
  const [view, setView] = useState<View>('candles')
  const [logScale, setLogScale] = useState(false)
  const [mas, setMas] = useState<number[]>([])
  const [hover, setHover] = useState<number | null>(null)
  /** Zoom/pan window over the range's bars, as [start, end) indices. */
  const [win, setWin] = useState<{ a: number; b: number } | null>(null)
  const [full, setFull] = useState(false)
  const [tool, setTool] = useState<Tool>('cursor')
  const [draws, setDraws] = useState<Drawing[]>([])
  const [sel, setSel] = useState<string | null>(null)
  const [draft, setDraft] = useState<Drawing | null>(null)
  const draftRef = useRef<Drawing | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const drag = useRef<{ x: number; a: number; b: number } | null>(null)

  /* Drawings persist per symbol, in this browser only. Wrapped because
     storage throws in a private window and must never break the chart.
     *
     * ⚠ `hydratedKey` is not ceremony. Without it the save effect runs on
     * mount with the INITIAL empty state — before the load effect's state
     * has committed — and writes `[]` over whatever was stored. Every
     * drawing a reader had made would vanish on the next page load. Saving
     * is therefore gated until the state in hand is known to belong to this
     * symbol's key. */
  const storeKey = `iqw-draw-${sym}`
  const [hydratedKey, setHydratedKey] = useState<string | null>(null)
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storeKey)
      setDraws(raw ? (JSON.parse(raw) as Drawing[]) : [])
    } catch { setDraws([]) }
    setSel(null)
    setHydratedKey(storeKey)
  }, [storeKey])
  useEffect(() => {
    if (hydratedKey !== storeKey) return
    try { window.localStorage.setItem(storeKey, JSON.stringify(draws)) } catch { /* not fatal */ }
  }, [hydratedKey, storeKey, draws])

  /* The range's bars, before zoom. */
  const ranged = useMemo(() => {
    if (!bars.length) return []
    if (DAYS[range] === Infinity) return bars
    const last = bars[bars.length - 1].date
    const since = new Date(new Date(last).getTime() - DAYS[range] * 86400_000).toISOString().slice(0, 10)
    const w = bars.filter((b) => b.date >= since)
    return w.length > 1 ? w : bars.slice(-2)
  }, [bars, range])

  useEffect(() => { setWin(null); setHover(null) }, [range])

  const view0 = win ? Math.max(0, win.a) : 0
  const view1 = win ? Math.min(ranged.length, win.b) : ranged.length
  const pts = useMemo(() => ranged.slice(view0, view1), [ranged, view0, view1])

  /* Moving averages are computed over the RANGE, not the zoom window, so a
     20-day average does not restart when you zoom in. */
  const maSeries = useMemo(() => {
    const m: Record<number, (number | null)[]> = {}
    for (const n of MAS) if (mas.includes(n)) m[n] = sma(ranged, n).slice(view0, view1)
    return m
  }, [ranged, mas, view0, view1])

  /** date → index in the full series, so an anchor never depends on the view. */
  const gIndex = useMemo(() => {
    const m = new Map<string, number>()
    bars.forEach((b, i) => m.set(b.date, i))
    return m
  }, [bars])

  const onWheel = useCallback((e: React.WheelEvent) => {
    if (!ranged.length || draftRef.current) return
    e.preventDefault()
    const a = view0, b = view1
    const span = b - a
    const step = Math.max(1, Math.round(span * 0.12))
    if (e.deltaY < 0) {
      if (span - step * 2 < 10) return
      setWin({ a: a + step, b: b - step })
    } else {
      setWin({ a: Math.max(0, a - step), b: Math.min(ranged.length, b + step) })
    }
  }, [ranged.length, view0, view1])

  if (pts.length < 2) return <p className="id-note">{C.noSeries}</p>

  const lo = Math.min(...pts.map((p) => (view === 'candles' ? p.low : p.close)))
  const hi = Math.max(...pts.map((p) => (view === 'candles' ? p.high : p.close)))
  const pad = (hi - lo) * 0.08 || Math.max(0.01, hi * 0.02)
  /* Log scale only where every value is positive — prices are, but guard
     anyway rather than produce NaN geometry. */
  const canLog = logScale && lo - pad > 0
  const yLo = canLog ? Math.log(Math.max(1e-6, lo - pad)) : lo - pad
  const yHi = canLog ? Math.log(hi + pad) : hi + pad
  const yv = (v: number) => (canLog ? Math.log(Math.max(1e-6, v)) : v)
  const x = (i: number) => PL + (i / Math.max(1, pts.length - 1)) * (W - PL - PR)
  const y = (v: number) => PT + (1 - (yv(v) - yLo) / (yHi - yLo || 1)) * H_PRICE
  const bw = Math.max(1, ((W - PL - PR) / pts.length) * 0.66)

  /* Anchors live in the FULL series' index space, so they survive range and
     zoom changes. These two map that space to and from the visible window.
     Visible bars are a contiguous slice, so a linear map is exact for them
     and extrapolates sensibly for a shape drawn outside the current view. */
  const gi0 = gIndex.get(pts[0].date) ?? 0
  const gi1 = gIndex.get(pts[pts.length - 1].date) ?? Math.max(1, bars.length - 1)
  const xOfI = (gi: number) => PL + ((gi - gi0) / Math.max(1, gi1 - gi0)) * (W - PL - PR)
  const iOfX = (px: number) => gi0 + ((px - PL) / (W - PL - PR)) * Math.max(1, gi1 - gi0)
  /* Inverse of y(): screen pixel back to a price, log-aware. */
  const pOfY = (py: number) => {
    const f = 1 - (py - PT) / H_PRICE
    const v = yLo + f * (yHi - yLo)
    return canLog ? Math.exp(v) : v
  }

  const vMax = Math.max(1, ...pts.map((p) => p.volume))
  const vy = (v: number) => PT + H_PRICE + GAP + H_VOL - (v / vMax) * H_VOL

  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.close).toFixed(1)}`).join(' ')
  const area = `${line} L${x(pts.length - 1).toFixed(1)},${PT + H_PRICE} L${x(0).toFixed(1)},${PT + H_PRICE} Z`
  const up = pts[pts.length - 1].close >= pts[0].close
  const ticks = niceTicks(canLog ? Math.exp(yLo) : yLo, canLog ? Math.exp(yHi) : yHi)
  const shown = pts[hover ?? pts.length - 1]
  const prevOf = hover != null && hover > 0 ? pts[hover - 1] : pts[pts.length - 2]
  const chg = prevOf && prevOf.close > 0 ? ((shown.close - prevOf.close) / prevOf.close) * 100 : null
  const nf = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const vf = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 })

  const labels: { i: number; label: string }[] = []
  const n = Math.min(6, pts.length)
  const long = range === 'y1' || range === 'y3' || range === 'all'
  for (let k = 0; k < n; k++) {
    const i = Math.round((k / Math.max(1, n - 1)) * (pts.length - 1))
    /* Full year on long ranges: a two-digit suffix rendered «22 نوفمبر 22»,
       where the day and the year read as the same number. */
    labels.push({ i, label: shortDate(pts[i].date, locale) + (long ? ` ${pts[i].date.slice(0, 4)}` : '') })
  }

  /** Screen-space distance from a click to a shape, for selection. */
  function hitDist(d: Drawing, px: number, py: number): number {
    if (d.kind === 'hline') return Math.abs(py - y(d.p))
    const ax = xOfI(d.a.i), ay = y(d.a.p), bx = xOfI(d.b.i), by = y(d.b.p)
    if (d.kind === 'trend') {
      const vx = bx - ax, vy2 = by - ay
      const len2 = vx * vx + vy2 * vy2 || 1
      const t = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy2) / len2))
      return Math.hypot(px - (ax + t * vx), py - (ay + t * vy2))
    }
    /* rect and fib: nearest edge of the box they span. */
    const x0 = Math.min(ax, bx), x1 = Math.max(ax, bx)
    const y0 = Math.min(ay, by), y1 = Math.max(ay, by)
    const dx = px < x0 ? x0 - px : px > x1 ? px - x1 : 0
    const dy = py < y0 ? y0 - py : py > y1 ? py - y1 : 0
    return Math.hypot(dx, dy)
  }

  /** Pointer position in the SVG's own viewBox coordinates. */
  function svgPos(e: React.PointerEvent): { px: number; py: number } {
    const r = e.currentTarget.getBoundingClientRect()
    return { px: (e.clientX - r.left) / r.width * W, py: (e.clientY - r.top) / r.height * H }
  }

  function startDraw(px: number, py: number) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const at: Anchor = { i: iOfX(px), p: pOfY(py) }
    const d: Drawing = tool === 'hline'
      ? { id, kind: 'hline', p: at.p }
      : { id, kind: tool as 'trend' | 'rect' | 'fib', a: at, b: at }
    draftRef.current = d
    setDraft(d)
  }

  function moveDraw(px: number, py: number) {
    const cur = draftRef.current
    if (!cur || cur.kind === 'hline') return
    const next: Drawing = { ...cur, b: { i: iOfX(px), p: pOfY(py) } }
    draftRef.current = next
    setDraft(next)
  }

  function endDraw() {
    const cur = draftRef.current
    draftRef.current = null
    setDraft(null)
    if (!cur) return
    /* Discard a shape that is really just a click: a zero-length trend line
       is invisible and un-selectable, so it would be litter. */
    if (cur.kind !== 'hline') {
      const dx = Math.abs(xOfI(cur.b.i) - xOfI(cur.a.i))
      const dy = Math.abs(y(cur.b.p) - y(cur.a.p))
      if (dx < 4 && dy < 4) return
    }
    setDraws((list) => [...list, cur])
    setSel(cur.id)
    setTool('cursor')
  }

  /* PNG export: serialise the SVG, paint it on a canvas, hand back a file.
     Styles are inlined into the clone because a detached SVG carries none of
     the page's CSS. */
  async function download() {
    const svg = svgRef.current
    if (!svg) return
    try {
      const clone = svg.cloneNode(true) as SVGSVGElement
      const cs = getComputedStyle(document.documentElement)
      const bg = cs.getPropertyValue('--surface').trim() || '#fff'
      clone.setAttribute('style', `background:${bg}`)
      for (const el of Array.from(clone.querySelectorAll<SVGElement>('*'))) {
        const src = document.querySelector(`.cmp-svg ${el.tagName}`)
        if (!src) continue
        const s = getComputedStyle(src as Element)
        el.setAttribute('fill', el.getAttribute('fill') ?? s.fill)
        el.setAttribute('stroke', s.stroke)
      }
      const xml = new XMLSerializer().serializeToString(clone)
      const img = new Image()
      img.crossOrigin = 'anonymous'
      await new Promise((res, rej) => {
        img.onload = res; img.onerror = rej
        img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`
      })
      const cv = document.createElement('canvas')
      cv.width = W * 2; cv.height = H * 2
      const g = cv.getContext('2d')!
      g.fillStyle = bg; g.fillRect(0, 0, cv.width, cv.height)
      g.drawImage(img, 0, 0, cv.width, cv.height)
      const a = document.createElement('a')
      a.href = cv.toDataURL('image/png')
      a.download = `${sym}-${range}.png`
      a.click()
      setMsg(K.downloaded)
      setTimeout(() => setMsg(null), 2000)
    } catch { /* export is a convenience; never break the chart over it */ }
  }

  return (
    <div className={`cmp-chart ${full ? 'is-full' : ''} ${tool !== 'cursor' ? 'is-drawing' : ''}`.replace(/\s+/g, ' ').trim()}>
      <div className="cmp-chart-head">
        <p className="cmp-read id-num">
          <strong>{nf.format(shown.close)}</strong>
          <span className={`cmp-ohlc id-cap ${chg == null ? '' : chg > 0 ? 'id-up' : chg < 0 ? 'id-down' : ''}`}>
            <bdi>{localeDate(shown.date, locale)}</bdi>
            <bdi>{K.o} {nf.format(shown.open)}</bdi>
            <bdi>{K.h} {nf.format(shown.high)}</bdi>
            <bdi>{K.l} {nf.format(shown.low)}</bdi>
            <bdi>{K.c} {nf.format(shown.close)}</bdi>
            {chg != null ? <bdi>{chg > 0 ? '+' : ''}{chg.toFixed(2)}%</bdi> : null}
            <bdi>{K.volume} {vf.format(shown.volume)}</bdi>
          </span>
        </p>
      </div>

      <div className="cmp-tools">
        <div className="id-pills" role="group" aria-label={C.range}>
          {(['m1', 'm3', 'y1', 'y3', 'all'] as const).map((r) => (
            <button key={r} type="button" className="id-pill is-sm" aria-pressed={range === r} onClick={() => setRange(r)}>{C.ranges[r]}</button>
          ))}
        </div>
        <div className="cmp-tools-end">
          <div className="id-pills" role="group" aria-label={K.view}>
            {(['candles', 'line', 'area'] as const).map((v) => (
              <button key={v} type="button" className="id-pill is-sm" aria-pressed={view === v} onClick={() => setView(v)}>{K[v]}</button>
            ))}
          </div>
          <div className="id-pills" role="group" aria-label={K.ma}>
            {MAS.map((m) => (
              <button key={m} type="button" className="id-pill is-sm" aria-pressed={mas.includes(m)}
                onClick={() => setMas((cur) => cur.includes(m) ? cur.filter((z) => z !== m) : [...cur, m])}>{K.maN(String(m))}</button>
            ))}
          </div>
          <div className="id-pills" role="group" aria-label={K.scale}>
            <button type="button" className="id-pill is-sm" aria-pressed={!logScale} onClick={() => setLogScale(false)}>{K.linear}</button>
            <button type="button" className="id-pill is-sm" aria-pressed={logScale} onClick={() => setLogScale(true)}>{K.log}</button>
          </div>
          <div className="id-pills" role="group" aria-label={K.draw}>
            {(['cursor', 'trend', 'hline', 'rect', 'fib'] as const).map((tl) => (
              <button key={tl} type="button" className="id-pill is-sm" aria-pressed={tool === tl} onClick={() => { setTool(tl); setSel(null) }}>{K[tl]}</button>
            ))}
          </div>
          <div className="id-pills">
            {sel ? <button type="button" className="id-pill is-sm" onClick={() => { setDraws((l) => l.filter((d) => d.id !== sel)); setSel(null) }}>{K.deleteOne}</button> : null}
            {draws.length ? <button type="button" className="id-pill is-sm" onClick={() => { setDraws([]); setSel(null) }}>{K.clearAll}</button> : null}
          </div>
          <div className="id-pills">
            <button type="button" className="id-pill is-sm" onClick={() => { setWin(null); setHover(null) }}>{K.reset}</button>
            <button type="button" className="id-pill is-sm" aria-pressed={full} onClick={() => setFull((f) => !f)}>{full ? K.exitFullscreen : K.fullscreen}</button>
            <button type="button" className="id-pill is-sm" onClick={download}>{msg ?? K.download}</button>
          </div>
        </div>
      </div>

      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="cmp-svg id-num" role="img" aria-label={label}
        onWheel={onWheel}
        onPointerLeave={() => { setHover(null); drag.current = null; if (draftRef.current) endDraw() }}
        onPointerDown={(e) => {
          ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
          if (tool !== 'cursor') { const { px, py } = svgPos(e); startDraw(px, py); return }
          /* Cursor tool: a click either selects a shape or begins a pan. */
          const { px, py } = svgPos(e)
          const near = draws
            .map((d) => ({ d, dist: hitDist(d, px, py) }))
            .sort((m, n) => m.dist - n.dist)[0]
          if (near && near.dist <= HIT) { setSel(near.d.id); return }
          setSel(null)
          drag.current = { x: e.clientX, a: view0, b: view1 }
        }}
        onPointerUp={() => { if (draftRef.current) endDraw(); drag.current = null }}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          if (draftRef.current) { const { px, py } = svgPos(e); moveDraw(px, py); return }
          if (drag.current) {
            const dx = (e.clientX - drag.current.x) / r.width * W
            const perBar = (W - PL - PR) / Math.max(1, pts.length)
            const shift = Math.round(-dx / perBar) * (locale === 'ar' ? -1 : 1)
            const span = drag.current.b - drag.current.a
            let a = drag.current.a + shift
            a = Math.max(0, Math.min(ranged.length - span, a))
            setWin({ a, b: a + span })
            return
          }
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

        {view === 'candles' ? pts.map((p, i) => {
          const rise = p.close >= p.open
          const top = y(Math.max(p.open, p.close)), bot = y(Math.min(p.open, p.close))
          return (
            <g key={p.date} className={`cmp-candle ${rise ? 'is-up' : 'is-down'}`}>
              <line x1={x(i)} x2={x(i)} y1={y(p.high)} y2={y(p.low)} className="cmp-wick" />
              <rect x={x(i) - bw / 2} y={top} width={bw} height={Math.max(1, bot - top)} className="cmp-body" />
            </g>
          )
        }) : (
          <>
            {view === 'area' ? <path d={area} className={`cmp-area ${up ? 'is-up' : 'is-down'}`} /> : null}
            <path d={line} className={`cmp-line ${up ? 'is-up' : 'is-down'}`} />
          </>
        )}

        {Object.entries(maSeries).map(([n, vals], k) => {
          const d = vals.map((v, i) => (v == null ? null : `${x(i).toFixed(1)},${y(v).toFixed(1)}`))
            .reduce<string>((acc, cur, i) => cur == null ? acc : acc + (acc && vals[i - 1] != null ? 'L' : 'M') + cur, '')
          return d ? <path key={n} d={d} className={`cmp-ma is-ma${k}`} /> : null
        })}

        {/* Volume pane, on its own scale under the price. */}
        <line x1={PL} x2={W - PR} y1={PT + H_PRICE + GAP + H_VOL} y2={PT + H_PRICE + GAP + H_VOL} className="cmp-grid" />
        {pts.map((p, i) => (
          <rect key={`v${p.date}`} x={x(i) - bw / 2} y={vy(p.volume)} width={bw} height={Math.max(0, PT + H_PRICE + GAP + H_VOL - vy(p.volume))}
            className={`cmp-vol ${p.close >= p.open ? 'is-up' : 'is-down'}`} />
        ))}

        {/* Drawings, clipped to the price pane so a shape panned out of view
            cannot spill over the axis or the volume pane. */}
        <defs>
          <clipPath id={`clip-${sym}`}>
            <rect x={PL} y={PT} width={W - PL - PR} height={H_PRICE} />
          </clipPath>
        </defs>
        <g clipPath={`url(#clip-${sym})`}>
          {[...draws, ...(draft ? [draft] : [])].map((d) => {
            const on = d.id === sel
            const cls = `cmp-draw ${on ? 'is-sel' : ''}`.trim()
            if (d.kind === 'hline') {
              return (
                <g key={d.id} className={cls}>
                  <line x1={PL} x2={W - PR} y1={y(d.p)} y2={y(d.p)} className="cmp-draw-line" />
                  <text x={PL + 6} y={y(d.p) - 5} className="cmp-draw-label">{nf.format(d.p)}</text>
                </g>
              )
            }
            const ax = xOfI(d.a.i), ay = y(d.a.p), bx = xOfI(d.b.i), by = y(d.b.p)
            if (d.kind === 'trend') {
              return (
                <g key={d.id} className={cls}>
                  <line x1={ax} y1={ay} x2={bx} y2={by} className="cmp-draw-line" />
                  {on ? <><circle cx={ax} cy={ay} r="4" className="cmp-draw-hand" /><circle cx={bx} cy={by} r="4" className="cmp-draw-hand" /></> : null}
                </g>
              )
            }
            if (d.kind === 'rect') {
              return (
                <g key={d.id} className={cls}>
                  <rect x={Math.min(ax, bx)} y={Math.min(ay, by)} width={Math.abs(bx - ax)} height={Math.abs(by - ay)} className="cmp-draw-rect" />
                </g>
              )
            }
            /* Fibonacci retracement: levels between the two anchor PRICES,
               drawn across the span the reader dragged. */
            const lo2 = Math.min(d.a.p, d.b.p), hi2 = Math.max(d.a.p, d.b.p)
            const x0 = Math.min(ax, bx), x1 = Math.max(ax, bx)
            return (
              <g key={d.id} className={cls}>
                {FIBS.map((f) => {
                  const pv = hi2 - (hi2 - lo2) * f
                  return (
                    <g key={f}>
                      <line x1={x0} x2={x1} y1={y(pv)} y2={y(pv)} className="cmp-draw-fib" />
                      <text x={x0 + 4} y={y(pv) - 4} className="cmp-draw-label">{(f * 100).toFixed(1)}% · {nf.format(pv)}</text>
                    </g>
                  )
                })}
                <line x1={x0} x2={x0} y1={y(hi2)} y2={y(lo2)} className="cmp-draw-fib is-edge" />
              </g>
            )
          })}
        </g>

        {labels.map((l) => <text key={l.i} x={x(l.i)} y={H - 8} className="cmp-xlabel">{l.label}</text>)}

        {hover != null ? (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={PT} y2={PT + H_PRICE + GAP + H_VOL} className="cmp-cross" />
            <line x1={PL} x2={W - PR} y1={y(pts[hover].close)} y2={y(pts[hover].close)} className="cmp-cross" />
            <circle cx={x(hover)} cy={y(pts[hover].close)} r="3.5" className="cmp-dot" />
          </g>
        ) : null}
      </svg>
      <p className="id-cap cmp-hint">{tool === 'cursor' ? K.zoomHint : K.drawHint}{draws.length ? ` · ${K.drawCount(String(draws.length))}` : ''}</p>
    </div>
  )
}
