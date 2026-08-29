'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { MutableRefObject } from 'react'
import { useLocale } from '@/context/LocaleContext'
import { localeDateOrDash } from '@/lib/date'
import type { Messages } from '@/lib/i18n'
import type { Locale } from '@/lib/i18n/locale'
import { iqd, iqdFull, arFull, arShort, enShort, arMonthShort } from '@/lib/statistics'
import type { FlowBucket, FlowGrain } from '@/lib/foreignFlow'

/**
 * The foreign net-flow chart, ported from the reference's canvas
 * implementation. Two modes, and the distinction is the whole point.
 *
 *   'net'  signed columns from a shared zero rail. What happened DURING each
 *          bucket. Discrete — never joined by a line, because a line between
 *          two sessions asserts values in between that were never observed.
 *          The page this replaces drew exactly that line.
 *
 *   'cum'  a running balance across the selected window. A LINE is correct
 *          here and only here: a cumulative total genuinely has a value at
 *          every moment between two observations.
 *
 * Separate modes rather than a dual-axis overlay, because overlaying them
 * invites a comparison between a per-bucket quantity and a running total,
 * which is a comparison with no meaning.
 *
 * ── Why canvas, in an RTL page ────────────────────────────────────────────
 * Canvas coordinates are not mirrored by `direction: rtl`. The SVG chart on
 * /statistics needed physical offsets and `direction: ltr` on every HTML
 * overlay to stop the axes flipping; here the plot is simply drawn, and the
 * value axis sits in the right gutter exactly as the reference draws it.
 *
 * ── Holes ─────────────────────────────────────────────────────────────────
 * A bucket whose `net` is null holds no observation. It occupies its slot —
 * so the time axis stays true — and draws nothing. It is never a zero column
 * and never interpolated across.
 */

type Theme = 'light' | 'dark'
export type FlowMode = 'net' | 'cum'

type Palette = {
  ink: string; ink3: string; grid: string; axis: string; zero: string
  up: string; down: string; upDim: string; downDim: string
  line: string; fill: string; cross: string; panel: string; brand: string
}

/* The reference's two palettes, value for value. They are read here rather
   than pulled from the CSS variables because a canvas cannot inherit them,
   and because the chart must keep working if a token is ever renamed. */
const PALETTE: Record<Theme, Palette> = {
  light: {
    ink: '#1e2220', ink3: '#6e746f',
    grid: 'rgba(30,34,32,.07)', axis: 'rgba(30,34,32,.16)', zero: 'rgba(30,34,32,.34)',
    up: '#0e7350', down: '#a83926', upDim: 'rgba(14,115,80,.42)', downDim: 'rgba(168,57,38,.42)',
    line: '#3171c6', fill: 'rgba(49,113,198,.13)', cross: 'rgba(30,34,32,.34)',
    panel: '#fbfbfa', brand: '#3171c6',
  },
  dark: {
    ink: '#f0efec', ink3: '#9ea29c',
    grid: 'rgba(240,239,236,.075)', axis: 'rgba(240,239,236,.16)', zero: 'rgba(240,239,236,.38)',
    up: '#40d795', down: '#f4787d', upDim: 'rgba(64,215,149,.4)', downDim: 'rgba(244,120,125,.4)',
    line: '#5aa0e8', fill: 'rgba(90,160,232,.15)', cross: 'rgba(240,239,236,.36)',
    panel: '#1f1f1f', brand: '#5aa0e8',
  },
}

type Opts = {
  buckets: FlowBucket[]
  mode: FlowMode
  grain: FlowGrain
  pal: Palette
  hover: number | null
  brand?: boolean
}

const PAD = { top: 16, right: 10, bottom: 26, left: 8 }
const AXIS_W = 58

