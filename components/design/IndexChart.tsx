'use client'

import { type PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocale } from '@/context/LocaleContext'
import Link from 'next/link'

export type IndexRow = { date: string; isx60: number }

/* ── timeframes ────────────────────────────────────────────────────────────
 * There is no 1D option: `daily_index` carries one row per trading session
 * (the official ISX daily bulletin). We have no intraday tick feed, so a "1D"
 * view would be a single point — 1W is the shortest honest window.
 * DOM order is shortest-first so RTL lays them out with "كل" on the far left.
 */
const RANGES = [
  { id: '1W', label: '1W', days: 7 },
  { id: '1M', label: '1M', days: 31 },
  { id: '3M', label: '3M', days: 92 },
  { id: '1Y', label: '1Y', days: 365 },
  { id: '5Y', label: '5Y', days: 1826 },
  { id: 'ALL', label: null, days: Number.POSITIVE_INFINITY },
] as const

type RangeId = (typeof RANGES)[number]['id']

const W = 880
const H = 320
const PAD = { top: 14, right: 64, bottom: 24, left: 10 }
const PLOT_W = W - PAD.left - PAD.right
const PLOT_H = H - PAD.top - PAD.bottom

const priceFmt = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/* ── full-history loader ───────────────────────────────────────────────────
 * The homepage only ships the recent window. 5Y/ALL pull the rest on demand,
 * once per page load, paginated around PostgREST's 1000-row cap.
 */
let fullCache: IndexRow[] | null = null
let fullPromise: Promise<IndexRow[]> | null = null

export function loadFullHistory(): Promise<IndexRow[]> {
  if (fullCache) return Promise.resolve(fullCache)
  fullPromise ??= (async () => {
    const { createClient } = await import('@/lib/supabase/client')
    const sb = createClient()
    const out: IndexRow[] = []
    for (let from = 0; from < 40_000; from += 1000) {
      const { data, error } = await sb
        .from('daily_index')
        .select('date,isx60')
        .not('isx60', 'is', null)
        .order('date')
        .range(from, from + 999)
      if (error) throw error
      const page = (data ?? []) as IndexRow[]
      out.push(...page)
      if (page.length < 1000) break
    }
    fullCache = out
    return out
  })()
  return fullPromise
}

/** Round grid steps to 1/2/5 x 10^n so the axis reads in human numbers. */
function niceTicks(min: number, max: number, count = 5): number[] {
  const span = max - min || 1
  const raw = span / count
  const mag = 10 ** Math.floor(Math.log10(raw))
  const norm = raw / mag
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag
  const ticks: number[] = []
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) ticks.push(v)
  return ticks
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function axisDate(iso: string, spanDays: number): string {
  const [y, m, d] = iso.split('-')
  if (spanDays <= 45) return `${Number(d)} ${MONTHS[Number(m) - 1]}`
  if (spanDays <= 400) return MONTHS[Number(m) - 1]
  return y
}

