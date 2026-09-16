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
 * log or linear price scale, and a toolbar with reset, fullscreen and PNG
 * export.
 *
 * Navigation is the terminal's, not a slider's: drag the plot to pan (time
 * and price), wheel or pinch to zoom about the cursor, drag the DATE axis to
 * stretch time, drag the PRICE axis to stretch price, double-click either to
 * reset it. The price scale fits the visible bars until the reader takes it
 * over; the reset control or a double-click hands it back.
 *
 * ⚠ The wheel listener is attached natively with `passive: false`. React
 * registers `onWheel` passively, so `preventDefault` there is ignored and
 * the page scrolls under the chart.
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
const H_VOL = 64, GAP = 10
/** Fewest bars a window may show; the widest is 1.5× the series. */
const MIN_SPAN = 8
/** Server-side size; the real one comes from a ResizeObserver after mount. */
const DEFAULT_W = 960, DEFAULT_H = 414

/**
 * The view is a WINDOW over the full series — `[a, b)` in bar indices, as
 * floats, so a pan of half a bar is a pan of half a bar. It may run a little
 * past both ends (air after the last candle, like any charting terminal),
 * but never so far that fewer than three bars remain on screen.
 */
type Win = { a: number; b: number }
function clampWin(len: number, a: number, b: number): Win {
  let span = b - a
  span = Math.max(MIN_SPAN, Math.min(Math.max(MIN_SPAN, len * 1.5), span))
  const minA = -span * 0.02
  const maxA = Math.max(minA, len - 3)
  a = Math.max(minA, Math.min(maxA, a))
  return { a, b: a + span }
}

type Gesture =
  | { kind: 'pan'; x0: number; y0: number; a0: number; b0: number; lo0: number; hi0: number }
  | { kind: 'taxis'; x0: number; a0: number; b0: number }
  | { kind: 'paxis'; y0: number; lo0: number; hi0: number }
  | { kind: 'pinch'; d0: number; mx: number; a0: number; b0: number }
type Zone = 'plot' | 'taxis' | 'paxis'

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


/* Stroked icons, currentColor, 20px grid. Drawing tools read as pictures on
   a rail the way a chart's tools always have; text pills for them produced
   twenty-one labels above the plot and buried the chart itself. */
const ICON: Record<string, React.ReactNode> = {
  cursor: <><path d="M10 3v5M10 12v5M3 10h5M12 10h5" /><circle cx="10" cy="10" r="1.2" /></>,
  trend: <><path d="M4 16 16 4" /><circle cx="16" cy="4" r="1.8" /><circle cx="4" cy="16" r="1.8" /></>,
  hline: <><path d="M3 7h14M3 13h14" /><circle cx="14" cy="7" r="1.6" /><circle cx="6" cy="13" r="1.6" /></>,
  rect: <rect x="3.5" y="5.5" width="13" height="9" rx="1" />,
  fib: <><path d="M3 5h14M3 8.5h14M3 12h14M3 15.5h14" /></>,
  trash: <><path d="M4 6h12M8 6V4h4v2M6.5 6l.7 10h5.6l.7-10" /></>,
  settings: <><circle cx="10" cy="10" r="2.6" /><path d="M10 2.5v2.2M10 15.3v2.2M17.5 10h-2.2M4.7 10H2.5M15.3 4.7l-1.6 1.6M6.3 13.7l-1.6 1.6M15.3 15.3l-1.6-1.6M6.3 6.3 4.7 4.7" /></>,
  reset: <><path d="M4 10a6 6 0 1 1 1.8 4.3" /><path d="M3 15.5V11h4.5" /></>,
  expand: <><path d="M3 7V3h4M13 3h4v4M17 13v4h-4M7 17H3v-4" /></>,
  collapse: <><path d="M7 3v4H3M13 7V3h4M13 13h4v4M7 17v-4H3" /></>,
  download: <><path d="M10 3v9M6.5 8.5 10 12l3.5-3.5M4 15.5h12" /></>,
}
function Icon({ name }: { name: string }) {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor"
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICON[name]}</svg>
  )
}

