'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { compositeWatermark, downloadImage, copyImage } from '@/lib/watermark'

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
  '1W':  { period: 'day',   label: '1 Week' },
  '1M':  { period: 'day',   label: '1 Month' },
  '3M':  { period: 'day',   label: '3 Months' },
  '1Y':  { period: 'day',   label: '1 Year' },
  '5Y':  { period: 'week',  label: '5 Years' },
  'All': { period: 'month', label: 'All' },
}
const TF_KEYS = Object.keys(TF_CONFIG) as TFKey[]
const TF_MS: Record<TFKey, number> = {
  '1W': 7 * 86400_000, '1M': 30 * 86400_000, '3M': 90 * 86400_000,
  '1Y': 365 * 86400_000, '5Y': 5 * 365 * 86400_000, 'All': Infinity,
}

// ── Indicators ────────────────────────────────────────────────────────────────
type IndicatorDef = { name: string; label: string; desc: string; group: string; pane: 'candle' | 'new' }
const INDICATORS: IndicatorDef[] = [
  // Overlays on candle pane
  { name: 'MA',   label: 'MA',             desc: 'Simple Moving Average',         group: 'Moving Averages', pane: 'candle' },
  { name: 'EMA',  label: 'EMA',            desc: 'Exponential Moving Average',    group: 'Moving Averages', pane: 'candle' },
  { name: 'BOLL', label: 'Bollinger',      desc: 'Bollinger Bands (20, ±2σ)',      group: 'Moving Averages', pane: 'candle' },
  { name: 'SAR',  label: 'Parabolic SAR',  desc: 'Parabolic Stop & Reverse',      group: 'Moving Averages', pane: 'candle' },
  // Sub-pane
  { name: 'VOL',  label: 'Volume',         desc: 'Trading Volume',                group: 'Volume',          pane: 'new' },
  { name: 'OBV',  label: 'OBV',            desc: 'On-Balance Volume',             group: 'Volume',          pane: 'new' },
  { name: 'MFI',  label: 'MFI',            desc: 'Money Flow Index',              group: 'Volume',          pane: 'new' },
  { name: 'VR',   label: 'Volume Ratio',   desc: 'Volume Ratio',                  group: 'Volume',          pane: 'new' },
  { name: 'MACD', label: 'MACD',           desc: 'MACD (12, 26, 9)',              group: 'Momentum',        pane: 'new' },
  { name: 'RSI',  label: 'RSI',            desc: 'Relative Strength Index (14)',  group: 'Momentum',        pane: 'new' },
  { name: 'KDJ',  label: 'Stochastic KDJ', desc: 'Stochastic Oscillator',        group: 'Momentum',        pane: 'new' },
  { name: 'CCI',  label: 'CCI',            desc: 'Commodity Channel Index (20)',  group: 'Momentum',        pane: 'new' },
  { name: 'WR',   label: "Williams %R",    desc: "Williams Percent Range (14)",   group: 'Momentum',        pane: 'new' },
  { name: 'MTM',  label: 'Momentum',       desc: 'Price Rate of Change',          group: 'Momentum',        pane: 'new' },
  { name: 'BIAS', label: 'BIAS',           desc: 'Bias Ratio from Moving Avg',    group: 'Momentum',        pane: 'new' },
  { name: 'DMI',  label: 'ADX / DMI',      desc: 'Average Directional Index',     group: 'Trend',           pane: 'new' },
  { name: 'TRIX', label: 'TRIX',           desc: 'Triple Exponential Average',    group: 'Trend',           pane: 'new' },
  { name: 'EMV',  label: 'EMV',            desc: 'Ease of Movement',              group: 'Trend',           pane: 'new' },
  { name: 'DPO',  label: 'DPO',            desc: 'Detrended Price Oscillator',    group: 'Trend',           pane: 'new' },
  { name: 'PSY',  label: 'PSY',            desc: 'Psychological Line',            group: 'Other',           pane: 'new' },
  { name: 'BRAR', label: 'BRAR',           desc: 'Bull & Bear Ratio',             group: 'Other',           pane: 'new' },
  { name: 'CR',   label: 'CR',             desc: 'Price Momentum Indicator',      group: 'Other',           pane: 'new' },
]
const IND_GROUPS = Array.from(new Set(INDICATORS.map(i => i.group)))

