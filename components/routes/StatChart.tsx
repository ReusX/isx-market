'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocale } from '@/context/LocaleContext'
import {
  iqd, iqdFull, nf0, bucketLabel, metricOf,
  type Bucket, type Grain, type MetricId,
} from '@/lib/statistics'

/**
 * The historical statistics chart — a direct transplant of the approved
 * `app/statistics/StatChart.tsx` from the reference app.
 *
 * ── Why canvas, when the rest of the page is DOM ──────────────────────────
 * «الكل» is ~2,600 sessions. Bucketed to months that is still ~137 columns,
 * and three things push this one to canvas:
 *
 *   1. EXPORT. The approved export re-renders the same `render()` at 2× into
 *      an offscreen canvas. A DOM chart cannot be exported without a second,
 *      divergent implementation of itself.
 *   2. The crosshair repaints on every pointer move — one repaint here, a
 *      class toggle on 137 nodes per frame in DOM.
 *   3. Axis labels need collision-aware thinning, which is a measurement
 *      problem: trivial with `measureText`, guesswork in CSS.
 *
 * ── What was adapted from the donor ───────────────────────────────────────
 * The donor's `Bucket` carries plain numbers. This repo's carries `number |
 * null` plus a `missing` count, because a session with no observation for a
 * metric is a GAP and must never be summed in as a zero. So the value reader
 * below returns null, a null bucket draws NOTHING rather than a zero-height
 * column, and the readout prints «—». That is the one behavioural difference,
 * and it exists to keep the truth rule the reference's mock data never had to
 * face.
 *
 * Chrome classes are namespaced `stw-` to sit beside the foreign-flow page's
 * own copy of the same component (`.ffw-st-chart-*`).
 */

type Theme = 'light' | 'dark'

type Palette = {
  ink: string; ink2: string; ink3: string
  grid: string; axis: string
  bar: string; barSoft: string; barOn: string
  cross: string; panel: string
}

const PALETTE: Record<Theme, Palette> = {
  light: {
    ink: '#1e2220', ink2: '#565c58', ink3: '#6e746f',
    grid: 'rgba(30,34,32,.07)', axis: 'rgba(30,34,32,.16)',
    bar: '#3171c6', barSoft: 'rgba(49,113,198,.28)', barOn: '#1d5bad',
    cross: 'rgba(30,34,32,.34)', panel: '#fbfbfa',
  },
  dark: {
    ink: '#f0efec', ink2: '#b4b6b2', ink3: '#9ea29c',
    grid: 'rgba(240,239,236,.075)', axis: 'rgba(240,239,236,.16)',
    bar: '#5aa0e8', barSoft: 'rgba(90,160,232,.26)', barOn: '#8cc0f5',
    cross: 'rgba(240,239,236,.36)', panel: '#1f1f1f',
  },
}

type RenderOpts = {
  buckets: Bucket[]
  metric: MetricId
  grain: Grain
  pal: Palette
  hover: number | null
  /** Export mode: draw the attribution lockup and skip the crosshair. */
  brand?: boolean
}

const PAD = { top: 14, right: 10, bottom: 26, left: 8 }
const AXIS_W = 54

/** Nice round ticks — a y-axis reading 0 / 1.37B / 2.74B is arithmetic, not a
 *  scale anyone reads. */
function ticks(max: number, count = 4): number[] {
  if (max <= 0) return [0]
  const raw = max / count
  const mag = Math.pow(10, Math.floor(Math.log10(raw)))
  const norm = raw / mag
  const step = (norm >= 5 ? 5 : norm >= 2 ? 2 : 1) * mag
  const out: number[] = []
  for (let v = 0; v <= max * 1.0001; v += step) out.push(v)
  return out
}