export default function IndexChart({
  rows,
  loading = false,
  failed = false,
}: {
  rows: IndexRow[]
  loading?: boolean
  failed?: boolean
}) {
  const { t: T, locale, href: L } = useLocale()
  const ix = T.chart.index
  const [range, setRange] = useState<RangeId>('1Y')
  const [full, setFull] = useState<IndexRow[] | null>(fullCache)
  const [fullLoading, setFullLoading] = useState(false)
  const [active, setActive] = useState<{ i: number; x: number; y: number } | null>(null)
  const [toast, setToast] = useState('')
  const plotRef = useRef<HTMLDivElement>(null)

  const rangeDays = RANGES.find(r => r.id === range)!.days
  // The recent window shipped with the page can't answer 5Y/ALL — fetch the archive.
  const needsFull = rangeDays > 400

  useEffect(() => {
    if (!needsFull || full || fullLoading) return
    setFullLoading(true)
    loadFullHistory()
      .then(setFull)
      .catch(() => setToast(ix.archiveFailed))
      .finally(() => setFullLoading(false))
  }, [needsFull, full, fullLoading])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 2600)
    return () => clearTimeout(t)
  }, [toast])

  const source = needsFull && full ? full : rows

  const visible = useMemo(() => {
    if (!source.length) return [] as IndexRow[]
    if (!Number.isFinite(rangeDays)) return source
    const last = source[source.length - 1].date
    const cut = new Date(`${last}T00:00:00Z`)
    cut.setUTCDate(cut.getUTCDate() - rangeDays)
    const iso = cut.toISOString().slice(0, 10)
    const slice = source.filter(r => r.date >= iso)
    // A short window over a thin/holiday stretch can come back near-empty.
    return slice.length >= 2 ? slice : source.slice(-2)
  }, [source, rangeDays])

  const geo = useMemo(() => {
    if (visible.length < 2) {
      return { pts: [] as { x: number; y: number }[], line: '', area: '', yTicks: [] as { v: number; y: number }[], xTicks: [] as { label: string; x: number }[], lo: 0, hi: 0 }
    }
    const values = visible.map(r => r.isx60)
    const lo = Math.min(...values)
    const hi = Math.max(...values)
    const pad = (hi - lo || 1) * 0.08
    // An index never goes negative — don't let the breathing room invent a
    // "-0.00" gridline on the long windows.
    const dMin = Math.max(0, lo - pad)
    const dMax = hi + pad
    const yOf = (v: number) => PAD.top + PLOT_H - ((v - dMin) / (dMax - dMin)) * PLOT_H
    const pts = values.map((v, i) => ({
      x: PAD.left + (i / (values.length - 1)) * PLOT_W,
      y: yOf(v),
    }))
    const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
    const base = PAD.top + PLOT_H
    const area = `${line} L${pts[pts.length - 1].x.toFixed(1)},${base} L${pts[0].x.toFixed(1)},${base} Z`

    const yTicks = niceTicks(dMin, dMax).map(v => ({ v, y: yOf(v) }))

    const spanDays = Math.round(
      (Date.parse(visible[visible.length - 1].date) - Date.parse(visible[0].date)) / 86_400_000,
    )
    const wanted = Math.min(6, visible.length)
    const xTicks: { label: string; x: number }[] = []
    for (let k = 0; k < wanted; k++) {
      const i = Math.round((k / (wanted - 1 || 1)) * (visible.length - 1))
      const label = axisDate(visible[i].date, spanDays)
      // Drop only *adjacent* repeats: over a 1Y window the first and last tick
      // can share a month name a year apart, and both are worth showing.
      if (xTicks.length && xTicks[xTicks.length - 1].label === label) continue
      xTicks.push({ label, x: pts[i].x })
    }
    return { pts, line, area, yTicks, xTicks, lo, hi }
  }, [visible])

  const last = visible.length ? visible[visible.length - 1] : null
  const first = visible.length ? visible[0] : null
  const periodChange = last && first ? last.isx60 - first.isx60 : 0
  const periodPct = last && first && first.isx60 ? (periodChange / first.isx60) * 100 : 0
  const up = periodChange >= 0
  const busy = (loading && !rows.length) || (needsFull && fullLoading && !full)

  function onPointer(event: PointerEvent<HTMLDivElement>) {
    if (!geo.pts.length) return
    const rect = event.currentTarget.getBoundingClientRect()
    // SVG content is not mirrored by dir="rtl": oldest is drawn at the visual
    // left, so the pointer maps straight across.
    const ratio = (event.clientX - rect.left) / rect.width
    const plotRatio = (ratio * W - PAD.left) / PLOT_W
    const i = Math.max(0, Math.min(geo.pts.length - 1, Math.round(plotRatio * (geo.pts.length - 1))))
    setActive({ i, x: geo.pts[i].x, y: geo.pts[i].y })
  }

  /* ── PNG export ──────────────────────────────────────────────────────────
   * Drawn on a canvas rather than serialised from the DOM: a detached SVG
   * loses the CSS custom properties, so the exported image would come out
   * unstyled. Reading the resolved tokens keeps light/dark themes honest.
   */
  const renderCanvas = useCallback((): HTMLCanvasElement | null => {
    if (!geo.pts.length || !last || !first) return null
    const cs = getComputedStyle(document.documentElement)
    const v = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback
    const surface = v('--surface', '#17181c')
    const border = v('--border', '#24262b')
    const muted = v('--muted', '#6b6d74')
    const ink = v('--ink', v('--accent', '#d5d8de'))
    const accent = v('--accent', '#d5d8de')
    const tone = up ? v('--up', '#4fb37f') : v('--down', '#d9553f')

    const scale = 2
    const head = 78
    const canvas = document.createElement('canvas')
    canvas.width = W * scale
    canvas.height = (H + head) * scale
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.scale(scale, scale)

    ctx.fillStyle = surface
    ctx.fillRect(0, 0, W, H + head)

    /* Header: the title sits on the reading-start edge — right in Arabic,
       left in English — and the value opposite it. A canvas has no `dir`, so
       the alignment is chosen here rather than inherited. */
    const startX = locale === 'ar' ? W - 18 : 18
    const endX = locale === 'ar' ? 18 : W - 18
    ctx.textBaseline = 'alphabetic'
    ctx.textAlign = locale === 'ar' ? 'right' : 'left'
    ctx.fillStyle = ink
    ctx.font = '600 19px system-ui, -apple-system, "Segoe UI", sans-serif'
    ctx.fillText(ix.watermark, startX, 32)
    ctx.fillStyle = muted
    ctx.font = '13px system-ui, -apple-system, "Segoe UI", sans-serif'
    ctx.fillText(`${first.date} → ${last.date} · iraqsm.com`, startX, 54)

    ctx.textAlign = 'left'
    ctx.fillStyle = ink
    ctx.font = '700 26px ui-monospace, SFMono-Regular, Menlo, monospace'
    ctx.fillText(priceFmt.format(last.isx60), 18, 36)
    ctx.fillStyle = tone
    ctx.font = '600 14px ui-monospace, SFMono-Regular, Menlo, monospace'
    ctx.fillText(`${up ? '+' : ''}${periodChange.toFixed(2)} (${up ? '+' : ''}${periodPct.toFixed(2)}%)`, 18, 56)

    ctx.translate(0, head)

    // Watermark, under the plot so the line stays legible.
    ctx.save()
    ctx.globalAlpha = 0.1
    ctx.fillStyle = ink
    ctx.textAlign = 'center'
    ctx.font = '700 46px system-ui, -apple-system, "Segoe UI", sans-serif'
    ctx.fillText('iraqsm.com', PAD.left + PLOT_W / 2, PAD.top + PLOT_H / 2 + 16)
    ctx.restore()

    ctx.strokeStyle = border
    ctx.lineWidth = 1
    ctx.fillStyle = muted
    ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace'
    for (const t of geo.yTicks) {
      ctx.beginPath()
      ctx.moveTo(PAD.left, t.y)
      ctx.lineTo(PAD.left + PLOT_W, t.y)
      ctx.stroke()
      ctx.textAlign = 'left'
      ctx.fillText(priceFmt.format(t.v), PAD.left + PLOT_W + 8, t.y + 4)
    }
    ctx.textAlign = 'center'
    for (const t of geo.xTicks) {
      ctx.fillText(t.label, t.x, PAD.top + PLOT_H + 16)
    }

    const grad = ctx.createLinearGradient(0, PAD.top, 0, PAD.top + PLOT_H)
    grad.addColorStop(0, `${tone}55`)
    grad.addColorStop(1, `${tone}00`)
    ctx.fillStyle = grad
    ctx.beginPath()
    geo.pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
    ctx.lineTo(geo.pts[geo.pts.length - 1].x, PAD.top + PLOT_H)
    ctx.lineTo(geo.pts[0].x, PAD.top + PLOT_H)
    ctx.closePath()
    ctx.fill()

    ctx.strokeStyle = accent
    ctx.lineWidth = 2
    ctx.lineJoin = 'round'
    ctx.beginPath()
    geo.pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
    ctx.stroke()

    return canvas
  }, [geo, last, first, up, periodChange, periodPct, ix, locale])

  const toBlob = () =>
    new Promise<Blob | null>(resolve => {
      const canvas = renderCanvas()
      if (!canvas) return resolve(null)
      canvas.toBlob(resolve, 'image/png')
    })

  async function download() {
    const blob = await toBlob()
    if (!blob) return setToast(ix.nothingToExport)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ISX60-${range}-${last?.date ?? ''}.png`
    a.click()
    URL.revokeObjectURL(url)
    setToast(ix.downloaded)
  }

  function copy() {
    if (!geo.pts.length) return setToast(ix.nothingToCopy)
    if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) return void download()
    // ClipboardItem takes the *promise*, not an awaited blob: awaiting first
    // spends the click's user activation and the write is then rejected.
    const png = toBlob().then(blob => {
      if (!blob) throw new Error('render failed')
      return blob
    })
    navigator.clipboard
      .write([new ClipboardItem({ 'image/png': png })])
      .then(() => setToast(ix.copied))
      .catch(() => {
        setToast(ix.copyFellBack)
        void download()
      })
  }

  const activeRow = active ? visible[active.i] : null
  const lastPt = geo.pts.length ? geo.pts[geo.pts.length - 1] : null
  // Labels live in HTML, not SVG: the plot stretches with
  // preserveAspectRatio="none", which would distort any text drawn inside it.
  const pctX = (x: number) => `${(x / W) * 100}%`
  const pctY = (y: number) => `${(y / H) * 100}%`

  return (
    <div className="index-chart-block">
      <div className="chart-toolbar">
        <div className="chart-ranges" role="group" aria-label={ix.period}>
          {RANGES.map(r => (
            <button
              key={r.id}
              type="button"
              className={r.id === range ? 'chart-range-btn is-active' : 'chart-range-btn'}
              aria-pressed={r.id === range}
              onClick={() => { setRange(r.id); setActive(null) }}
            >
              {r.label ?? ix.rangeAll}
            </button>
          ))}
        </div>
        <div className="chart-tools">
          <button type="button" className="chart-tool-btn" onClick={copy} aria-label={ix.copyChart} title={ix.copyChartTitle}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>
          </button>
          <button type="button" className="chart-tool-btn" onClick={download} aria-label={ix.downloadChart} title={ix.downloadChartTitle}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11" /><path d="M7 11l5 5 5-5" /><path d="M5 20h14" /></svg>
          </button>
          <Link className="chart-tool-link" href={L('/charts')}>{ix.fullChart}</Link>
        </div>
      </div>

      <div
        ref={plotRef}
        className={busy ? 'chart-wrap chart-loading' : 'chart-wrap'}
        aria-label={ix.plotLabel}
        onPointerDown={onPointer}
        onPointerMove={onPointer}
        onPointerLeave={() => setActive(null)}
      >
        <svg className="index-chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={ix.plotLabel}>
          <defs>
            <linearGradient id="indexFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={up ? 'var(--up)' : 'var(--down)'} stopOpacity="0.26" />
              <stop offset="100%" stopColor={up ? 'var(--up)' : 'var(--down)'} stopOpacity="0" />
            </linearGradient>
          </defs>

          {geo.yTicks.map(t => (
            <line className="grid-line" key={t.v} x1={PAD.left} x2={PAD.left + PLOT_W} y1={t.y} y2={t.y} />
          ))}
          {geo.xTicks.map(t => (
            <line className="grid-line vertical" key={`v${t.x}`} x1={t.x} x2={t.x} y1={PAD.top} y2={PAD.top + PLOT_H} />
          ))}

          {geo.area ? <path className="index-area" d={geo.area} /> : null}
          {geo.line ? <path className={up ? 'index-line up' : 'index-line down'} d={geo.line} /> : null}

          {lastPt ? (
            <>
              <line
                className={up ? 'last-rule up' : 'last-rule down'}
                x1={PAD.left} x2={PAD.left + PLOT_W} y1={lastPt.y} y2={lastPt.y}
              />
              <circle className={up ? 'current-marker up' : 'current-marker down'} cx={lastPt.x} cy={lastPt.y} r="5" />
            </>
          ) : null}

          {active ? (
            <g className="crosshair-layer">
              <line className="crosshair-line" x1={active.x} x2={active.x} y1={PAD.top} y2={PAD.top + PLOT_H} />
              <circle className="crosshair-dot" cx={active.x} cy={active.y} r="4" />
            </g>
          ) : null}
        </svg>

        <span className="chart-watermark" style={{ left: pctX(PAD.left + PLOT_W / 2), top: pctY(PAD.top + PLOT_H / 2) }}>
          iraqsm.com
        </span>

        {/* Anchored to the container's right edge in px, not to a viewBox
            percentage: the gutter shrinks with the viewport and a percentage
            would push the labels outside the panel on phones. */}
        {geo.yTicks.map(t => (
          <span key={t.v} className="axis-label axis-y" style={{ right: 4, top: pctY(t.y) }}>
            {priceFmt.format(t.v)}
          </span>
        ))}
        {geo.xTicks.map((t, i) => (
          <span
            key={`${t.label}-${t.x}`}
            className={`axis-label axis-x${i === 0 ? ' at-start' : i === geo.xTicks.length - 1 ? ' at-end' : ''}`}
            style={{ left: pctX(t.x), top: pctY(PAD.top + PLOT_H + 12) }}
          >
            {t.label}
          </span>
        ))}

        {lastPt && last ? (
          <span className={up ? 'last-pill up' : 'last-pill down'} style={{ right: 2, top: pctY(lastPt.y) }}>
            {priceFmt.format(last.isx60)}
          </span>
        ) : null}

        {activeRow && active ? (
          <div
            className="chart-tooltip"
            style={{
              left: `${Math.min(88, Math.max(6, (active.x / W) * 100))}%`,
              right: 'auto',
              top: `${Math.min(74, Math.max(4, (active.y / H) * 100))}%`,
            }}
          >
            <bdi>{priceFmt.format(activeRow.isx60)}</bdi>
            <span>{activeRow.date}</span>
          </div>
        ) : null}

        {failed && !visible.length ? (
          <div className="chart-overlay">{ix.loadFailed}</div>
        ) : busy ? (
          <div className="chart-overlay">{ix.loading}</div>
        ) : null}
      </div>

      <div className="chart-footnote">
        {visible.length ? (
          <>
            <span>
              {ix.low} <bdi dir="ltr">{priceFmt.format(geo.lo)}</bdi>
            </span>
            <span>
              {ix.high} <bdi dir="ltr">{priceFmt.format(geo.hi)}</bdi>
            </span>
            <span className={up ? 'gain' : 'loss'}>
              {ix.change} <bdi dir="ltr">{up ? '+' : ''}{periodPct.toFixed(2)}%</bdi>
            </span>
            <span className="chart-sessions">
              <bdi>{visible.length}</bdi> {ix.sessionsUnit}
            </span>
          </>
        ) : null}
        {toast ? <span className="chart-toast" role="status">{toast}</span> : null}
      </div>
    </div>
  )
}