// ── Drawing tools ─────────────────────────────────────────────────────────────
type DrawTool = { key: string; overlay: string; icon: string; label: string }
const DRAW_TOOLS: DrawTool[] = [
  { key: 'pointer',   overlay: '',                      icon: '↗', label: 'Select' },
  { key: 'trend',     overlay: 'segment',               icon: '⟋', label: 'Trend Line' },
  { key: 'ray',       overlay: 'rayLine',               icon: '→', label: 'Ray' },
  { key: 'hline',     overlay: 'horizontalStraightLine', icon: '—', label: 'Horizontal' },
  { key: 'vline',     overlay: 'verticalLine',          icon: '|', label: 'Vertical' },
  { key: 'arrow',     overlay: 'arrow',                 icon: '↑', label: 'Arrow' },
  { key: 'text',      overlay: 'text',                  icon: 'T', label: 'Text' },
  { key: 'fib',       overlay: 'fibonacciLine',         icon: 'ϕ', label: 'Fibonacci' },
  { key: 'priceline', overlay: 'priceLine',             icon: '$', label: 'Price Level' },
]

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
    d.setUTCDate(d.getUTCDate() - d.getUTCDay()) // Sunday-start week
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
export default function KChart({ sym }: { sym: string }) {
  const containerRef  = useRef<HTMLDivElement>(null)
  const chartRef      = useRef<any>(null)
  const rawCache      = useRef<Map<string, RawRow[]>>(new Map())
  const paneIds       = useRef<Map<string, string>>(new Map())
  const disposeRef    = useRef<((el: HTMLDivElement) => void) | null>(null)

  const [tf, setTf]               = useState<TFKey>('1Y')
  const [isFullscreen, setFullscreen] = useState(false)
  const [showIndicators, setShowIndicators] = useState(false)
  const [activeInds, setActiveInds]   = useState<Set<string>>(new Set())
  const [drawTool, setDrawTool]       = useState('pointer')
  const [chartType, setChartType]     = useState<'candle_solid' | 'area'>('candle_solid')
  const [indSearch, setIndSearch]     = useState('')
  const [loading, setLoading]         = useState(true)
  const [exportMsg, setExportMsg]     = useState('')

  // ── Load raw data ───────────────────────────────────────────────────────────
  const fetchRaw = useCallback(async (ticker: string): Promise<RawRow[]> => {
    if (rawCache.current.has(ticker)) return rawCache.current.get(ticker)!
    const resp = await fetch(`/api/chart/${ticker}`)
    const data: RawRow[] = await resp.json()
    rawCache.current.set(ticker, data)
    return data
  }, [])

  // ── Init or refresh chart when sym / tf / chartType changes ────────────────
  useEffect(() => {
    if (!containerRef.current) return
    let cancelled = false

    ;(async () => {
      const { init, dispose } = await import('klinecharts')
      disposeRef.current = dispose

      // If cleanup already fired before this resolved, bail out
      if (cancelled) return

      // Dispose previous instance
      if (chartRef.current) {
        dispose(containerRef.current!)
        chartRef.current = null
        paneIds.current.clear()
      }

      const chart = init(containerRef.current!, {
        locale: 'en-US',
        timezone: 'Asia/Baghdad',
        styles: {
          grid: {
            show: true,
            horizontal: { show: true, size: 1, color: '#1e293b', style: 'dashed', dashedValue: [2, 2] },
            vertical:   { show: true, size: 1, color: '#1e293b', style: 'dashed', dashedValue: [2, 2] },
          },
          candle: {
            type: chartType,
            bar: {
              upColor:             '#26a69a',
              downColor:           '#ef5350',
              noChangeColor:       '#888888',
              upBorderColor:       '#26a69a',
              downBorderColor:     '#ef5350',
              noChangeBorderColor: '#888888',
              upWickColor:         '#26a69a',
              downWickColor:       '#ef5350',
              noChangeWickColor:   '#888888',
            },
            area: {
              lineSize: 2,
              lineColor: '#3b82f6',
              value: 'close',
              backgroundColor: [
                { offset: 0, color: 'rgba(59,130,246,0.25)' },
                { offset: 1, color: 'rgba(59,130,246,0.02)' },
              ],
            },
            priceMark: {
              last: {
                upColor:   '#26a69a',
                downColor: '#ef5350',
                noChangeColor: '#888888',
              },
            },
            tooltip: {
              showRule: 'always',
              showType: 'rect',
              rect: {
                paddingLeft: 8, paddingRight: 8,
                paddingTop: 6, paddingBottom: 6,
                offsetLeft: 8, offsetTop: 8,
                borderRadius: 4,
                borderSize: 1,
                borderColor: '#334155',
                color: '#0f172a',
              },
            },
          },
          indicator: {
            ohlc: { upColor: '#26a69a', downColor: '#ef5350', noChangeColor: '#888888' },
            lines: [{ size: 1, style: 'solid', smooth: false, color: '#3b82f6' }, { size: 1, style: 'solid', smooth: false, color: '#f59e0b' }, { size: 1, style: 'solid', smooth: false, color: '#a855f7' }],
            bars:    [{ style: 'fill' as any, borderStyle: 'fill' as any, upColor: '#26a69a', downColor: '#ef5350', noChangeColor: '#888888' }],
            circles: [{ style: 'fill' as any, borderStyle: 'fill' as any, upColor: '#26a69a', downColor: '#ef5350', noChangeColor: '#888888' }],
            tooltip: {
              showRule: 'always',
              showType: 'standard',
              title: { show: true, showName: true, showParams: true, color: '#94a3b8', size: 12, family: 'monospace', weight: 'normal' },
              legend: { color: '#cbd5e1', size: 12, family: 'monospace', weight: 'normal' },
            },
          },
          xAxis: {
            show: true,
            size: 'auto',
            axisLine: { show: true, size: 1, color: '#334155' },
            tickLine:  { show: true, size: 5, length: 3, color: '#334155' },
            tickText:  { show: true, color: '#64748b', size: 11, family: 'monospace', weight: 'normal', marginStart: 4, marginEnd: 4 },
          },
          yAxis: {
            show: true,
            size: 'auto',
            axisLine: { show: true, size: 1, color: '#334155' },
            tickLine:  { show: true, size: 5, length: 3, color: '#334155' },
            tickText:  { show: true, color: '#64748b', size: 11, family: 'monospace', weight: 'normal', marginStart: 4, marginEnd: 4 },
          },
          separator: {
            size: 1, color: '#1e293b', fill: true,
            activeBackgroundColor: 'rgba(30,41,59,0.5)',
          },
          crosshair: {
            show: true,
            horizontal: {
              show: true, line: { show: true, style: 'dashed', dashedValue: [4, 2], size: 1, color: '#475569' },
              text: { show: true, size: 11, family: 'monospace', weight: 'normal', color: '#f1f5f9', paddingLeft: 4, paddingRight: 4, paddingTop: 3, paddingBottom: 3, borderSize: 1, borderColor: '#475569', borderStyle: 'solid', borderRadius: 2, backgroundColor: '#1e293b' },
            },
            vertical: {
              show: true, line: { show: true, style: 'dashed', dashedValue: [4, 2], size: 1, color: '#475569' },
              text: { show: true, size: 11, family: 'monospace', weight: 'normal', color: '#f1f5f9', paddingLeft: 4, paddingRight: 4, paddingTop: 3, paddingBottom: 3, borderSize: 1, borderColor: '#475569', borderStyle: 'solid', borderRadius: 2, backgroundColor: '#1e293b' },
            },
          },
          overlay: {
            line:   { style: 'solid', smooth: false, size: 1, color: '#3b82f6', dashedValue: [4, 2] },
            rect:   { style: 'fill', borderStyle: 'solid', color: 'rgba(59,130,246,0.15)', borderColor: '#3b82f6', borderSize: 1 },
            polygon: { style: 'fill', borderStyle: 'solid', color: 'rgba(59,130,246,0.15)', borderColor: '#3b82f6', borderSize: 1 },
            circle:  { style: 'fill', borderStyle: 'solid', color: 'rgba(59,130,246,0.15)', borderColor: '#3b82f6', borderSize: 1 },
            arc:     { style: 'solid', size: 1, color: '#3b82f6' },
            text:    { style: 'fill', color: '#f1f5f9', size: 13, family: 'sans-serif', weight: 'normal', borderStyle: 'solid', borderDashedValue: [2, 2], borderSize: 1, borderRadius: 2, borderColor: '#3b82f6', paddingLeft: 4, paddingRight: 4, paddingTop: 4, paddingBottom: 4, backgroundColor: 'rgba(15,23,42,0.85)' },
            rectText: { style: 'fill', color: '#f1f5f9', size: 13, family: 'sans-serif', weight: 'normal', borderStyle: 'solid', borderDashedValue: [2, 2], borderSize: 1, borderRadius: 2, borderColor: '#3b82f6', paddingLeft: 4, paddingRight: 4, paddingTop: 4, paddingBottom: 4, backgroundColor: 'rgba(15,23,42,0.85)' },
          },
        },
      })
      if (!chart || cancelled) return
      chartRef.current = chart

      // Symbol + period
      chart.setSymbol({ ticker: sym.toUpperCase(), pricePrecision: 4, volumePrecision: 0 })
      chart.setPeriod({ type: TF_CONFIG[tf].period, span: 1 })

      // DataLoader
      chart.setDataLoader({
        async getBars(params: any) {
          if (cancelled) return
          const { symbol, period, callback } = params
          setLoading(true)
          try {
            const raw = await fetchRaw(symbol.ticker)
            const allBars = getCandles(raw, period.type as PeriodType)
            // Pass only the bars in the TF window so barSpace fills the canvas correctly
            const startMs = tf === 'All' ? -Infinity : Date.now() - TF_MS[tf]
            const bars = tf === 'All' ? allBars : allBars.filter(b => b.timestamp >= startMs)
            // false = no more historical data; prevents klinecharts from re-calling getBars
            callback(bars.length ? bars : [], false)
            setTimeout(() => {
              if (cancelled || !chartRef.current || !containerRef.current) return
              if (bars.length > 0) {
                // klinecharts clamps barSpace to [1, 50] (BarSpaceLimitConstants)
                const availW = Math.max(containerRef.current.offsetWidth - 60, 200)
                const space = Math.min(Math.max(Math.floor(availW / bars.length), 1), 50)
                chartRef.current.setBarSpace(space)
              }
              chartRef.current.scrollToRealTime()
            }, 80)
          } finally {
            if (!cancelled) setLoading(false)
          }
        },
      })
    })()

    // Synchronous cleanup — uses stored disposeRef to avoid the async race where
    // the old effect's import().then(dispose) would fire after the new chart was created
    return () => {
      cancelled = true
      if (disposeRef.current && containerRef.current) {
        disposeRef.current(containerRef.current)
      }
      chartRef.current = null
      paneIds.current.clear()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sym, tf, chartType])

  // Resize when fullscreen toggles
  useEffect(() => {
    setTimeout(() => chartRef.current?.resize(), 50)
  }, [isFullscreen])

  // ── Indicator toggle ────────────────────────────────────────────────────────
  const toggleIndicator = useCallback((ind: IndicatorDef) => {
    const chart = chartRef.current
    if (!chart) return
    setActiveInds(prev => {
      const next = new Set(prev)
      if (next.has(ind.name)) {
        chart.removeIndicator({ name: ind.name })
        paneIds.current.delete(ind.name)
        next.delete(ind.name)
      } else {
        const id = chart.createIndicator(
          ind.name,
          false,
          ind.pane === 'candle' ? { id: 'candle_pane' } : undefined,
        )
        if (id) paneIds.current.set(ind.name, id)
        next.add(ind.name)
      }
      return next
    })
  }, [])

  // ── Drawing tool activation ─────────────────────────────────────────────────
  const activateDraw = useCallback((tool: DrawTool) => {
    const chart = chartRef.current
    if (!chart) return
    setDrawTool(tool.key)
    if (tool.key === 'pointer') return
    chart.createOverlay({ name: tool.overlay })
  }, [])

  const clearDrawings = useCallback(() => {
    chartRef.current?.removeOverlay({})
    setDrawTool('pointer')
  }, [])

  // ── Export: download / copy the chart as a watermarked PNG ───────────────────
  const exportImage = useCallback(async (mode: 'download' | 'copy') => {
    const chart = chartRef.current
    if (!chart) return
    try {
      // includeOverlay=true keeps drawings; bake the chart bg so PNG isn't transparent
      const src = chart.getConvertPictureUrl(true, 'png', '#0a0f1e')
      const { blob, url } = await compositeWatermark(src, { bg: '#0a0f1e', label: sym.toUpperCase() })
      if (mode === 'download') {
        downloadImage(url, `${sym.toUpperCase()}-iraqsm.png`)
        setExportMsg('تم التنزيل ✓')
      } else {
        const ok = await copyImage(blob)
        setExportMsg(ok ? 'تم النسخ ✓' : 'النسخ غير مدعوم — استخدم التنزيل')
      }
    } catch {
      setExportMsg('تعذّر التصدير')
    }
    setTimeout(() => setExportMsg(''), 2200)
  }, [sym])

  // ── Filtered indicators for search ─────────────────────────────────────────
  const filteredInds = indSearch
    ? INDICATORS.filter(i =>
        i.label.toLowerCase().includes(indSearch.toLowerCase()) ||
        i.desc.toLowerCase().includes(indSearch.toLowerCase())
      )
    : INDICATORS

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      className={isFullscreen
        ? 'fixed inset-0 z-50 flex flex-col bg-[#0a0f1e]'
        : 'relative flex flex-col rounded-xl border border-slate-800 bg-[#0a0f1e] overflow-hidden'}
    >
      {/* ── Top toolbar ── */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-800 shrink-0">

        {/* Fullscreen */}
        <button
          onClick={() => setFullscreen(v => !v)}
          className="w-7 h-7 flex items-center justify-center text-sm border border-slate-700 rounded text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        >{isFullscreen ? '⊠' : '⛶'}</button>

        {/* Indicators button */}
        <button
          onClick={() => setShowIndicators(v => !v)}
          className={`px-3 py-1 text-xs rounded border transition-colors ${showIndicators ? 'border-blue-500 text-blue-400' : 'border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'}`}
        >
          {activeInds.size > 0 ? `Indicators (${activeInds.size})` : '+ Indicators'}
        </button>

        {/* Download / Copy */}
        <button
          onClick={() => exportImage('download')}
          title="تنزيل صورة الرسم (PNG)"
          className="w-7 h-7 flex items-center justify-center text-sm border border-slate-700 rounded text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
        >⬇</button>
        <button
          onClick={() => exportImage('copy')}
          title="نسخ صورة الرسم"
          className="w-7 h-7 flex items-center justify-center text-sm border border-slate-700 rounded text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
        >⧉</button>
        {exportMsg && (
          <span className="text-[11px] font-medium text-blue-400 whitespace-nowrap">{exportMsg}</span>
        )}

        <div className="flex-1" />

        {/* Timeframes */}
        <div className="flex gap-1">
          {TF_KEYS.map(t => (
            <button
              key={t}
              onClick={() => setTf(t)}
              className={`px-2.5 py-1 text-xs font-mono rounded transition-colors ${tf === t ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            >{t}</button>
          ))}
        </div>

        {/* Chart type */}
        <div className="flex rounded-md overflow-hidden border border-slate-700 ml-1">
          <button
            onClick={() => setChartType('candle_solid')}
            className={`px-2.5 py-1 text-xs font-medium transition-colors ${chartType === 'candle_solid' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >🕯 شموع</button>
          <button
            onClick={() => setChartType('area')}
            className={`px-2.5 py-1 text-xs font-medium transition-colors ${chartType === 'area' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >📈 خطي</button>
        </div>
      </div>

      {/* ── Body: left sidebar + chart canvas ── */}
      <div className="flex flex-1 min-h-0">

        {/* ── Left drawing tools sidebar (TradingView style) ── */}
        <div className="flex flex-col items-center gap-1 py-2 px-1 border-r border-slate-800 shrink-0 w-9">
          {DRAW_TOOLS.map(tool => (
            <button
              key={tool.key}
              title={tool.label}
              onClick={() => activateDraw(tool)}
              className={`w-7 h-7 flex items-center justify-center text-sm rounded transition-colors ${drawTool === tool.key ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}
            >{tool.icon}</button>
          ))}
          <div className="h-px w-5 bg-slate-700 my-1" />
          <button
            onClick={clearDrawings}
            title="Clear all drawings"
            className="w-7 h-7 flex items-center justify-center text-sm text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded transition-colors"
          >🗑</button>
        </div>

        {/* ── Chart canvas ── */}
        <div className="relative flex-1 min-w-0" style={{ minHeight: isFullscreen ? 'calc(100vh - 41px)' : '480px' }}>
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
              <div className="flex gap-1.5">
                {[0,1,2].map(i => (
                  <div key={i} className="w-1.5 h-6 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={containerRef} className="absolute inset-0" />
          {/* Brand watermark — visible on the live chart */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0"
            aria-hidden
          >
            <span
              className="font-extrabold tracking-tight"
              style={{ fontSize: 'clamp(28px, 7vw, 72px)', color: 'rgba(148,163,184,0.07)', transform: 'rotate(-12deg)' }}
            >iraqsm.com</span>
          </div>
        </div>
      </div>

      {/* ── Indicator panel (overlay) ── */}
      {showIndicators && (
        <div className="absolute top-[45px] right-3 w-72 max-h-[420px] flex flex-col rounded-xl border border-slate-700 bg-[#0d1526] shadow-2xl z-40 overflow-hidden">
          <div className="px-3 pt-3 pb-2 border-b border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-white">Indicators</span>
              <button onClick={() => setShowIndicators(false)} className="text-slate-500 hover:text-white text-sm leading-none">✕</button>
            </div>
            <input
              type="text"
              placeholder="Search indicators..."
              value={indSearch}
              onChange={e => setIndSearch(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500"
            />
          </div>
          <div className="overflow-y-auto flex-1 py-1">
            {(indSearch ? ['Results'] : IND_GROUPS).map(group => {
              const inds = filteredInds.filter(i => indSearch ? true : i.group === group)
              if (!inds.length) return null
              return (
                <div key={group}>
                  {!indSearch && (
                    <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{group}</div>
                  )}
                  {inds.map(ind => (
                    <button
                      key={ind.name}
                      onClick={() => toggleIndicator(ind)}
                      className={`w-full flex items-center justify-between px-3 py-2 hover:bg-slate-800 transition-colors text-left ${activeInds.has(ind.name) ? 'text-blue-400' : 'text-slate-300'}`}
                    >
                      <div>
                        <div className="text-xs font-medium">{ind.label}</div>
                        <div className="text-[10px] text-slate-500">{ind.desc}</div>
                      </div>
                      {activeInds.has(ind.name) && <span className="text-blue-400 text-sm ml-2">✓</span>}
                    </button>
                  ))}
                </div>
              )
            })}
            {filteredInds.length === 0 && (
              <div className="px-3 py-6 text-center text-xs text-slate-500">No indicators found</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
