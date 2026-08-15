'use client'

import { useEffect, useRef, useState, useCallback, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { compositeWatermark, downloadImage, copyImage } from '@/lib/watermark'
import { useChartTheme } from '@/lib/chartTheme'

/*
 * The palette now comes from lib/chartTheme.ts via `useChartTheme()`, which
 * reads `data-theme` and re-reads it on change. It used to be a module-level
 * const of 15 hard-coded TradingView dark values used in 89 places, with no
 * theme awareness at all — so this chart rendered dark on a light page, which
 * was already broken in production before the redesign.
 *
 * The DARK values are unchanged, so dark mode renders exactly as before.
 */

// ── Types ─────────────────────────────────────────────────────────────────────
type RawRow = {
  date: string
  open: number | null
  high: number | null
  low: number | null
  close: number | null
  volume: number | null
  value: number | null
}
type KlineBar = {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume?: number
  turnover?: number
}

// ── Timeframes ────────────────────────────────────────────────────────────────
type TFKey = '1W' | '1M' | '3M' | '1Y' | '5Y' | 'All'
type PeriodType = 'day' | 'week' | 'month'
const TF_CONFIG: Record<TFKey, { period: PeriodType; label: string }> = {
  '1W':  { period: 'day',   label: 'أسبوع' },
  '1M':  { period: 'day',   label: 'شهر' },
  '3M':  { period: 'day',   label: '3 أشهر' },
  '1Y':  { period: 'day',   label: 'سنة' },
  '5Y':  { period: 'week',  label: '5 سنوات' },
  'All': { period: 'month', label: 'الكل' },
}
const TF_KEYS = Object.keys(TF_CONFIG) as TFKey[]
const TF_MS: Record<TFKey, number> = {
  '1W': 7 * 86400_000, '1M': 30 * 86400_000, '3M': 90 * 86400_000,
  '1Y': 365 * 86400_000, '5Y': 5 * 365 * 86400_000, 'All': Infinity,
}

// ── Indicators ────────────────────────────────────────────────────────────────
type IndicatorDef = { name: string; label: string; desc: string; group: string; pane: 'candle' | 'new' }
// Curated for ISX: every indicator here derives cleanly from our daily OHLCV.
// We deliberately exclude volume-flow oscillators (OBV, MFI) and fast
// stochastics (KDJ, WR, CCI) · in a thin, low-liquidity market they whipsaw on
// single prints and zero-volume days, giving false signals. What remains are the
// price-based, must-have tools that stay accurate even on light trading.
const INDICATORS: IndicatorDef[] = [
  { name: 'MA',   label: 'المتوسط المتحرك',    desc: 'Moving Average · 5/10/30/60', group: 'المتوسطات', pane: 'candle' },
  { name: 'EMA',  label: 'المتوسط الأسي',      desc: 'Exponential Moving Average',   group: 'المتوسطات', pane: 'candle' },
  { name: 'BOLL', label: 'بولينجر باند',       desc: 'Bollinger Bands (20, ±2σ)',    group: 'المتوسطات', pane: 'candle' },
  { name: 'VOL',  label: 'حجم التداول',        desc: 'Volume',                       group: 'مؤشرات منفصلة', pane: 'new' },
  { name: 'MACD', label: 'ماكد',               desc: 'MACD (12, 26, 9)',             group: 'مؤشرات منفصلة', pane: 'new' },
  { name: 'RSI',  label: 'مؤشر القوة النسبية', desc: 'Relative Strength Index (14)', group: 'مؤشرات منفصلة', pane: 'new' },
]
const IND_GROUPS = Array.from(new Set(INDICATORS.map(i => i.group)))

// ── Drawing tools (only valid klinecharts v10 overlay templates) ────────────────
type DrawTool = { key: string; overlay: string; label: string; icon: JSX.Element }
const I = (path: JSX.Element) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{path}</svg>
)
const DRAW_TOOLS: DrawTool[] = [
  { key: 'cursor',   overlay: '',                       label: 'المؤشر',          icon: I(<><path d="M5 12h5M14 12h5M12 5v5M12 14v5" /><circle cx="12" cy="12" r="1.2" fill="currentColor" /></>) },
  { key: 'trend',    overlay: 'segment',                label: 'خط الاتجاه',      icon: I(<><line x1="4" y1="19" x2="20" y2="5" /><circle cx="4" cy="19" r="1.6" fill="currentColor" /><circle cx="20" cy="5" r="1.6" fill="currentColor" /></>) },
  { key: 'ray',      overlay: 'rayLine',                label: 'شعاع',            icon: I(<><line x1="4" y1="19" x2="20" y2="5" /><circle cx="4" cy="19" r="1.6" fill="currentColor" /></>) },
  { key: 'extended', overlay: 'straightLine',           label: 'خط ممتد',         icon: I(<><line x1="3" y1="20" x2="21" y2="4" /></>) },
  { key: 'hline',    overlay: 'horizontalStraightLine', label: 'خط أفقي',         icon: I(<><line x1="3" y1="12" x2="21" y2="12" /><circle cx="12" cy="12" r="1.6" fill="currentColor" /></>) },
  { key: 'vline',    overlay: 'verticalStraightLine',   label: 'خط عمودي',        icon: I(<><line x1="12" y1="3" x2="12" y2="21" /><circle cx="12" cy="12" r="1.6" fill="currentColor" /></>) },
  { key: 'parallel', overlay: 'parallelStraightLine',   label: 'قناة متوازية',    icon: I(<><line x1="3" y1="16" x2="21" y2="8" /><line x1="3" y1="20" x2="21" y2="12" /></>) },
  { key: 'fib',      overlay: 'fibonacciLine',          label: 'فيبوناتشي',       icon: I(<><line x1="4" y1="5" x2="20" y2="5" /><line x1="4" y1="10" x2="20" y2="10" /><line x1="4" y1="14" x2="20" y2="14" /><line x1="4" y1="19" x2="20" y2="19" /></>) },
  { key: 'text',     overlay: 'simpleAnnotation',       label: 'نص',              icon: I(<><path d="M5 6h14M12 6v13" /></>) },
]
const TrashIcon = I(<><path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M6 7l1 13a1 1 0 001 1h8a1 1 0 001-1l1-13" /></>)

// Hover tooltip · small label that appears beside/below a button on hover
function Tip({ label, side = 'right', children }: { label: string; side?: 'right' | 'bottom' | 'top'; children: ReactNode }) {
  const C = useChartTheme()
  const pos =
    side === 'right'  ? { left: '100%', marginLeft: 8, top: '50%', transform: 'translateY(-50%)' }
    : side === 'top'  ? { bottom: '100%', marginBottom: 8, left: '50%', transform: 'translateX(-50%)' }
    : { top: '100%', marginTop: 8, left: '50%', transform: 'translateX(-50%)' }
  return (
    <span className="relative group/tip inline-flex">
      {children}
      <span
        dir="rtl"
        className="pointer-events-none absolute z-[60] whitespace-nowrap rounded px-2 py-1 text-[11px] font-semibold opacity-0 transition-opacity duration-100 group-hover/tip:opacity-100 shadow-lg"
        style={{ background: '#2a2e39', color: '#eceef2', border: `1px solid ${C.crossBg}`, ...pos }}
      >{label}</span>
    </span>
  )
}

// ── Data aggregation ──────────────────────────────────────────────────────────
function toMs(date: string) { return new Date(date + 'T00:00:00Z').getTime() }

function aggregateDaily(rows: RawRow[]): KlineBar[] {
  return rows
    .filter(r => r.close != null && r.close > 0)
    .map(r => ({
      timestamp: toMs(r.date),
      open:     r.open    ?? r.close!,
      high:     r.high    ?? r.close!,
      low:      r.low     ?? r.close!,
      close:    r.close!,
      volume:   r.volume  ?? 0,
      turnover: r.value   ?? 0,
    }))
}

function aggregateByKey(rows: RawRow[], keyFn: (d: string) => string, tsDate: (k: string) => string): KlineBar[] {
  const groups = new Map<string, RawRow[]>()
  for (const r of rows) {
    if (!r.close || r.close <= 0) continue
    const k = keyFn(r.date)
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k)!.push(r)
  }
  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, rs]) => ({
      timestamp: toMs(tsDate(k)),
      open:     rs[0].open    ?? rs[0].close!,
      high:     Math.max(...rs.map(r => r.high ?? r.close!)),
      low:      Math.min(...rs.map(r => r.low  ?? r.close!)),
      close:    rs[rs.length - 1].close!,
      volume:   rs.reduce((s, r) => s + (r.volume ?? 0), 0),
      turnover: rs.reduce((s, r) => s + (r.value  ?? 0), 0),
    }))
}