function ticks(lo: number, hi: number, count = 4): number[] {
  const span = hi - lo
  if (span <= 0) return [lo]
  const mag = Math.pow(10, Math.floor(Math.log10(span / count)))
  const norm = span / count / mag
  const step = (norm >= 5 ? 5 : norm >= 2 ? 2 : 1) * mag
  const out: number[] = []
  for (let v = Math.ceil(lo / step) * step; v <= hi * 1.0001; v += step) out.push(v)
  return out
}

const valueOf = (b: FlowBucket, mode: FlowMode) => (mode === 'net' ? b.net : b.cum)

function render(ctx: CanvasRenderingContext2D, W: number, H: number, o: Opts) {
  const { buckets, mode, pal } = o
  ctx.clearRect(0, 0, W, H)
  if (!buckets.length) return

  const plotL = PAD.left
  const plotR = W - PAD.right - AXIS_W
  const plotT = PAD.top
  const plotB = H - PAD.bottom
  const plotW = Math.max(1, plotR - plotL)
  const plotH = Math.max(1, plotB - plotT)

  const vals = buckets.map((b) => valueOf(b, mode))
  const seen = vals.filter((v): v is number => v != null)
  if (!seen.length) return

  /* Both modes are signed, so the scale always straddles zero and zero always
     sits at a real y — never implied at the bottom of the plot. */
  let hi = Math.max(...seen, 0), lo = Math.min(...seen, 0)
  if (hi === lo) { hi = hi || 1; lo = lo === 0 ? -1 : lo }
  const pad = (hi - lo) * 0.08
  hi += pad; lo -= pad
  const y = (v: number) => plotB - ((v - lo) / (hi - lo)) * plotH
  const yZero = y(0)

  ctx.textBaseline = 'middle'
  /* Canvas text obeys the element's inherited `direction`, and this page is
     RTL — without this the value axis prints «5.00B−», with the sign trailing
     the number it belongs to. (The reference app has exactly that defect; it
     is the one thing corrected in the port.) The axis is Latin figures, so it
     is drawn LTR. */
  ctx.direction = 'ltr'
  ctx.font = "500 10px ui-sans-serif, system-ui, sans-serif"

  for (const t of ticks(lo, hi)) {
    const ty = Math.round(y(t)) + 0.5
    ctx.strokeStyle = pal.grid
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(plotL, ty); ctx.lineTo(plotR, ty); ctx.stroke()
    ctx.fillStyle = pal.ink3
    ctx.textAlign = 'left'
    ctx.fillText((t > 0 ? '+' : t < 0 ? '−' : '') + iqd(Math.abs(t)), plotR + 8, ty)
  }

  const slot = plotW / buckets.length

  if (mode === 'net') {
    const gap = slot > 6 ? Math.min(3, slot * 0.22) : slot > 2.4 ? 1 : 0
    const bw = Math.max(1, slot - gap)
    for (let i = 0; i < buckets.length; i++) {
      const v = vals[i]
      if (v == null) continue // a hole keeps its slot and draws nothing
      const yv = y(v)
      const top = Math.min(yv, yZero), h = Math.max(1, Math.abs(yv - yZero))
      const x = plotL + i * slot + gap / 2
      const on = o.hover === i
      ctx.fillStyle = v >= 0
        ? (on ? pal.up : buckets.length > 200 ? pal.upDim : pal.up)
        : (on ? pal.down : buckets.length > 200 ? pal.downDim : pal.down)
      if (bw >= 2) ctx.fillRect(Math.round(x), Math.round(top), Math.round(bw), Math.round(h))
      else ctx.fillRect(x, top, bw, h)
    }
  } else {
    /* Area under the running balance, then the line. The fill is what makes a
       cumulative series read as an accumulated quantity rather than a price.
       Buckets before the window's first observation carry a null balance and
       are skipped, so the line starts where the record does. */
    const pts: { x: number; y: number }[] = []
    for (let i = 0; i < buckets.length; i++) {
      const v = vals[i]
      if (v == null) continue
      pts.push({ x: plotL + i * slot + slot / 2, y: y(v) })
    }
    if (pts.length > 1) {
      ctx.beginPath()
      ctx.moveTo(pts[0].x, yZero)
      for (const p of pts) ctx.lineTo(p.x, p.y)
      ctx.lineTo(pts[pts.length - 1].x, yZero)
      ctx.closePath()
      ctx.fillStyle = pal.fill
      ctx.fill()
    }

    ctx.beginPath()
    pts.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y) })
    ctx.strokeStyle = pal.line
    ctx.lineWidth = 1.8
    ctx.lineJoin = 'round'
    ctx.stroke()

    if (o.hover != null && vals[o.hover] != null) {
      const px = plotL + o.hover * slot + slot / 2, py = y(vals[o.hover] as number)
      ctx.fillStyle = pal.line
      ctx.beginPath(); ctx.arc(px, py, 3.4, 0, Math.PI * 2); ctx.fill()
      ctx.strokeStyle = pal.panel; ctx.lineWidth = 1.4; ctx.stroke()
    }
  }

  // Zero line last of the structure, so it reads over the bars it divides.
  ctx.strokeStyle = pal.zero
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(plotL, Math.round(yZero) + 0.5)
  ctx.lineTo(plotR, Math.round(yZero) + 0.5)
  ctx.stroke()

  // x axis, thinned by measured width so labels never collide.
  ctx.fillStyle = pal.ink3
  ctx.textAlign = 'center'
  const label = (i: number) => shortAxis(buckets[i], o.grain)
  const sample = ctx.measureText(label(buckets.length - 1)).width + 26
  const step = Math.max(1, Math.ceil(buckets.length / Math.max(1, Math.floor(plotW / sample))))
  for (let i = buckets.length - 1; i >= 0; i -= step) {
    const x = plotL + i * slot + slot / 2
    if (x < plotL + sample / 2 - 4) continue
    ctx.fillText(label(i), x, plotB + 13)
  }

  if (o.hover != null) {
    const x = Math.round(plotL + o.hover * slot + slot / 2) + 0.5
    ctx.strokeStyle = pal.cross
    ctx.setLineDash([3, 3])
    ctx.beginPath(); ctx.moveTo(x, plotT); ctx.lineTo(x, plotB); ctx.stroke()
    ctx.setLineDash([])
  }

  if (o.brand) {
    const m = 18, x0 = plotL + 8, y0 = plotT + 2
    ctx.globalAlpha = 0.9
    ctx.fillStyle = pal.brand
    roundRect(ctx, x0, y0, m, m, 5); ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.font = "700 9px ui-sans-serif, system-ui, sans-serif"
    ctx.textAlign = 'center'
    ctx.fillText('IQ', x0 + m / 2, y0 + m / 2 + 0.5)
    ctx.fillStyle = pal.ink3
    ctx.font = "500 9.5px ui-sans-serif, system-ui, sans-serif"
    ctx.textAlign = 'left'
    ctx.fillText('iraqsm.com', x0 + m + 7, y0 + m / 2 + 0.5)
    ctx.globalAlpha = 1
  }
}