export function PriceChart({ bars, label, sym }: { bars: Bar[]; label: string; sym: string }) {
  const { t, locale } = useLocale()
  const C = t.company.chart
  const K = C.chartTools
  const len = bars.length

  const [range, setRange] = useState<Range>('y1')
  const [view, setView] = useState<View>('candles')
  const [logScale, setLogScale] = useState(false)
  const [mas, setMas] = useState<number[]>([])
  /** Hovered bar as an index into the FULL series. */
  const [hover, setHover] = useState<number | null>(null)
  const [full, setFull] = useState(false)
  const [tool, setTool] = useState<Tool>('cursor')
  const [draws, setDraws] = useState<Drawing[]>([])
  const [sel, setSel] = useState<string | null>(null)
  const [draft, setDraft] = useState<Drawing | null>(null)
  const draftRef = useRef<Drawing | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [size, setSize] = useState({ w: DEFAULT_W, h: DEFAULT_H })
  const [zone, setZone] = useState<Zone>('plot')
  /** Free crosshair (exact pointer position) while a drawing tool is active. */
  const [cross, setCross] = useState<{ px: number; py: number } | null>(null)
  const [grabbing, setGrabbing] = useState(false)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const menuRef = useRef<HTMLDetailsElement | null>(null)
  const gest = useRef<Gesture | null>(null)
  const ptrs = useRef(new Map<number, { px: number; py: number }>())

  /** The window a range pill asks for: the last N days, plus 4% of air. */
  const windowFor = useCallback((r: Range): Win => {
    if (len < 2) return { a: 0, b: Math.max(2, len) }
    let a = 0
    if (DAYS[r] !== Infinity) {
      const since = new Date(new Date(bars[len - 1].date).getTime() - DAYS[r] * 86400_000).toISOString().slice(0, 10)
      a = bars.findIndex((b) => b.date >= since)
      if (a < 0) a = 0
      if (len - a < 2) a = Math.max(0, len - 2)
    }
    return { a, b: len + (len - a) * 0.04 }
  }, [bars, len])
  const [win, setWin] = useState<Win>(() => windowFor('y1'))
  /** Manual price scale in TRANSFORMED space (log or linear); null = fit. */
  const [pr, setPr] = useState<{ lo: number; hi: number } | null>(null)
  const winRef = useRef(win); winRef.current = win
  const sizeRef = useRef(size); sizeRef.current = size

  const resetView = useCallback((r: Range) => {
    setWin(windowFor(r)); setPr(null); setHover(null)
  }, [windowFor])
  const pickRange = (r: Range) => { setRange(r); resetView(r) }
  /* A different symbol's bars: start over. */
  useEffect(() => { resetView('y1'); setRange('y1') }, [sym, resetView])
  useEffect(() => { if (tool === 'cursor') setCross(null) }, [tool])
  /* A manual scale means nothing across a log/linear switch. */
  useEffect(() => { setPr(null) }, [logScale])

  /* Real size, so text and strokes never scale with the viewBox and a
     fullscreen chart really fills the screen. The observer watches the HTML
     stage, not the <svg>: for an SVG element ResizeObserver reports the
     drawing's bounding box, not its CSS box. */
  const stageRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const measure = () => {
      const r = svgRef.current?.getBoundingClientRect()
      if (r && r.width > 0 && r.height > 0) setSize({ w: Math.round(r.width), h: Math.round(r.height) })
    }
    const ro = new ResizeObserver(measure)
    ro.observe(stage)
    measure()
    return () => ro.disconnect()
  }, [len, full])

  /* Wheel: zoom about the cursor; a horizontal wheel (trackpad) or shift
     pans. Native and non-passive — see the header. */
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (draftRef.current) return
      const r = el.getBoundingClientRect()
      const { w } = sizeRef.current
      const pw = w - PL - PR
      const px = (e.clientX - r.left) / r.width * w
      const { a, b } = winRef.current
      const span = b - a
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1
      if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        const d = ((e.deltaX || e.deltaY) * unit) / pw * span
        setWin(clampWin(len, a + d, b + d))
      } else {
        const f = Math.exp(e.deltaY * unit * 0.0015)
        const at = a + ((px - PL) / pw) * span
        const ns = span * f
        const na = at - ((px - PL) / pw) * ns
        setWin(clampWin(len, na, na + ns))
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [len])

  /* A <details> menu left open swallows the next click somewhere else on the
     page, so close it when the pointer goes elsewhere. */
  useEffect(() => {
    const away = (e: MouseEvent) => {
      const el = menuRef.current
      if (el?.open && !el.contains(e.target as Node)) el.open = false
    }
    document.addEventListener('pointerdown', away)
    return () => document.removeEventListener('pointerdown', away)
  }, [])

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

  /* Moving averages over the FULL series, once; the view only slices. */
  const maAll = useMemo(() => {
    const m: Record<number, (number | null)[]> = {}
    for (const n of MAS) m[n] = sma(bars, n)
    return m
  }, [bars])

  /* Window-level gesture listeners — see «Gestures» below. Declared here,
     above the early return, because they are hooks. */
  const winRefs = useRef<{ move: (e: PointerEvent) => void; up: (e: PointerEvent) => void } | null>(null)
  const detachWindow = useCallback(() => {
    const w = winRefs.current
    if (!w) return
    window.removeEventListener('pointermove', w.move)
    window.removeEventListener('pointerup', w.up)
    window.removeEventListener('pointercancel', w.up)
    winRefs.current = null
  }, [])
  useEffect(() => detachWindow, [detachWindow])

  if (len < 2) return <p className="id-note">{C.noSeries}</p>

  /* ── Geometry ─────────────────────────────────────────────────────────── */
  const W = size.w, H = size.h
  const PW = W - PL - PR
  const H_PRICE = Math.max(80, H - PT - GAP - H_VOL - PB)
  const Y_VOL = PT + H_PRICE + GAP + H_VOL
  const span = win.b - win.a
  const x = (i: number) => PL + ((i - win.a) / span) * PW
  const iOfX = (px: number) => win.a + ((px - PL) / PW) * span
  /* Visible bars, including the partial ones at either edge; the plot is
     clipped so they are cut by the frame rather than popping in and out. */
  const i0 = Math.max(0, Math.floor(win.a)), i1 = Math.min(len, Math.ceil(win.b) + 1)
  const pts = bars.slice(i0, i1)
  const lastVis = Math.max(0, Math.min(len - 1, i1 - 1))

  const tf = (v: number) => (logScale ? Math.log(Math.max(1e-6, v)) : v)
  const inv = (u: number) => (logScale ? Math.exp(u) : u)
  let yLo: number, yHi: number
  if (pr) { yLo = pr.lo; yHi = pr.hi } else {
    const src = pts.length ? pts : bars.slice(-2)
    const lo = Math.min(...src.map((p) => (view === 'candles' ? p.low : p.close)))
    const hi = Math.max(...src.map((p) => (view === 'candles' ? p.high : p.close)))
    const pad = (hi - lo) * 0.08 || Math.max(0.01, hi * 0.02)
    yLo = tf(logScale && lo - pad <= 0 ? lo * 0.9 : lo - pad)
    yHi = tf(hi + pad)
  }
  const ySpan = yHi - yLo || 1
  const y = (v: number) => PT + (1 - (tf(v) - yLo) / ySpan) * H_PRICE
  const pOfY = (py: number) => inv(yLo + (1 - (py - PT) / H_PRICE) * ySpan)
  const bw = Math.max(1, (PW / span) * 0.66)

  const vMax = Math.max(1, ...pts.map((p) => p.volume))
  const vy = (v: number) => Y_VOL - (v / vMax) * H_VOL

  const seg = (from: number, to: number, val: (i: number) => number | null) => {
    let d = '', pen = false
    for (let i = from; i < to; i++) {
      const v = val(i)
      if (v == null) { pen = false; continue }
      d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`
      pen = true
    }
    return d
  }
  const line = seg(i0, i1, (i) => bars[i].close)
  const area = pts.length ? `${line} L${x(i1 - 1).toFixed(1)},${PT + H_PRICE} L${x(i0).toFixed(1)},${PT + H_PRICE} Z` : ''
  const up = pts.length ? pts[pts.length - 1].close >= pts[0].close : true
  const ticks = niceTicks(inv(yLo), inv(yHi))
  const shownI = hover ?? lastVis
  const shown = bars[shownI]
  const prevOf = shownI > 0 ? bars[shownI - 1] : null
  const chg = prevOf && prevOf.close > 0 ? ((shown.close - prevOf.close) / prevOf.close) * 100 : null
  const nf = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const vf = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 })

  /* Watermark in the emptier half of the price pane, so it never sits on
     the line — the same rule the index chart follows. */
  const mid = Math.floor(pts.length / 2)
  const mean = (a: Bar[]) => a.reduce((z, p) => z + p.close, 0) / Math.max(1, a.length)
  const markX = mean(pts.slice(0, mid)) <= mean(pts.slice(mid)) ? x(i0 + Math.floor(mid / 2)) : x(i0 + mid + Math.floor(mid / 2))
  const markY = PT + H_PRICE * 0.3

  /* Date labels: about one per 150px of plot, on real bars, kept off the
     frame edges. Full year on long windows: a two-digit suffix rendered
     «22 نوفمبر 22», where the day and the year read as the same number. */
  const labels: { i: number; label: string }[] = []
  {
    const nLab = Math.max(2, Math.min(8, Math.round(PW / 150)))
    const long = span > 200
    for (let k = 0; k < nLab; k++) {
      const i = Math.round(i0 + (k / (nLab - 1)) * (i1 - 1 - i0))
      if (i < 0 || i >= len) continue
      const lx = x(i)
      if (lx < PL + 34 || lx > W - PR - 34) continue
      if (labels.some((l) => Math.abs(x(l.i) - lx) < 90)) continue
      labels.push({ i, label: shortDate(bars[i].date, locale) + (long ? ` ${bars[i].date.slice(0, 4)}` : '') })
    }
  }

  /** Screen-space distance from a click to a shape, for selection. */
  function hitDist(d: Drawing, px: number, py: number): number {
    if (d.kind === 'hline') return Math.abs(py - y(d.p))
    const ax = x(d.a.i), ay = y(d.a.p), bx = x(d.b.i), by = y(d.b.p)
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

  /** Pointer position in the SVG's own coordinates (1:1 with CSS pixels). */
  function svgPos(e: { clientX: number; clientY: number }): { px: number; py: number } {
    const r = svgRef.current?.getBoundingClientRect()
    if (!r || !r.width || !r.height) return { px: 0, py: 0 }
    return { px: (e.clientX - r.left) / r.width * W, py: (e.clientY - r.top) / r.height * H }
  }
  const zoneAt = (px: number, py: number): Zone => (px > W - PR ? 'paxis' : py > Y_VOL ? 'taxis' : 'plot')

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
      const dx = Math.abs(x(cur.b.i) - x(cur.a.i))
      const dy = Math.abs(y(cur.b.p) - y(cur.a.p))
      if (dx < 4 && dy < 4) return
    }
    setDraws((list) => [...list, cur])
    setSel(cur.id)
    setTool('cursor')
  }

  /* ── Gestures ─────────────────────────────────────────────────────────── */
  type PE = { clientX: number; clientY: number; pointerId: number; pointerType?: string; button?: number }

  /* Once a press starts, the move and release are read from the WINDOW, not
     the element: a fast drag leaves the plot, and pointer capture is not
     something every browser honours on an inline SVG. The listeners live
     only for the gesture. */
  const attachWindow = () => {
    if (winRefs.current) return
    const move = (e: PointerEvent) => onMove(e)
    const up = (e: PointerEvent) => onUp(e)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    winRefs.current = { move, up }
  }

  function onDown(e: React.PointerEvent<SVGSVGElement>) {
    const { px, py } = svgPos(e)
    ptrs.current.set(e.pointerId, { px, py })
    if (ptrs.current.size === 2) {
      /* Second finger: whatever was happening becomes a pinch. */
      const [p, q] = Array.from(ptrs.current.values())
      draftRef.current = null; setDraft(null)
      gest.current = { kind: 'pinch', d0: Math.hypot(p.px - q.px, p.py - q.py) || 1, mx: (p.px + q.px) / 2, a0: win.a, b0: win.b }
      setGrabbing(true)
      return
    }
    if (e.button !== 0 && e.pointerType === 'mouse') return
    e.preventDefault()
    attachWindow()
    const z = zoneAt(px, py)
    if (z === 'paxis') { gest.current = { kind: 'paxis', y0: py, lo0: yLo, hi0: yHi }; setGrabbing(true); return }
    if (z === 'taxis') { gest.current = { kind: 'taxis', x0: px, a0: win.a, b0: win.b }; setGrabbing(true); return }
    if (tool !== 'cursor') { startDraw(px, py); return }
    /* Cursor tool: a click either selects a shape or begins a pan. */
    const near = draws
      .map((d) => ({ d, dist: hitDist(d, px, py) }))
      .sort((m, n) => m.dist - n.dist)[0]
    if (near && near.dist <= HIT) { setSel(near.d.id); return }
    setSel(null)
    gest.current = { kind: 'pan', x0: px, y0: py, a0: win.a, b0: win.b, lo0: yLo, hi0: yHi }
    setGrabbing(true)
  }

  function onMove(e: PE) {
    const { px, py } = svgPos(e)
    if (ptrs.current.has(e.pointerId)) ptrs.current.set(e.pointerId, { px, py })
    const z = zoneAt(px, py)
    if (z !== zone) setZone(z)
    const inPlot = z === 'plot' && px >= PL && py >= PT && py <= Y_VOL
    /* A drawing tool gets a FREE crosshair — the exact pointer, not the
       nearest bar — so a shape can start and end anywhere. */
    if (tool !== 'cursor') setCross(inPlot || draftRef.current ? { px, py } : null)
    if (draftRef.current) { moveDraw(px, py); return }
    const g = gest.current
    if (g) {
      if (g.kind === 'pan') {
        const s0 = g.b0 - g.a0
        const shift = -((px - g.x0) / PW) * s0
        setWin(clampWin(len, g.a0 + shift, g.b0 + shift))
        const dy = py - g.y0
        if (Math.abs(dy) > 2 || pr) {
          const ys = g.hi0 - g.lo0
          setPr({ lo: g.lo0 + (dy / H_PRICE) * ys, hi: g.hi0 + (dy / H_PRICE) * ys })
        }
      } else if (g.kind === 'taxis') {
        /* Drag right = stretch time (zoom in), anchored at the last bar. */
        const f = Math.exp(-((px - g.x0) / PW) * 2)
        const s0 = g.b0 - g.a0
        const ns = Math.max(MIN_SPAN, Math.min(len * 1.5, s0 * f))
        setWin(clampWin(len, g.b0 - ns, g.b0))
      } else if (g.kind === 'paxis') {
        /* Drag down = expand the price range (zoom out), about its centre. */
        const f = Math.exp(((py - g.y0) / H_PRICE) * 2)
        const c = (g.lo0 + g.hi0) / 2, half = ((g.hi0 - g.lo0) / 2) * f
        setPr({ lo: c - half, hi: c + half })
      } else if (g.kind === 'pinch' && ptrs.current.size === 2) {
        const [p, q] = Array.from(ptrs.current.values())
        const d = Math.hypot(p.px - q.px, p.py - q.py) || 1
        const s0 = g.b0 - g.a0
        const ns = s0 * (g.d0 / d)
        const at = g.a0 + ((g.mx - PL) / PW) * s0
        const na = at - ((g.mx - PL) / PW) * ns
        setWin(clampWin(len, na, na + ns))
        return
      }
    }
    if (inPlot) {
      const i = Math.round(iOfX(px))
      setHover(i >= 0 && i < len ? i : null)
    } else setHover(null)
  }

  function onUp(e: PE) {
    ptrs.current.delete(e.pointerId)
    if (draftRef.current) endDraw()
    if (gest.current?.kind === 'pinch' && ptrs.current.size) return
    gest.current = null
    setGrabbing(false)
    detachWindow()
  }

  function onDouble(e: React.MouseEvent<SVGSVGElement>) {
    const { px, py } = svgPos(e)
    const z = zoneAt(px, py)
    if (z === 'paxis') setPr(null)
    else resetView(range)
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
      const live = Array.from(svg.querySelectorAll<SVGElement>('*'))
      Array.from(clone.querySelectorAll<SVGElement>('*')).forEach((el, k) => {
        const src = live[k]
        if (!src) return
        const s = getComputedStyle(src)
        el.setAttribute('fill', s.fill)
        el.setAttribute('stroke', s.stroke)
        el.setAttribute('stroke-width', s.strokeWidth)
        el.setAttribute('opacity', s.opacity)
        el.setAttribute('font-size', s.fontSize)
        el.setAttribute('font-weight', s.fontWeight)
      })
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

  const cursor = tool !== 'cursor' ? 'crosshair' : grabbing ? 'grabbing' : zone === 'paxis' ? 'ns-resize' : zone === 'taxis' ? 'ew-resize' : 'crosshair'
  const clip = `clip-${sym}`

  return (
    <div className={`cmp-chart ${full ? 'is-full' : ''} ${tool !== 'cursor' ? 'is-drawing' : ''}`.replace(/\s+/g, ' ').trim()}>
      <div className="cmp-tools">
        <div className="id-pills" role="group" aria-label={C.range}>
          {(['m1', 'm3', 'y1', 'y3', 'all'] as const).map((r) => (
            <button key={r} type="button" className="id-pill is-sm" aria-pressed={range === r} onClick={() => pickRange(r)}>{C.ranges[r]}</button>
          ))}
        </div>
        <div className="cmp-tools-end">
          {/* View, averages and scale live behind one control: eight pills
              across the top of a chart is a settings screen, not a chart. */}
          <details className="cmp-menu" ref={menuRef}>
            <summary className="cmp-ico" aria-label={K.settings}><Icon name="settings" /></summary>
            <div className="cmp-menu-body">
              <p className="cmp-menu-h">{K.view}</p>
              <div className="id-pills">
                {(['candles', 'line', 'area'] as const).map((v) => (
                  <button key={v} type="button" className="id-pill is-sm" aria-pressed={view === v} onClick={() => setView(v)}>{K[v]}</button>
                ))}
              </div>
              <p className="cmp-menu-h">{K.ma}</p>
              <div className="id-pills">
                {MAS.map((m) => (
                  <button key={m} type="button" className="id-pill is-sm" aria-pressed={mas.includes(m)}
                    onClick={() => setMas((cur) => cur.includes(m) ? cur.filter((z) => z !== m) : [...cur, m])}>{K.maN(String(m))}</button>
                ))}
              </div>
              <p className="cmp-menu-h">{K.scale}</p>
              <div className="id-pills">
                <button type="button" className="id-pill is-sm" aria-pressed={!logScale} onClick={() => setLogScale(false)}>{K.linear}</button>
                <button type="button" className="id-pill is-sm" aria-pressed={logScale} onClick={() => setLogScale(true)}>{K.log}</button>
              </div>
            </div>
          </details>
          <button type="button" className="cmp-ico" aria-label={K.reset} title={K.reset} onClick={() => resetView(range)}><Icon name="reset" /></button>
          <button type="button" className="cmp-ico" aria-label={full ? K.exitFullscreen : K.fullscreen} title={full ? K.exitFullscreen : K.fullscreen}
            aria-pressed={full} onClick={() => setFull((f) => !f)}><Icon name={full ? 'collapse' : 'expand'} /></button>
          <button type="button" className="cmp-ico" aria-label={K.download} title={msg ?? K.download} onClick={download}><Icon name="download" /></button>
        </div>
      </div>

      <div className="cmp-stage" ref={stageRef}>
        {/* The drawing rail sits ON the chart, as a chart's tools do.
            Physically left in BOTH locales: the time axis runs oldest → newest
            left to right whatever the page direction, so the rail belongs with
            it rather than flipping to the price axis. */}
        <div className="cmp-rail" role="toolbar" aria-label={K.draw} aria-orientation="vertical">
          {([['cursor', 'cursor'], ['trend', 'trend'], ['hline', 'hline'], ['rect', 'rect'], ['fib', 'fib']] as const).map(([tl, ic]) => (
            <button key={tl} type="button" className="cmp-rail-btn" aria-pressed={tool === tl} aria-label={K[tl]} title={K[tl]}
              onClick={() => { setTool(tl); setSel(null) }}><Icon name={ic} /></button>
          ))}
          {sel || draws.length ? <span className="cmp-rail-sep" aria-hidden="true" /> : null}
          {sel ? (
            <button type="button" className="cmp-rail-btn" aria-label={K.deleteOne} title={K.deleteOne}
              onClick={() => { setDraws((l) => l.filter((d) => d.id !== sel)); setSel(null) }}><Icon name="trash" /></button>
          ) : draws.length ? (
            <button type="button" className="cmp-rail-btn" aria-label={K.clearAll} title={K.clearAll}
              onClick={() => { setDraws([]); setSel(null) }}><Icon name="trash" /></button>
          ) : null}
        </div>

        {/* The legend sits ON the plot, top-left beside the rail, the way a
            chart's readout always has: the hovered session while a crosshair
            is up, the last session otherwise. The big price above the chart
            already says «what is it now»; this says «what was it then». */}
        <div className="cmp-legend-plot id-num" aria-live="polite">
          <span className="cmp-lg-date"><bdi>{localeDate(shown.date, locale)}</bdi></span>
          <span className={`cmp-lg-ohlc ${chg == null ? '' : chg > 0 ? 'id-up' : chg < 0 ? 'id-down' : ''}`.trim()}>
            <bdi><i>{K.o}</i>{nf.format(shown.open)}</bdi>
            <bdi><i>{K.h}</i>{nf.format(shown.high)}</bdi>
            <bdi><i>{K.l}</i>{nf.format(shown.low)}</bdi>
            <bdi><i>{K.c}</i>{nf.format(shown.close)}</bdi>
            {chg != null ? <bdi>{chg > 0 ? '+' : ''}{chg.toFixed(2)}%</bdi> : null}
          </span>
          <span className="cmp-lg-vol"><bdi><i>{K.volume}</i>{vf.format(shown.volume)}</bdi></span>
          {MAS.filter((n) => mas.includes(n)).map((n, k) => {
            const v = maAll[n][shownI]
            return <span key={n} className={`cmp-lg-ma is-ma${MAS.indexOf(n)}`} data-k={k}><bdi><i>{K.maN(String(n))}</i>{v == null ? '—' : nf.format(v)}</bdi></span>
          })}
        </div>

      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="cmp-svg id-num" role="img" aria-label={label}
        style={{ cursor }}
        onPointerDown={onDown}
        onPointerMove={(e) => { if (!winRefs.current) onMove(e) }}
        onPointerLeave={() => { if (!gest.current && !draftRef.current) { setHover(null); setCross(null) } }}
        onDragStart={(e) => e.preventDefault()}
        onDoubleClick={onDouble}>
        <defs>
          <clipPath id={clip}><rect x={PL} y={PT} width={PW} height={H_PRICE} /></clipPath>
          <clipPath id={`${clip}-v`}><rect x={PL} y={PT + H_PRICE + GAP} width={PW} height={H_VOL} /></clipPath>
        </defs>

        {ticks.map((v) => (
          <g key={v}>
            <line x1={PL} x2={W - PR} y1={y(v)} y2={y(v)} className="cmp-grid" />
            <text x={W - PR + 8} y={y(v)} className="cmp-tick">{nf.format(v)}</text>
          </g>
        ))}

        <text x={markX} y={markY} className="cmp-mark" aria-hidden="true">IRAQSM.COM</text>

        <g clipPath={`url(#${clip})`}>
          {view === 'candles' ? pts.map((p, k) => {
            const i = i0 + k
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

          {MAS.filter((n) => mas.includes(n)).map((n) => {
            const d = seg(Math.max(0, i0 - 1), Math.min(len, i1 + 1), (i) => maAll[n][i])
            return d ? <path key={n} d={d} className={`cmp-ma is-ma${MAS.indexOf(n)}`} /> : null
          })}
        </g>

        {/* Volume pane, on its own scale under the price. */}
        <line x1={PL} x2={W - PR} y1={Y_VOL} y2={Y_VOL} className="cmp-grid" />
        <g clipPath={`url(#${clip}-v)`}>
          {pts.map((p, k) => (
            <rect key={`v${p.date}`} x={x(i0 + k) - bw / 2} y={vy(p.volume)} width={bw} height={Math.max(0, Y_VOL - vy(p.volume))}
              className={`cmp-vol ${p.close >= p.open ? 'is-up' : 'is-down'}`} />
          ))}
        </g>

        {/* Drawings, clipped to the price pane so a shape panned out of view
            cannot spill over the axis or the volume pane. */}
        <g clipPath={`url(#${clip})`}>
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
            const ax = x(d.a.i), ay = y(d.a.p), bx = x(d.b.i), by = y(d.b.p)
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

        {cross ? (
          <g>
            <line x1={cross.px} x2={cross.px} y1={PT} y2={Y_VOL} className="cmp-cross" />
            <line x1={PL} x2={W - PR} y1={cross.py} y2={cross.py} className="cmp-cross" />
            <g className="cmp-cur">
              <rect x={W - PR + 2} y={cross.py - 9} width={PR - 6} height={18} rx="3" className="cmp-cur-tag" />
              <text x={W - PR + 6} y={cross.py} className="cmp-cur-text">{nf.format(pOfY(cross.py))}</text>
            </g>
          </g>
        ) : hover != null ? (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={PT} y2={Y_VOL} className="cmp-cross" />
            <line x1={PL} x2={W - PR} y1={y(bars[hover].close)} y2={y(bars[hover].close)} className="cmp-cross" />
            <circle cx={x(hover)} cy={y(bars[hover].close)} r="3.5" className="cmp-dot" />
            {/* The session under the crosshair, as a tag on the date axis. */}
            <g className="cmp-cur">
              <rect x={Math.max(PL, Math.min(W - PR - 96, x(hover) - 48))} y={Y_VOL + 4} width={96} height={18} rx="3" className="cmp-cur-tag" />
              <text x={Math.max(PL, Math.min(W - PR - 96, x(hover) - 48)) + 48} y={Y_VOL + 13} className="cmp-cur-text is-mid">{localeDate(bars[hover].date, locale)}</text>
            </g>
          </g>
        ) : null}

        {/* The price lives ON the axis, where a reader looks for it — the last
            close always, and the hovered close while a crosshair is up. The
            last-close badge is the one number the chart is really about, so
            it is drawn last and never clipped. */}
        {(() => {
          const lastC = bars[len - 1]
          const prevC = len > 1 ? bars[len - 2] : null
          const dir = prevC ? (lastC.close > prevC.close ? 'is-up' : lastC.close < prevC.close ? 'is-down' : '') : ''
          const ly = y(lastC.close)
          if (ly < PT - 9 || ly > PT + H_PRICE + 9) return null
          return (
            <g className={`cmp-last ${dir}`.trim()}>
              <line x1={PL} x2={W - PR} y1={ly} y2={ly} className="cmp-last-line" />
              <rect x={W - PR + 2} y={ly - 9} width={PR - 6} height={18} rx="3" className="cmp-last-tag" />
              <text x={W - PR + 6} y={ly} className="cmp-last-text">{nf.format(lastC.close)}</text>
            </g>
          )
        })()}
        {!cross && hover != null && hover !== len - 1 ? (
          <g className="cmp-cur">
            <rect x={W - PR + 2} y={y(bars[hover].close) - 9} width={PR - 6} height={18} rx="3" className="cmp-cur-tag" />
            <text x={W - PR + 6} y={y(bars[hover].close)} className="cmp-cur-text">{nf.format(bars[hover].close)}</text>
          </g>
        ) : null}
      </svg>
      </div>
      <p className="id-cap cmp-hint">{tool === 'cursor' ? K.zoomHint : K.drawHint}{draws.length ? ` · ${K.drawCount(String(draws.length))}` : ''}</p>
    </div>
  )
}