function aggregateWeekly(rows: RawRow[]): KlineBar[] {
  return aggregateByKey(rows, date => {
    const d = new Date(date + 'T00:00:00Z')
    d.setUTCDate(d.getUTCDate() - d.getUTCDay())
    return d.toISOString().slice(0, 10)
  }, k => k)
}

function aggregateMonthly(rows: RawRow[]): KlineBar[] {
  return aggregateByKey(rows, date => date.slice(0, 7), k => k + '-01')
}

function getCandles(rows: RawRow[], period: PeriodType): KlineBar[] {
  if (period === 'week')  return aggregateWeekly(rows)
  if (period === 'month') return aggregateMonthly(rows)
  return aggregateDaily(rows)
}

// ── KChart Component ──────────────────────────────────────────────────────────
export default function KChart({ sym, name, fill = false }: { sym: string; name?: string; fill?: boolean }) {
  const C = useChartTheme()
  const containerRef  = useRef<HTMLDivElement>(null)
  const chartRef      = useRef<any>(null)
  const rawCache      = useRef<Map<string, RawRow[]>>(new Map())
  const paneIds       = useRef<Map<string, string>>(new Map())
  const disposeRef    = useRef<((el: HTMLDivElement) => void) | null>(null)
  const activeIndsRef = useRef<Set<string>>(new Set(['VOL']))

  const [tf, setTf]                   = useState<TFKey>('1Y')
  const [isFullscreen, setFullscreen] = useState(false)
  const [showIndicators, setShowIndicators] = useState(false)
  const [activeInds, setActiveInds]   = useState<Set<string>>(new Set(['VOL']))
  const [drawTool, setDrawTool]       = useState('cursor')
  const [chartType, setChartType]     = useState<'candle_solid' | 'area'>('candle_solid')
  const [indSearch, setIndSearch]     = useState('')
  const [loading, setLoading]         = useState(true)
  const [exportMsg, setExportMsg]     = useState('')
  const [bars, setBars]               = useState<KlineBar[]>([])
  const [cursorIdx, setCursorIdx]     = useState<number | null>(null)
  const [ctxMenu, setCtxMenu]         = useState<{ x: number; y: number } | null>(null)
  const [mounted, setMounted]         = useState(false)
  const [isMobile, setIsMobile]       = useState(false)

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 680)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  useEffect(() => { activeIndsRef.current = activeInds }, [activeInds])

  // ── Load raw data ───────────────────────────────────────────────────────────
  const fetchRaw = useCallback(async (ticker: string): Promise<RawRow[]> => {
    if (rawCache.current.has(ticker)) return rawCache.current.get(ticker)!
    const resp = await fetch(`/api/chart/${ticker}`)
    const data: RawRow[] = await resp.json()
    rawCache.current.set(ticker, data)
    return data
  }, [])

  // ── Refit the candles to fill the canvas (used on init + "reset view") ───────
  const fitView = useCallback((count: number) => {
    const chart = chartRef.current, el = containerRef.current
    if (!chart || !el || count <= 0) return
    // Keep only a tight right gap (a few px) so candles fill the canvas instead
    // of floating in blank space · important when a thin ISX name has few bars.
    chart.setOffsetRightDistance(12)
    const availW = Math.max(el.offsetWidth - 76, 200)
    const space = Math.min(Math.max(Math.floor(availW / count), 3), 60)
    chart.setBarSpace(space)
    chart.scrollToRealTime()
  }, [])

  // ── Init / refresh chart ──────────────────────────────────────────────────────
  // Re-runs on fullscreen toggle too: the container node changes (card ⇄ portal),
  // so we dispose the *captured* element and build fresh · which also refits the
  // window, fixing the "opens at the old zoom and looks unresponsive" problem.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    let cancelled = false

    ;(async () => {
      const { init, dispose } = await import('klinecharts')
      disposeRef.current = dispose
      if (cancelled) return

      const chart = init(el, {
        locale: 'en-US',
        timezone: 'Asia/Baghdad',
        styles: {
          grid: {
            show: true,
            horizontal: { show: true, size: 1, color: C.grid, style: 'solid' },
            vertical:   { show: true, size: 1, color: C.grid, style: 'solid' },
          },
          candle: {
            type: chartType,
            bar: {
              upColor: C.up, downColor: C.down, noChangeColor: C.muted,
              upBorderColor: C.up, downBorderColor: C.down, noChangeBorderColor: C.muted,
              upWickColor: C.up, downWickColor: C.down, noChangeWickColor: C.muted,
            },
            area: {
              lineSize: 2, lineColor: C.accent, value: 'close',
              backgroundColor: [
                { offset: 0, color: 'rgba(41,98,255,0.25)' },
                { offset: 1, color: 'rgba(41,98,255,0.01)' },
              ],
            },
            priceMark: {
              last: {
                show: true, upColor: C.up, downColor: C.down, noChangeColor: C.muted,
                line: { show: true, style: 'dashed', dashedValue: [4, 4], size: 1 },
                text: { show: true, size: 11, paddingLeft: 4, paddingRight: 4, paddingTop: 3, paddingBottom: 3, borderRadius: 2, color: '#ffffff' },
              },
              high: { show: true, color: C.muted, textSize: 10 },
              low:  { show: true, color: C.muted, textSize: 10 },
            },
            // Built-in OHLC tooltip off · we draw our own live legend
            tooltip: { showRule: 'none' },
          },
          indicator: {
            ohlc: { upColor: C.up, downColor: C.down, noChangeColor: C.muted },
            lines: [
              { size: 1, style: 'solid', smooth: false, color: '#2962ff' },
              { size: 1, style: 'solid', smooth: false, color: '#ff9800' },
              { size: 1, style: 'solid', smooth: false, color: '#e91e63' },
              { size: 1, style: 'solid', smooth: false, color: '#9c27b0' },
            ],
            bars:    [{ style: 'fill' as any, borderStyle: 'fill' as any, upColor: 'rgba(38,166,154,0.55)', downColor: 'rgba(239,83,80,0.55)', noChangeColor: C.muted }],
            tooltip: {
              showRule: 'always',
              showType: 'standard',
              title:  { show: true, showName: true, showParams: true, color: C.muted, size: 11, family: 'inherit', weight: 'normal' },
              legend: { color: C.text, size: 11, family: 'inherit', weight: 'normal' },
            },
          },
          xAxis: {
            show: true, size: 'auto',
            axisLine: { show: true, size: 1, color: C.border },
            tickLine: { show: true, size: 1, length: 3, color: C.border },
            tickText: { show: true, color: C.muted, size: 11, family: 'inherit', weight: 'normal', marginStart: 4, marginEnd: 4 },
          },
          yAxis: {
            show: true, size: 'auto',
            axisLine: { show: true, size: 1, color: C.border },
            tickLine: { show: true, size: 1, length: 3, color: C.border },
            tickText: { show: true, color: C.muted, size: 11, family: 'inherit', weight: 'normal', marginStart: 4, marginEnd: 4 },
          },
          separator: { size: 1, color: C.border, fill: true, activeBackgroundColor: 'rgba(42,46,57,0.6)' },
          crosshair: {
            show: true,
            horizontal: {
              show: true, line: { show: true, style: 'dashed', dashedValue: [4, 3], size: 1, color: C.cross },
              text: { show: true, size: 11, family: 'inherit', weight: 'normal', color: '#ffffff', paddingLeft: 4, paddingRight: 4, paddingTop: 3, paddingBottom: 3, borderSize: 0, borderColor: C.crossBg, borderRadius: 2, backgroundColor: C.crossBg },
            },
            vertical: {
              show: true, line: { show: true, style: 'dashed', dashedValue: [4, 3], size: 1, color: C.cross },
              text: { show: true, size: 11, family: 'inherit', weight: 'normal', color: '#ffffff', paddingLeft: 4, paddingRight: 4, paddingTop: 3, paddingBottom: 3, borderSize: 0, borderColor: C.crossBg, borderRadius: 2, backgroundColor: C.crossBg },
            },
          },
          overlay: {
            line:    { style: 'solid', smooth: false, size: 1, color: C.accent, dashedValue: [4, 2] },
            rect:    { style: 'fill', borderStyle: 'solid', color: 'rgba(41,98,255,0.12)', borderColor: C.accent, borderSize: 1 },
            polygon: { style: 'fill', borderStyle: 'solid', color: 'rgba(41,98,255,0.12)', borderColor: C.accent, borderSize: 1 },
            text:    { style: 'fill', color: '#ffffff', size: 12, family: 'inherit', weight: 'normal', backgroundColor: 'rgba(41,98,255,0.9)', borderRadius: 3, paddingLeft: 5, paddingRight: 5, paddingTop: 3, paddingBottom: 3 },
          },
        },
      })
      if (!chart || cancelled) return
      chartRef.current = chart

      chart.setSymbol({ ticker: sym.toUpperCase(), pricePrecision: 4, volumePrecision: 0 })
      chart.setPeriod({ type: TF_CONFIG[tf].period, span: 1 })

      chart.setDataLoader({
        async getBars(params: any) {
          if (cancelled) return
          const { symbol, period, callback } = params
          setLoading(true)
          try {
            const raw = await fetchRaw(symbol.ticker)
            const allBars = getCandles(raw, period.type as PeriodType)
            const startMs = tf === 'All' ? -Infinity : Date.now() - TF_MS[tf]
            const windowed = tf === 'All' ? allBars : allBars.filter(b => b.timestamp >= startMs)
            callback(windowed.length ? windowed : [], false)
            if (!cancelled) { setBars(windowed); setCursorIdx(null) }
            setTimeout(() => { if (!cancelled) fitView(windowed.length) }, 80)
          } finally {
            if (!cancelled) setLoading(false)
          }
        },
      })

      // Re-apply indicators (+ default Volume) so they survive every rebuild.
      // v10 signature: createIndicator(name, { pane: { id } }); overlays go on
      // the candle pane, oscillators get their own pane.
      paneIds.current.clear()
      for (const def of INDICATORS) {
        if (!activeIndsRef.current.has(def.name)) continue
        const id = def.pane === 'candle'
          ? chart.createIndicator(def.name, { pane: { id: 'candle_pane' } })
          : chart.createIndicator(def.name)
        if (id) paneIds.current.set(def.name, id)
      }

      chart.subscribeAction('onCrosshairChange', (data: any) => {
        if (cancelled) return
        const idx = data?.kLineData ? (data.dataIndex ?? data.realDataIndex ?? null) : null
        setCursorIdx(typeof idx === 'number' ? idx : null)
      })
    })()

    return () => {
      cancelled = true
      if (disposeRef.current) disposeRef.current(el)
      chartRef.current = null
      paneIds.current.clear()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  /* `C` is in the deps deliberately. klinecharts takes its palette at init(),
     so a theme toggle must rebuild the instance — this effect already disposes
     and rebuilds for chartType and isFullscreen, so it is a path that is
     exercised rather than a new one. The cost is that an in-session drawing is
     lost when the user switches theme; drawings are session-only by decision
     anyway, and a chart that stays dark on a white page is the worse defect. */
  }, [sym, tf, chartType, isFullscreen, C])

  // Fullscreen: lock body scroll, Escape to exit
  useEffect(() => {
    if (!isFullscreen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFullscreen(false) }
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey) }
  }, [isFullscreen])

  // Resize on any layout change
  useEffect(() => {
    const onResize = () => chartRef.current?.resize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // ── Indicator toggle ────────────────────────────────────────────────────────
  // Chart mutations happen OUTSIDE the state updater on purpose: React StrictMode
  // double-invokes set-state updaters in dev, which would create two indicators.
  const toggleIndicator = useCallback((ind: IndicatorDef) => {
    const chart = chartRef.current
    if (!chart) return
    const has = activeIndsRef.current.has(ind.name)
    if (has) {
      chart.removeIndicator({ name: ind.name })
      paneIds.current.delete(ind.name)
    } else {
      const id = ind.pane === 'candle'
        ? chart.createIndicator(ind.name, { pane: { id: 'candle_pane' } })
        : chart.createIndicator(ind.name)
      if (id) paneIds.current.set(ind.name, id)
    }
    setActiveInds(prev => {
      const next = new Set(prev)
      if (has) next.delete(ind.name); else next.add(ind.name)
      return next
    })
  }, [])

  const removeAllIndicators = useCallback(() => {
    const chart = chartRef.current
    if (!chart) return
    for (const name of Array.from(activeIndsRef.current)) chart.removeIndicator({ name })
    paneIds.current.clear()
    setActiveInds(new Set())
    setCtxMenu(null)
  }, [])

  // ── Drawing ───────────────────────────────────────────────────────────────────
  const activateDraw = useCallback((tool: DrawTool) => {
    const chart = chartRef.current
    if (!chart) return
    setDrawTool(tool.key)
    if (!tool.overlay) return
    if (tool.overlay === 'simpleAnnotation') {
      chart.createOverlay({ name: tool.overlay, extendData: 'نص' })
    } else {
      chart.createOverlay({ name: tool.overlay })
    }
  }, [])

  const clearDrawings = useCallback(() => {
    chartRef.current?.removeOverlay()
    setDrawTool('cursor')
  }, [])

  const resetView = useCallback(() => {
    fitView(bars.length)
    setCtxMenu(null)
  }, [bars.length, fitView])

  // ── Export ─────────────────────────────────────────────────────────────────────
  const exportImage = useCallback(async (mode: 'download' | 'copy') => {
    const chart = chartRef.current
    if (!chart) return
    try {
      const src = chart.getConvertPictureUrl(true, 'png', C.bg)
      const { blob, url } = await compositeWatermark(src, { bg: C.bg, label: sym.toUpperCase() })
      if (mode === 'download') {
        downloadImage(url, `${sym.toUpperCase()}-iqwealth.png`)
        setExportMsg('تم التنزيل ✓')
      } else {
        const ok = await copyImage(blob)
        setExportMsg(ok ? 'تم النسخ ✓' : 'النسخ غير مدعوم')
      }
    } catch { setExportMsg('تعذّر التصدير') }
    setTimeout(() => setExportMsg(''), 2000)
    /* `C.bg` is a real dependency: without it a theme toggle leaves this
       callback exporting a PNG with the previous theme's background, which
       looks like a corrupted image rather than a stale one. */
  }, [sym, C.bg])

  // ── Live OHLC legend ────────────────────────────────────────────────────────────
  const legendIdx = cursorIdx != null && cursorIdx >= 0 && cursorIdx < bars.length ? cursorIdx : bars.length - 1
  const legendBar = bars[legendIdx]
  const legendPrev = legendIdx > 0 ? bars[legendIdx - 1] : undefined
  const legendChg  = legendBar && legendPrev ? legendBar.close - legendPrev.close : 0
  const legendPct  = legendBar && legendPrev && legendPrev.close ? (legendChg / legendPrev.close) * 100 : 0
  const legendUp   = legendBar ? (legendPrev ? legendChg >= 0 : legendBar.close >= legendBar.open) : true
  const legColor   = legendUp ? C.up : C.down
  const fmtP = (n?: number) => (n == null ? '·' : n.toFixed(3))
  const fmtV = (n?: number) => {
    if (!n) return '·'
    if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B'
    if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M'
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
    return String(n)
  }
  const legendDate = legendBar
    ? new Date(legendBar.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : ''

  const filteredInds = indSearch
    ? INDICATORS.filter(i => i.label.includes(indSearch) || i.desc.toLowerCase().includes(indSearch.toLowerCase()) || i.name.toLowerCase().includes(indSearch.toLowerCase()))
    : INDICATORS

  // ── Reusable bits ───────────────────────────────────────────────────────────────
  const iconBtn = 'w-8 h-8 flex items-center justify-center rounded transition-colors'

  // ── Chart shell (used both inline and inside the fullscreen portal) ─────────────
  const shell = (
    <div
      dir="ltr"
      onClick={() => ctxMenu && setCtxMenu(null)}
      className="flex flex-col overflow-hidden select-none"
      style={isFullscreen
        ? { position: 'fixed', inset: 0, zIndex: 2147483000, background: C.bg }
        : { position: 'relative', borderRadius: fill ? 0 : 12, border: `1px solid ${C.border}`, background: C.bg, height: fill ? '100%' : undefined }}
    >
      {/* ── Top bar ── */}
      <div className="flex items-center gap-1 px-2 shrink-0" style={{ height: 46, borderBottom: `1px solid ${C.border}` }}>
        {/* Symbol block */}
        <div className="flex items-center gap-2 shrink-0" style={{ borderRight: `1px solid ${C.border}`, paddingRight: 8, marginRight: 2 }}>
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ background: C.accent }}>
            {sym.slice(0, 2).toUpperCase()}
          </div>
          <span className="text-[15px] font-bold" style={{ color: C.text }}>{sym.toUpperCase()}</span>
          {name && !isMobile && <span className="text-[12px] max-w-[180px] truncate" style={{ color: C.muted }}>{name}</span>}
        </div>

        {/* Chart type · hidden on mobile */}
        {!isMobile && (
          <div className="flex items-center gap-1 px-1.5" style={{ borderRight: `1px solid ${C.border}` }}>
            {([['candle_solid', '🕯', 'شموع'], ['area', '〜', 'خطي']] as const).map(([t, ic, lbl]) => {
              const on = chartType === t
              return (
                <Tip key={t} label={lbl} side="bottom">
                  <button onClick={() => setChartType(t)} aria-label={lbl} className={iconBtn}
                    style={{ color: on ? '#fff' : C.icon, background: on ? C.accent : 'transparent', fontWeight: 700 }}
                    onMouseEnter={e => { if (!on) { e.currentTarget.style.background = C.hover; e.currentTarget.style.color = '#fff' } }}
                    onMouseLeave={e => { if (!on) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.icon } }}>
                    {ic}
                  </button>
                </Tip>
              )
            })}
          </div>
        )}

        {/* Indicators · icon-only on mobile, with count badge */}
        <button onClick={() => setShowIndicators(v => !v)} aria-label="المؤشرات"
          className="flex items-center gap-1.5 rounded-md font-bold transition-colors shrink-0"
          style={{
            height: 32, padding: isMobile ? '0 8px' : '0 12px',
            color: showIndicators ? '#fff' : C.text,
            background: showIndicators ? C.accent : C.hover,
            fontSize: 13,
          }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 14l4-5 4 3 5-7 5 9" /></svg>
          {!isMobile && <>المؤشرات{activeInds.size > 0 ? ` (${activeInds.size})` : ''}</>}
          {isMobile && activeInds.size > 0 && (
            <span className="text-[11px] font-bold px-1 rounded-full" style={{ background: 'rgba(255,255,255,0.25)' }}>{activeInds.size}</span>
          )}
        </button>

        <div className="flex-1" />

        {exportMsg && <span className="text-[11px] font-semibold" style={{ color: C.accent }}>{exportMsg}</span>}

        {/* Export · hidden on mobile */}
        {!isMobile && <>
          <Tip label="تنزيل صورة PNG" side="bottom">
            <button onClick={() => exportImage('download')} aria-label="تنزيل" className={iconBtn} style={{ color: C.icon }}
              onMouseEnter={e => { e.currentTarget.style.background = C.hover; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.icon }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v11m0 0l-4-4m4 4l4-4M5 19h14" /></svg>
            </button>
          </Tip>
          <Tip label="نسخ الصورة" side="bottom">
            <button onClick={() => exportImage('copy')} aria-label="نسخ" className={iconBtn} style={{ color: C.icon }}
              onMouseEnter={e => { e.currentTarget.style.background = C.hover; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.icon }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 012-2h10" /></svg>
            </button>
          </Tip>
        </>}

        {/* Fullscreen · icon-only on mobile */}
        <button onClick={() => setFullscreen(v => !v)} aria-label={isFullscreen ? 'خروج' : 'ملء الشاشة'}
          className="flex items-center gap-1.5 rounded-md font-bold transition-colors shrink-0"
          style={{ height: 32, padding: isMobile ? '0 8px' : '0 12px', marginLeft: 4, color: '#fff', background: C.hover, fontSize: 13 }}>
          {isFullscreen
            ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 9L4 4m0 5V4h5M15 9l5-5m0 5V4h-5M9 15l-5 5m0-5v5h5M15 15l5 5m0-5v5h-5" /></svg>
            : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>}
          {!isMobile && (isFullscreen ? 'خروج' : 'ملء الشاشة')}
        </button>
      </div>

      {/* ── Body: left toolbar + canvas ── */}
      <div className="flex flex-1 min-h-0">
        {/* Left drawing toolbar · hidden on mobile (touch drawing is impractical) */}
        <div className="flex flex-col items-center gap-1 py-2 shrink-0"
          style={{ width: 48, borderRight: `1px solid ${C.border}`, display: isMobile ? 'none' : 'flex' }}>
          {DRAW_TOOLS.map(tool => {
            const on = drawTool === tool.key
            return (
              <Tip key={tool.key} label={tool.label} side="right">
                <button onClick={() => activateDraw(tool)} aria-label={tool.label}
                  className="w-9 h-9 flex items-center justify-center rounded-md transition-colors"
                  style={{ color: on ? '#fff' : C.icon, background: on ? C.accent : 'transparent' }}
                  onMouseEnter={e => { if (!on) { e.currentTarget.style.background = C.hover; e.currentTarget.style.color = '#fff' } }}
                  onMouseLeave={e => { if (!on) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.icon } }}>
                  {tool.icon}
                </button>
              </Tip>
            )
          })}
          <div className="my-1" style={{ height: 1, width: 24, background: C.border }} />
          <Tip label="مسح الرسومات" side="right">
            <button onClick={clearDrawings} aria-label="مسح الرسومات"
              className="w-9 h-9 flex items-center justify-center rounded-md transition-colors"
              style={{ color: C.icon }}
              onMouseEnter={e => { e.currentTarget.style.background = C.hover; e.currentTarget.style.color = C.down }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.icon }}>
              {TrashIcon}
            </button>
          </Tip>
        </div>

        {/* Canvas */}
        <div
          className="relative flex-1 min-w-0 min-h-0"
          style={{ minHeight: isFullscreen ? undefined : (fill ? 0 : isMobile ? 340 : 520) }}
          onContextMenu={e => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY }) }}
        >
          {/* Live OHLC legend */}
          {legendBar && !isMobile && (
            <div className="absolute top-2 left-2 z-20 pointer-events-none flex flex-col gap-1">
              <div className="flex items-center gap-2 text-[12px]" style={{ color: C.muted }}>
                <span className="font-bold" style={{ color: C.text }}>{sym.toUpperCase()}</span>
                {name && <span className="max-w-[180px] truncate">{name}</span>}
                <span style={{ color: C.faint }}>· {TF_CONFIG[tf].period === 'day' ? 'يومي' : TF_CONFIG[tf].period === 'week' ? 'أسبوعي' : 'شهري'} · {legendDate}</span>
              </div>
              <div className="flex items-center gap-2.5 text-[12px] flex-wrap" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {([['O', legendBar.open], ['H', legendBar.high], ['L', legendBar.low], ['C', legendBar.close]] as const).map(([k, v]) => (
                  <span key={k} className="flex items-center gap-1">
                    <span style={{ color: C.muted }}>{k}</span>
                    <span className="font-semibold" style={{ color: legColor }}>{fmtP(v)}</span>
                  </span>
                ))}
                <span className="font-semibold" style={{ color: legColor }}>
                  {legendChg >= 0 ? '+' : ''}{legendChg.toFixed(3)} ({legendPct >= 0 ? '+' : ''}{legendPct.toFixed(2)}%)
                </span>
                <span className="flex items-center gap-1">
                  <span style={{ color: C.muted }}>Vol</span>
                  <span className="font-semibold" style={{ color: C.text }}>{fmtV(legendBar.volume)}</span>
                </span>
              </div>
            </div>
          )}
          {/* Mobile: compact single-line legend */}
          {legendBar && isMobile && (
            <div className="absolute top-1.5 left-1.5 z-20 pointer-events-none flex items-center gap-2 text-[11px] rounded px-2 py-1"
              style={{ background: 'rgba(19,23,34,0.75)', fontVariantNumeric: 'tabular-nums' }}>
              <span className="font-bold" style={{ color: legColor }}>{fmtP(legendBar.close)}</span>
              <span className="font-semibold" style={{ color: legColor }}>
                {legendPct >= 0 ? '+' : ''}{legendPct.toFixed(2)}%
              </span>
              <span style={{ color: C.faint }}>{legendDate}</span>
            </div>
          )}

          {loading && (
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
              <div className="flex gap-1.5">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-1.5 h-6 rounded-full animate-pulse" style={{ background: C.accent, animationDelay: `${i * 150}ms` }} />
                ))}
              </div>
            </div>
          )}

          <div ref={containerRef} className="absolute inset-0" />

          {/* Watermark */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0" aria-hidden>
            <span className="font-extrabold tracking-tight" style={{ fontSize: 'clamp(22px, 5vw, 64px)', color: 'rgba(120,123,134,0.06)', transform: 'rotate(-10deg)' }}>iraqsm.com</span>
          </div>

          {/* Right-click context menu */}
          {ctxMenu && (
            <div className="fixed z-50 py-1 rounded-md shadow-2xl text-[13px]"
              style={{ top: ctxMenu.y, left: ctxMenu.x, background: C.panel, border: `1px solid ${C.border}`, minWidth: 180 }}>
              {[
                { label: 'إعادة ضبط العرض', act: resetView },
                { label: 'إزالة جميع المؤشرات', act: removeAllIndicators },
                { label: 'إزالة جميع الرسومات', act: () => { clearDrawings(); setCtxMenu(null) } },
                { label: isFullscreen ? 'خروج من ملء الشاشة' : 'ملء الشاشة', act: () => { setFullscreen(v => !v); setCtxMenu(null) } },
              ].map(item => (
                <button key={item.label} onClick={item.act}
                  className="w-full text-right px-3 py-1.5 transition-colors"
                  style={{ color: C.text }}
                  onMouseEnter={e => { e.currentTarget.style.background = C.hover }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom range bar ── */}
      <div className="flex items-center gap-1 px-2 shrink-0" style={{ height: isMobile ? 44 : 38, borderTop: `1px solid ${C.border}` }}>
        {TF_KEYS.map(t => (
          <Tip key={t} label={TF_CONFIG[t].label} side="top">
            <button onClick={() => setTf(t)}
              className="rounded-md font-bold transition-colors"
              style={{ height: isMobile ? 34 : 28, padding: isMobile ? '0 10px' : '0 12px', fontSize: isMobile ? 13 : 12, color: tf === t ? '#fff' : C.icon, background: tf === t ? C.accent : 'transparent' }}
              onMouseEnter={e => { if (tf !== t) { e.currentTarget.style.background = C.hover; e.currentTarget.style.color = '#fff' } }}
              onMouseLeave={e => { if (tf !== t) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.icon } }}>
              {t}
            </button>
          </Tip>
        ))}
        <div className="flex-1" />
        <span className="text-[11px]" style={{ color: C.faint }}>بغداد · GMT+3</span>
      </div>

      {/* ── Indicators modal ── */}
      {showIndicators && (
        <div
          className="z-40 flex items-start justify-center"
          style={isMobile
            ? { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', paddingTop: 0 }
            : { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', paddingTop: 64 }}
          onClick={() => setShowIndicators(false)}>
          <div className="flex flex-col overflow-hidden shadow-2xl"
            style={isMobile
              ? { width: '100%', height: '100%', background: C.panel, borderTop: `1px solid ${C.border}` }
              : { width: 420, maxHeight: '80%', borderRadius: 8, background: C.panel, border: `1px solid ${C.border}` }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 shrink-0" style={{ height: 52, borderBottom: `1px solid ${C.border}` }}>
              <span className="text-[15px] font-semibold" style={{ color: C.text }}>المؤشرات الفنية</span>
              <button onClick={() => setShowIndicators(false)} style={{ color: C.muted, fontSize: 20, lineHeight: 1 }}>✕</button>
            </div>
            <div className="px-4 py-3 shrink-0" style={{ borderBottom: `1px solid ${C.border}` }}>
              <input autoFocus={!isMobile} value={indSearch} onChange={e => setIndSearch(e.target.value)} placeholder="ابحث عن مؤشر..."
                className="w-full h-10 px-3 rounded text-[14px] outline-none"
                style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text }} />
            </div>
            <div className="overflow-y-auto flex-1 py-1">
              {(indSearch ? ['نتائج'] : IND_GROUPS).map(group => {
                const inds = filteredInds.filter(i => indSearch ? true : i.group === group)
                if (!inds.length) return null
                return (
                  <div key={group}>
                    {!indSearch && (
                      <div className="px-4 py-1.5 text-[10px] font-bold tracking-wider" style={{ color: C.faint }}>{group}</div>
                    )}
                    {inds.map(ind => {
                      const on = activeInds.has(ind.name)
                      return (
                        <button key={ind.name} onClick={() => toggleIndicator(ind)}
                          className="w-full flex items-center justify-between px-4 transition-colors text-right"
                          style={{ paddingTop: isMobile ? 14 : 8, paddingBottom: isMobile ? 14 : 8, background: 'transparent' }}
                          onMouseEnter={e => { e.currentTarget.style.background = C.hover }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                          <div>
                            <div className="text-[13px] font-medium" style={{ color: on ? C.accent : C.text }}>{ind.label}</div>
                            <div className="text-[11px]" style={{ color: C.muted }}>{ind.desc}</div>
                          </div>
                          {on && <span style={{ color: C.accent }}>✓</span>}
                        </button>
                      )
                    })}
                  </div>
                )
              })}
              {filteredInds.length === 0 && (
                <div className="px-4 py-8 text-center text-[13px]" style={{ color: C.muted }}>لا توجد نتائج</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )

  return isFullscreen && mounted ? createPortal(shell, document.body) : shell
}