function shortAxis(b: FlowBucket, grain: FlowGrain): string {
  const [y, m, d] = b.from.split('-')
  if (grain === 'year') return y
  if (grain === 'month') return `${m}/${y.slice(2)}`
  return `${d}/${m}`
}

/** A bucket's own label, at the grain it was built at. A weekly bucket
 *  labelled with one date reads as a session and is a lie about the number. */
/**
 * A bucket's title, in the reader's language.
 *
 * ⚠ Takes the dictionary rather than reading a hook: this is called from the
 * canvas draw path and from the parent's readout, neither of which is a
 * component body.
 */
export function bucketTitle(b: FlowBucket, grain: FlowGrain, f: Messages['flow'], locale: Locale): string {
  const short = (iso: string) => (locale === 'ar' ? arShort(iso) : enShort(iso))
  if (grain === 'year') return f.yearOf(b.key)
  if (grain === 'month') return locale === 'ar' ? arMonthShort(b.key) : b.key
  if (grain === 'session') return localeDateOrDash(b.from, locale)
  return f.weekOf(short(b.from), short(b.to), b.to.slice(0, 4))
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/**
 * The export handle the panel head drives.
 *
 * The Copy / Download buttons used to sit inside this component's own toolbar,
 * beside the hover readout, where three groups of controls competed with the
 * chart for the eye. They now live in the panel head with the mode toggle, so
 * the chart's own row carries the readout and nothing else. The export itself
 * still belongs here — it needs the canvas, the palette and the buckets — so
 * the component publishes it rather than the parent reimplementing it.
 */
export type FlowChartApi = { export: (kind: 'download' | 'copy') => Promise<void> }

export function FlowChart({ buckets, mode, grain, theme, height = 236, apiRef, onStatus }: {
  buckets: FlowBucket[]; mode: FlowMode; grain: FlowGrain; theme: Theme; height?: number
  apiRef?: MutableRefObject<FlowChartApi | null>
  onStatus?: (msg: string | null) => void
}) {
  const { t: T, locale } = useLocale()
  const f = T.flow
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sizeRef = useRef({ w: 0, h: 0 })
  const [hover, setHover] = useState<number | null>(null)
  const pal = PALETTE[theme]

  const paint = useCallback(() => {
    const cv = canvasRef.current, wrap = wrapRef.current
    if (!cv || !wrap) return
    const w = wrap.clientWidth, h = height
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    if (sizeRef.current.w !== w || sizeRef.current.h !== h) {
      /* Backing store only — layout stays with CSS, so a missed resize
         notification costs sharpness rather than breaking the page. */
      cv.width = Math.round(w * dpr)
      cv.height = Math.round(h * dpr)
      sizeRef.current = { w, h }
    }
    const ctx = cv.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    render(ctx, w, h, { buckets, mode, grain, pal, hover })
  }, [buckets, mode, grain, pal, hover, height])

  useEffect(() => { paint() }, [paint])

  const paintRef = useRef(paint)
  paintRef.current = paint
  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const run = () => paintRef.current()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(run) : null
    ro?.observe(wrap)
    window.addEventListener('resize', run)
    return () => { ro?.disconnect(); window.removeEventListener('resize', run) }
  }, [])

  function indexAt(clientX: number): number | null {
    const cv = canvasRef.current
    if (!cv || !buckets.length) return null
    const r = cv.getBoundingClientRect()
    const plotL = PAD.left, plotR = r.width - PAD.right - AXIS_W
    const x = clientX - r.left
    if (x < plotL || x > plotR) return null
    const i = Math.floor(((x - plotL) / Math.max(1, plotR - plotL)) * buckets.length)
    return Math.max(0, Math.min(buckets.length - 1, i))
  }

  async function exportPng(kind: 'download' | 'copy') {
    const wrap = wrapRef.current
    if (!wrap) return
    const w = wrap.clientWidth, h = height, scale = 2
    const off = document.createElement('canvas')
    off.width = w * scale; off.height = h * scale
    const ctx = off.getContext('2d')
    if (!ctx) return
    ctx.setTransform(scale, 0, 0, scale, 0, 0)
    ctx.fillStyle = pal.panel
    ctx.fillRect(0, 0, w, h)
    render(ctx, w, h, { buckets, mode, grain, pal, hover: null, brand: true })

    if (kind === 'download') {
      const a = document.createElement('a')
      a.href = off.toDataURL('image/png')
      a.download = `iraqsm-foreign-${mode}-${buckets[buckets.length - 1]?.key ?? 'chart'}.png`
      a.click()
      onStatus?.(f.downloaded)
    } else {
      try {
        const blob: Blob = await new Promise((res, rej) =>
          off.toBlob((b) => (b ? res(b) : rej(new Error('no blob'))), 'image/png'))
        await Promise.race([
          navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]),
          new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 2500)),
        ])
        onStatus?.(f.copied)
      } catch {
        onStatus?.(f.copyFailed)
      }
    }
    setTimeout(() => onStatus?.(null), 2400)
  }

  /* Published through a ref rather than passed down, so re-creating
     `exportPng` on every render never re-renders the panel head. */
  const exportRef = useRef(exportPng)
  exportRef.current = exportPng
  useEffect(() => {
    if (!apiRef) return
    apiRef.current = { export: (kind) => exportRef.current(kind) }
    return () => { apiRef.current = null }
  }, [apiRef])

  const active = hover != null ? buckets[hover] : null

  return (
    <div className="ffw-st-chart">
      {/* One row, one job: the readout. Copy / Download moved to the panel
          head so the chart is the only thing asking for attention here. */}
      <div className="ffw-pl-readout ffw-st-chart-read" aria-live="polite">
        {active ? (
          <>
            <span className="ffw-pl-readout-name">{bucketTitle(active, grain, f, locale)}</span>
            {active.n === 0 ? (
              <span className="ffw-pl-read"><em>{f.observed}</em><bdi>—</bdi></span>
            ) : mode === 'net' ? (
              <>
                <span className="ffw-pl-read"><em>{f.buying}</em><bdi className="positive">{iqdFull(active.buy)}</bdi></span>
                <span className="ffw-pl-read"><em>{f.selling}</em><bdi className="negative">{iqdFull(active.sell)}</bdi></span>
                <span className="ffw-pl-read"><em>{f.net}</em>
                  <bdi className={signClass(active.net)}>
                    {sign(active.net)}{iqdFull(Math.abs(active.net ?? 0))}
                  </bdi>
                </span>
              </>
            ) : (
              <>
                <span className="ffw-pl-read"><em>{f.cumulativeBalanceRead}</em>
                  <bdi className={signClass(active.cum)}>
                    {sign(active.cum)}{iqdFull(Math.abs(active.cum ?? 0))}
                  </bdi>
                </span>
                <span className="ffw-pl-read"><em>{f.periodNet}</em>
                  <bdi className={signClass(active.net)}>
                    {sign(active.net)}{iqd(Math.abs(active.net ?? 0))}
                  </bdi>
                </span>
              </>
            )}
            {grain !== 'session' ? (
              <span className="ffw-pl-read"><em>{f.sessions}</em><bdi>{active.n}</bdi></span>
            ) : null}
            {active.missing > 0 ? (
              <span className="ffw-pl-read"><em>{f.noData}</em><bdi>{active.missing}</bdi></span>
            ) : null}
          </>
        ) : (
          <span className="ffw-pl-readout-hint">
            {mode === 'net'
              ? f.hintNet
              : f.hintCum}
          </span>
        )}
      </div>

      <div className="ffw-st-chart-plot" ref={wrapRef} style={{ blockSize: `${height}px` }}
        onPointerEnter={() => paint()}>
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={mode === 'net'
            ? f.chartNetLabel(String(buckets.length))
            : f.chartCumLabel(String(buckets.length))}
          onPointerMove={(e) => setHover(indexAt(e.clientX))}
          onPointerDown={(e) => setHover(indexAt(e.clientX))}
          onPointerLeave={() => setHover(null)}
        />
      </div>
    </div>
  )
}

/* `—` for a bucket with no observation, a real sign for everything else.
   `0` keeps no sign and no colour: it is a measured balance, not a direction. */
const sign = (v: number | null) => (v == null ? '' : v > 0 ? '+' : v < 0 ? '−' : '')
const signClass = (v: number | null) => (v == null ? '' : v > 0 ? 'positive' : v < 0 ? 'negative' : '')