function render(ctx: CanvasRenderingContext2D, W: number, H: number, o: RenderOpts) {
  const { buckets, metric, pal } = o
  ctx.clearRect(0, 0, W, H)
  if (!buckets.length) return

  // RTL page, LTR chart: time runs oldest→newest left to right, matching every
  // other chart in the product. The axis column sits on the right, where an
  // Arabic reader looks first for the scale.
  const plotL = PAD.left
  const plotR = W - PAD.right - AXIS_W
  const plotT = PAD.top
  const plotB = H - PAD.bottom
  const plotW = Math.max(1, plotR - plotL)
  const plotH = Math.max(1, plotB - plotT)

  const values = buckets.map((b) => metricOf(b, metric))
  const max = Math.max(...values.map((v) => v ?? 0), 1)

  ctx.textBaseline = 'middle'
  ctx.font = '500 10px ui-sans-serif, system-ui, sans-serif'

  // ── Grid + y axis ───────────────────────────────────────────────────────
  for (const t of ticks(max)) {
    const y = Math.round(plotB - (t / max) * plotH) + 0.5
    ctx.strokeStyle = pal.grid
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(plotL, y); ctx.lineTo(plotR, y); ctx.stroke()
    ctx.fillStyle = pal.ink3
    ctx.textAlign = 'left'
    ctx.fillText(metric === 'trades' ? nf0.format(t) : iqd(t), plotR + 8, y)
  }

  // ── Columns ─────────────────────────────────────────────────────────────
  const slot = plotW / buckets.length
  const gap = slot > 6 ? Math.min(3, slot * 0.22) : slot > 2.4 ? 1 : 0
  const bw = Math.max(1, slot - gap)
  for (let i = 0; i < buckets.length; i++) {
    const v = values[i]
    // A bucket with no observation draws NOTHING. The gap is the statement;
    // a zero-height column would read as «it traded nothing», which is a
    // different and false claim.
    if (v == null) continue
    const h = (v / max) * plotH
    const x = plotL + i * slot + gap / 2
    // A bucket that is only partly covered is drawn lighter, so a summed bar
    // reading low cannot be mistaken for a complete observation.
    ctx.fillStyle = o.hover === i ? pal.barOn : buckets[i].missing > 0 ? pal.barSoft : pal.bar
    // Sub-pixel columns disappear inconsistently; snap the wide ones only.
    if (bw >= 2) ctx.fillRect(Math.round(x), Math.round(plotB - h), Math.round(bw), Math.max(1, Math.round(h)))
    else ctx.fillRect(x, plotB - h, bw, Math.max(1, h))
  }

  // ── x axis ──────────────────────────────────────────────────────────────
  ctx.strokeStyle = pal.axis
  ctx.beginPath()
  ctx.moveTo(plotL, Math.round(plotB) + 0.5)
  ctx.lineTo(plotR, Math.round(plotB) + 0.5)
  ctx.stroke()

  // Thinned by measured width, so labels never collide at any bucket count.
  ctx.fillStyle = pal.ink3
  ctx.textAlign = 'center'
  const label = (i: number) => shortAxis(buckets[i], o.grain)
  const sample = ctx.measureText(label(0)).width + 26
  const fits = Math.max(1, Math.floor(plotW / sample))
  const step = Math.max(1, Math.ceil(buckets.length / fits))
  // Walked backwards so the NEWEST bucket always gets a label — the one date a
  // reader checks first is the one a forward walk drops.
  for (let i = buckets.length - 1; i >= 0; i -= step) {
    const x = plotL + i * slot + slot / 2
    if (x < plotL + sample / 2 - 4) continue
    ctx.fillText(label(i), x, plotB + 13)
  }

  // ── Crosshair ───────────────────────────────────────────────────────────
  if (o.hover != null && !o.brand) {
    const x = Math.round(plotL + o.hover * slot + slot / 2) + 0.5
    ctx.strokeStyle = pal.cross
    ctx.lineWidth = 1
    ctx.setLineDash([3, 3])
    ctx.beginPath(); ctx.moveTo(x, plotT); ctx.lineTo(x, plotB); ctx.stroke()
    ctx.setLineDash([])
  }

  // ── Attribution · only on export ────────────────────────────────────────
  // On screen the page header already says whose chart this is. Attribution,
  // not a watermark.
  if (o.brand) {
    const m = 18, x0 = plotL + 8, y0 = plotT + 4
    ctx.globalAlpha = 0.9
    ctx.fillStyle = pal.bar
    roundRect(ctx, x0, y0, m, m, 5); ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.font = '700 9px ui-sans-serif, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('IQ', x0 + m / 2, y0 + m / 2 + 0.5)
    ctx.fillStyle = pal.ink3
    ctx.font = '500 9.5px ui-sans-serif, system-ui, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('iraqsm.com', x0 + m + 7, y0 + m / 2 + 0.5)
    ctx.globalAlpha = 1
  }
}

function shortAxis(b: Bucket, grain: Grain): string {
  const [y, m, d] = b.from.split('-')
  if (grain === 'month') return `${m}/${String(y).slice(2)}`
  return `${d}/${m}`
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

export function StatChart({ buckets, metric, grain, theme, unit, height = 320 }: {
  buckets: Bucket[]; metric: MetricId; grain: Grain; theme: Theme
  unit: string; height?: number
}) {
  const { t: T, locale } = useLocale()
  const st = T.statistics
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sizeRef = useRef({ w: 0, h: 0 })
  const [hover, setHover] = useState<number | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const pal = PALETTE[theme]

  const paint = useCallback(() => {
    const cv = canvasRef.current, wrap = wrapRef.current
    if (!cv || !wrap) return
    const w = wrap.clientWidth, h = height
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    if (sizeRef.current.w !== w || sizeRef.current.h !== h) {
      // ONLY the backing store is set here. The layout size stays with CSS
      // (`inline-size: 100%`), because an inline width beats the stylesheet:
      // if a resize notification is ever missed, a stale inline width leaves
      // the canvas hanging out of its container. With CSS owning layout the
      // worst a missed notification costs is a softly-scaled bitmap.
      cv.width = Math.round(w * dpr)
      cv.height = Math.round(h * dpr)
      sizeRef.current = { w, h }
    }
    const ctx = cv.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    render(ctx, w, h, { buckets, metric, grain, pal, hover })
  }, [buckets, metric, grain, pal, hover, height])

  useEffect(() => { paint() }, [paint])

  /**
   * The observer must OUTLIVE the renders.
   *
   * `paint` changes identity whenever the buckets, the metric or the hovered
   * column change, so an effect keyed on it disconnects and re-observes
   * constantly — and a viewport change landing between a teardown and the next
   * observe is never reported. Observe once, and call through a ref that always
   * holds the latest paint.
   */
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

  /** Bucket under the pointer, from the LIVE element size — a cached size
   *  after a layout change maps the pointer to the wrong column. */
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

  /** Export re-renders at 2× rather than scaling the on-screen bitmap, so the
   *  text in a shared PNG is type, not a blur. */
  async function exportPng(mode: 'download' | 'copy') {
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
    render(ctx, w, h, { buckets, metric, grain, pal, hover: null, brand: true })

    if (mode === 'download') {
      const a = document.createElement('a')
      a.href = off.toDataURL('image/png')
      a.download = `iqwealth-${metric}-${buckets[buckets.length - 1]?.key ?? 'chart'}.png`
      a.click()
      setCopied(st.downloaded)
    } else {
      try {
        const blob: Blob = await new Promise((res, rej) =>
          off.toBlob((b) => (b ? res(b) : rej(new Error('no blob'))), 'image/png'))
        // Racing the clipboard: `write` can hang indefinitely behind a
        // permission prompt, and a button that never resolves reads as broken.
        await Promise.race([
          navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]),
          new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 2500)),
        ])
        setCopied(st.copied)
      } catch {
        setCopied(st.copyFailed)
      }
    }
    setTimeout(() => setCopied(null), 2400)
  }

  const active = hover != null ? buckets[hover] : null
  const activeVal = active ? metricOf(active, metric) : null
  const isCount = metric === 'trades'
  const fmt = (v: number) => (isCount ? nf0.format(Math.round(v)) : iqdFull(v))

  return (
    <div className="stw-chart-wrap">
      <div className="stw-chart-bar">
        <div className="stw-readout stw-chart-read" aria-live="polite">
          {active ? (
            <>
              <span className="stw-readout-name">{bucketLabel(active, grain, locale)}</span>
              <span className="stw-read">
                <em>{unit}</em>
                {/* `—`, never 0: this bucket has no observation for the metric. */}
                <bdi>{activeVal == null ? '—' : fmt(activeVal)}</bdi>
              </span>
              {grain !== 'session' ? (
                <span className="stw-read"><em>{st.chartSessions}</em><bdi>{active.n}</bdi></span>
              ) : null}
              {grain !== 'session' && activeVal != null && active.n - active.missing > 0 ? (
                <span className="stw-read">
                  <em>{st.chartPerSession}</em>
                  {/* Divided by the sessions actually MEASURED, not by every
                      session in the bucket — dividing a partial sum by the full
                      count understates the average by exactly the gap. */}
                  <bdi>{fmt(activeVal / (active.n - active.missing))}</bdi>
                </span>
              ) : null}
              {active.missing > 0 ? (
                <span className="stw-read">
                  <em>{st.chartUnmeasured}</em><bdi>{active.missing}</bdi>
                </span>
              ) : null}
            </>
          ) : (
            <span className="stw-readout-hint">
              {st.chartHint}
            </span>
          )}
        </div>
        <div className="stw-chart-actions">
          {copied ? <span className="stw-copied" role="status">{copied}</span> : null}
          <button type="button" onClick={() => exportPng('copy')}>{st.copyImage}</button>
          <button type="button" onClick={() => exportPng('download')}>{st.downloadPng}</button>
        </div>
      </div>

      {/* Repainting on pointer-enter costs one frame and guarantees the chart is
          correct for the size it is in the moment anyone touches it. */}
      <div className="stw-chart-plot" ref={wrapRef} style={{ blockSize: `${height}px` }}
        onPointerEnter={() => paint()}>
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={st.chartCanvasLabel(
            String(buckets.length),
            iqd(Math.max(...buckets.map((b) => metricOf(b, metric) ?? 0), 0)),
          )}
          onPointerMove={(e) => setHover(indexAt(e.clientX))}
          onPointerDown={(e) => setHover(indexAt(e.clientX))}
          onPointerLeave={() => setHover(null)}
        />
      </div>
    </div>
  )
}
