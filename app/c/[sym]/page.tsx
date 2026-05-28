'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useApp } from '@/context/AppContext'
import { useQuestTrack } from '@/lib/useQuestTrack'
import { fetchLive, fetchCompanyMeta, mergeCompanies, fmtVol, fmtMcap } from '@/lib/market'
import type { Company } from '@/types'

const TF = ['1D','1W','1M','3M','1Y','5Y'] as const
const TF_DAYS: Record<string,number> = { '1D':10,'1W':7,'1M':30,'3M':90,'1Y':365,'5Y':1825 }

// ─── Helpers ─────────────────────────────────────────────────────────────────
function tsToDate(ts: number): string {
  const d = new Date((ts + 10800) * 1000)
  return d.getUTCFullYear() + '-' +
    String(d.getUTCMonth() + 1).padStart(2, '0') + '-' +
    String(d.getUTCDate()).padStart(2, '0')
}

function calcMA(closes: number[], period: number): (number | null)[] {
  return closes.map((_, i) => {
    if (i < period - 1) return null
    return closes.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period
  })
}

function calcRSI(closes: number[], period = 14): (number | null)[] {
  const result: (number | null)[] = []
  if (closes.length < period + 1) return closes.map(() => null)
  let avgGain = 0, avgLoss = 0
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1]
    if (d > 0) avgGain += d; else avgLoss -= d
  }
  avgGain /= period; avgLoss /= period
  for (let i = 0; i < closes.length; i++) {
    if (i < period) { result.push(null); continue }
    if (i > period) {
      const d = closes[i] - closes[i - 1]
      avgGain = (avgGain * (period - 1) + Math.max(0, d)) / period
      avgLoss = (avgLoss * (period - 1) + Math.max(0, -d)) / period
    }
    const rs = avgLoss === 0 ? 1e9 : avgGain / avgLoss
    result.push(100 - 100 / (1 + rs))
  }
  return result
}

// ─── Logo ────────────────────────────────────────────────────────────────────
function CoLogo({ sym, logo, color }: { sym: string; logo?: string; color?: string }) {
  const [err, setErr] = useState(false)
  if (logo && !err) return (
    <img src={logo} alt={sym} width={48} height={48}
      style={{ borderRadius: 10, objectFit: 'contain', background: '#fff', padding: 3 }}
      onError={() => setErr(true)} />
  )
  return (
    <div style={{
      width: 48, height: 48, borderRadius: 10, background: color || 'var(--brand)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 12, fontWeight: 800, color: '#fff',
    }}>{sym.slice(0, 3)}</div>
  )
}

// ─── Advanced Chart ───────────────────────────────────────────────────────────
type ChartType = 'candle' | 'line'

// Shared chart state held in a ref — not reactive, avoids unnecessary re-inits
interface ChartState {
  LC: any; mainChart: any; rsiChart: any; priceSeries: any
  candles: any[]; closes: number[]; ro: ResizeObserver | null
}

function AdvancedChart({
  sym, tf, color, chartType, showMA20, showMA50, showMA100, showRSI, co,
}: {
  sym: string; tf: string; color?: string; chartType: ChartType
  showMA20: boolean; showMA50: boolean; showMA100: boolean; showRSI: boolean
  co: Company
}) {
  const mainRef    = useRef<HTMLDivElement>(null)
  const rsiRef     = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const showRSIRef = useRef(showRSI)

  const s = useRef<ChartState>({
    LC: null, mainChart: null, rsiChart: null, priceSeries: null,
    candles: [], closes: [], ro: null,
  })

  // Copy state
  const [copyDone, setCopyDone] = useState(false)

  // Keep showRSIRef up to date without re-running the main effect
  useEffect(() => { showRSIRef.current = showRSI }, [showRSI])

  // ── Build RSI sub-chart (callable from both effects) ──────────────────────
  const buildRSI = useCallback(() => {
    const { LC, candles, closes, mainChart } = s.current
    if (!LC || !candles.length || !rsiRef.current) return

    s.current.rsiChart?.remove()
    s.current.rsiChart = null

    const rsiVals = calcRSI(closes)
    const rsiData = candles
      .map((c, i) => rsiVals[i] != null ? { time: c.time, value: +rsiVals[i]!.toFixed(2) } : null)
      .filter(Boolean) as any[]
    if (!rsiData.length) return

    const rsiChart = LC.createChart(rsiRef.current, {
      width:  rsiRef.current.clientWidth,
      height: 120,
      layout: { background: { color: 'transparent' }, textColor: 'rgba(255,255,255,0.35)', fontSize: 10 },
      grid:   { vertLines: { color: 'rgba(255,255,255,0.04)' }, horzLines: { color: 'rgba(255,255,255,0.04)' } },
      crosshair:       { mode: LC.CrosshairMode.Normal },
      rightPriceScale: { borderColor: 'rgba(255,255,255,0.07)' },
      timeScale:       { borderColor: 'rgba(255,255,255,0.07)', timeVisible: false, fixLeftEdge: true, fixRightEdge: true },
      handleScroll: true, handleScale: true,
    })
    s.current.rsiChart = rsiChart

    const rsiS = rsiChart.addLineSeries({
      color: '#A855F7', lineWidth: 2 as any, priceLineVisible: false, lastValueVisible: true,
      autoscaleInfoProvider: () => ({ priceRange: { minValue: 0, maxValue: 100 }, margins: { above: 0.08, below: 0.08 } }),
    })
    rsiS.setData(rsiData)
    rsiS.createPriceLine({ price: 70, color: 'rgba(239,68,68,0.55)',   lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: '70' })
    rsiS.createPriceLine({ price: 50, color: 'rgba(255,255,255,0.18)', lineWidth: 1, lineStyle: 3, axisLabelVisible: false, title: '' })
    rsiS.createPriceLine({ price: 30, color: 'rgba(34,197,94,0.55)',   lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: '30' })
    rsiChart.timeScale().fitContent()

    // Sync scroll/zoom with main chart
    let sync = false
    mainChart?.timeScale().subscribeVisibleLogicalRangeChange((range: any) => {
      if (sync || !range) return
      sync = true; rsiChart.timeScale().setVisibleLogicalRange(range); sync = false
    })
    rsiChart.timeScale().subscribeVisibleLogicalRangeChange((range: any) => {
      if (sync || !range) return
      sync = true; mainChart?.timeScale().setVisibleLogicalRange(range); sync = false
    })

    rsiRef.current?.querySelectorAll('a[href*="tradingview"]').forEach(el => (el as HTMLElement).style.display = 'none')
  }, []) // stable — reads only from s.current ref

  // ── Main chart effect — NO showRSI in deps ────────────────────────────────
  useEffect(() => {
    const state = s.current
    let cancelled = false

    // Cleanup previous
    state.ro?.disconnect(); state.mainChart?.remove(); state.rsiChart?.remove()
    state.mainChart = null; state.rsiChart = null; state.priceSeries = null
    state.candles = []; state.closes = []

    async function init() {
      const LC = await import('lightweight-charts')
      if (cancelled || !mainRef.current) return
      state.LC = LC

      const [histRes, ohlcvRes] = await Promise.all([
        fetch('/data/hist.json?t='  + Math.floor(Date.now() / 86400000)).then(r => r.json()),
        fetch('/data/ohlcv.json?t=' + Math.floor(Date.now() / 86400000)).then(r => r.json()),
      ])
      if (cancelled || !mainRef.current) return

      const days     = TF_DAYS[tf] ?? 30
      const useLong  = days >= 1825
      const raw: [number, number][] = (useLong ? histRes.l?.[sym] : null) ?? histRes.s?.[sym] ?? []
      const cutoff   = Date.now() / 1000 - days * 86400
      const filtered = raw.filter(p => p[0] >= cutoff)
      if (!filtered.length) return

      // Build candles — deduplicate by date string to avoid duplicate-time crashes
      // ISX stocks frequently trade at a single price all day (h=l=o=c), so we
      // synthesise candle bodies from prev-close → curr-close to show daily moves.
      const candleMap = new Map<string, any>()
      for (let i = 0; i < filtered.length; i++) {
        const [ts, c] = filtered[i]
        const dateStr = tsToDate(ts)
        const ov = ohlcvRes?.[dateStr]?.[sym]
        // Previous close price — used for candle open when OHLCV has no body
        const prevClose = i > 0 ? filtered[i - 1][1] : c

        let candle: any
        if (ov?.o && ov?.h && ov?.l && ov?.c && +ov.c > 0 && +ov.h > 0 && +ov.l > 0) {
          const o  = +Number(ov.o).toFixed(4)
          const h  = +Number(ov.h).toFixed(4)
          const l  = +Math.max(0.001, Number(ov.l)).toFixed(4)
          const cl = +Number(ov.c).toFixed(4)
          // Sanity-check: reject obviously bad API data (high > 2× close or low < 0.3× close)
          if (h <= cl * 2 && l >= cl * 0.3) {
            if (h === l) {
              // Flat ISX candle (no intraday movement): use prev close as open so the
              // candle body shows the inter-day price move; wicks are ±0.5%
              const synOpen = +prevClose.toFixed(4)
              const wick    = +(cl * 0.005).toFixed(4)
              candle = {
                time: dateStr, open: synOpen, close: cl,
                high:  +(Math.max(synOpen, cl) + wick).toFixed(4),
                low:   +Math.max(0.001, Math.min(synOpen, cl) - wick).toFixed(4),
                volume: ov.v ? +ov.v : 0,
              }
            } else {
              candle = { time: dateStr, open: o, high: h, low: l, close: cl, volume: ov.v ? +ov.v : 0 }
            }
          }
        }

        if (!candle) {
          // No valid OHLCV — bridge prev close → current price as open → close.
          // Cap to ±10% to avoid phantom mega-candles from multi-day data gaps.
          const changePct = prevClose > 0 ? Math.abs(c - prevClose) / prevClose : 0
          const synOpen   = changePct <= 0.10 ? +prevClose.toFixed(4) : +c.toFixed(4)
          const wick      = +(Math.max(Math.abs(c - synOpen), c * 0.005)).toFixed(4)
          candle = {
            time: dateStr, open: synOpen, close: +c.toFixed(4),
            high:  +(Math.max(synOpen, c) + wick * 0.15).toFixed(4),
            low:   +Math.max(0.001, Math.min(synOpen, c) - wick * 0.15).toFixed(4),
            volume: 0,
          }
        }

        candleMap.set(dateStr, candle)  // last entry wins for duplicate dates
      }
      const candles = Array.from(candleMap.values())
        .sort((a, b) => (a.time as string).localeCompare(b.time as string))

      state.candles = candles
      state.closes  = candles.map(c => c.close)
      const lineColor = color || '#4F6BFF'

      const mainChart = LC.createChart(mainRef.current, {
        width:  mainRef.current.clientWidth,
        height: 360,
        layout: { background: { color: 'transparent' }, textColor: 'rgba(255,255,255,0.4)', fontSize: 11 },
        grid:   { vertLines: { color: 'rgba(255,255,255,0.04)' }, horzLines: { color: 'rgba(255,255,255,0.05)' } },
        crosshair:       { mode: LC.CrosshairMode.Normal },
        rightPriceScale: { borderColor: 'rgba(255,255,255,0.07)', scaleMargins: { top: 0.08, bottom: 0.08 } },
        timeScale:       { borderColor: 'rgba(255,255,255,0.07)', timeVisible: false, fixLeftEdge: true, fixRightEdge: true },
        watermark: { visible: true, text: 'iraqsm.com', fontSize: 16, color: '#4F6BFF', horzAlign: 'left', vertAlign: 'bottom', fontStyle: 'bold' },
        handleScroll: true, handleScale: true,
      })
      state.mainChart = mainChart

      // Price series
      let priceSeries: any
      if (chartType === 'candle') {
        priceSeries = mainChart.addCandlestickSeries({
          upColor: '#22C55E', downColor: '#EF4444',
          borderUpColor: '#22C55E', borderDownColor: '#EF4444',
          wickUpColor: '#22C55E', wickDownColor: '#EF4444',
          priceLineVisible: false,
        })
        priceSeries.setData(candles)
      } else {
        priceSeries = mainChart.addAreaSeries({
          lineColor, topColor: lineColor + '55', bottomColor: lineColor + '05',
          lineWidth: 2, priceLineVisible: false,
          crosshairMarkerVisible: true, crosshairMarkerRadius: 4,
          crosshairMarkerBorderColor: lineColor, crosshairMarkerBackgroundColor: lineColor,
        })
        priceSeries.setData(candles.map(c => ({ time: c.time, value: c.close })))
      }
      state.priceSeries = priceSeries

      // Volume histogram
      if (candles.some(c => c.volume > 0)) {
        const volS = mainChart.addHistogramSeries({ priceFormat: { type: 'volume' }, priceScaleId: 'vol' })
        mainChart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } })
        volS.setData(candles.map(c => ({
          time: c.time, value: c.volume,
          color: c.close >= c.open ? 'rgba(34,197,94,0.28)' : 'rgba(239,68,68,0.28)',
        })))
      }

      // MA overlays
      for (const { period, show, mc, label } of [
        { period: 20,  show: showMA20,  mc: '#F59E0B', label: 'MA20'  },
        { period: 50,  show: showMA50,  mc: '#3B82F6', label: 'MA50'  },
        { period: 100, show: showMA100, mc: '#A855F7', label: 'MA100' },
      ]) {
        if (!show) continue
        const ma     = calcMA(state.closes, period)
        const maData = candles.map((c, i) => ma[i] != null ? { time: c.time, value: +ma[i]!.toFixed(4) } : null).filter(Boolean) as any[]
        if (!maData.length) continue
        const ms = mainChart.addLineSeries({ color: mc, lineWidth: 2 as any, priceLineVisible: false, lastValueVisible: true, crosshairMarkerVisible: false, title: label })
        ms.setData(maData)
      }

      mainChart.timeScale().fitContent()

      // ── Custom OHLC tooltip ──────────────────────────────────────────────────
      mainChart.subscribeCrosshairMove((param: any) => {
        const tip = tooltipRef.current
        const wrap = mainRef.current
        if (!tip || !wrap) return
        const chartW = wrap.clientWidth

        if (!param.point || !param.time ||
            param.point.x < 0 || param.point.x > chartW ||
            param.point.y < 0 || param.point.y > 360) {
          tip.style.display = 'none'; return
        }

        const data = param.seriesData.get(state.priceSeries)
        if (!data) { tip.style.display = 'none'; return }

        const dateStr = typeof param.time === 'number' ? tsToDate(param.time) : String(param.time)
        const tw = 140
        const leftX = param.point.x + tw + 16 > chartW ? param.point.x - tw - 8 : param.point.x + 10
        const topY  = Math.max(8, param.point.y - 44)

        tip.style.display = 'block'
        tip.style.left    = `${leftX}px`
        tip.style.top     = `${topY}px`

        if ('open' in data) {
          const { open, high, low, close } = data as any
          const isUp = close >= open
          tip.innerHTML =
            `<div style="font-size:9px;color:rgba(255,255,255,0.38);margin-bottom:5px">${dateStr}</div>` +
            `<div style="display:grid;grid-template-columns:14px 1fr;gap:2px 6px;font-size:11px">` +
            `<span style="color:rgba(255,255,255,0.45)">O</span><span>${open.toFixed(3)}</span>` +
            `<span style="color:#22C55E">H</span><span style="color:#22C55E">${high.toFixed(3)}</span>` +
            `<span style="color:#EF4444">L</span><span style="color:#EF4444">${low.toFixed(3)}</span>` +
            `<span style="color:rgba(255,255,255,0.45)">C</span><span style="color:${isUp ? '#22C55E' : '#EF4444'};font-weight:700">${close.toFixed(3)}</span>` +
            `</div>`
        } else {
          const v = (data as any).value
          tip.innerHTML =
            `<div style="font-size:9px;color:rgba(255,255,255,0.38);margin-bottom:4px">${dateStr}</div>` +
            `<div style="font-size:14px;font-weight:700">${v.toFixed(3)}</div>`
        }
      })

      // Resize observer
      state.ro = new ResizeObserver(() => {
        if (state.mainChart && mainRef.current) state.mainChart.applyOptions({ width: mainRef.current.clientWidth })
        if (state.rsiChart  && rsiRef.current)  state.rsiChart.applyOptions({ width: rsiRef.current.clientWidth })
      })
      if (mainRef.current) state.ro.observe(mainRef.current)

      // Kill attribution
      const kill = () => {
        mainRef.current?.querySelectorAll('a[href*="tradingview"]').forEach(el => (el as HTMLElement).style.display = 'none')
      }
      kill(); setTimeout(kill, 600)

      // Build RSI if it was enabled before data finished loading
      if (showRSIRef.current) buildRSI()
    }

    init()
    return () => {
      cancelled = true
      s.current.ro?.disconnect()
      s.current.mainChart?.remove(); s.current.rsiChart?.remove()
      s.current.mainChart = null;    s.current.rsiChart = null
    }
  }, [sym, tf, color, chartType, showMA20, showMA50, showMA100, buildRSI]) // ← NO showRSI

  // ── RSI-only effect — just add/remove without touching main chart ─────────
  useEffect(() => {
    const state = s.current
    if (!showRSI) {
      state.rsiChart?.remove()
      state.rsiChart = null
    } else if (state.LC && state.candles.length) {
      buildRSI()
    }
    // If data not loaded yet, main effect init() calls buildRSI() at the end
  }, [showRSI, buildRSI])

  // ── Download chart ────────────────────────────────────────────────────────
  function buildExportCanvas(): HTMLCanvasElement {
    const mc = s.current.mainChart
    const srcCanvas = mc.takeScreenshot() as HTMLCanvasElement
    const H   = 52
    const PAD = 16
    const fin = document.createElement('canvas')
    fin.width  = srcCanvas.width
    fin.height = srcCanvas.height + H
    const ctx  = fin.getContext('2d')!

    // ── full dark background (chart screenshot is transparent)
    ctx.fillStyle = '#0B0E14'
    ctx.fillRect(0, 0, fin.width, fin.height)

    // ── header strip (slightly lighter band)
    ctx.fillStyle = '#11151E'
    ctx.fillRect(0, 0, fin.width, H)
    // bottom border on header
    ctx.fillStyle = 'rgba(255,255,255,0.08)'
    ctx.fillRect(0, H - 1, fin.width, 1)

    // ── left side: ticker (bold) + company name
    ctx.textBaseline = 'middle'
    ctx.textAlign    = 'left'
    ctx.font         = 'bold 15px "JetBrains Mono", monospace'
    ctx.fillStyle    = '#fff'
    ctx.fillText(sym, PAD, H / 2 - 7)

    ctx.font      = '12px Inter, sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.45)'
    ctx.fillText(co.en, PAD, H / 2 + 9)

    // ── center: price
    const priceStr = `${co.close.toFixed(3)} IQD`
    ctx.font      = 'bold 14px "JetBrains Mono", monospace'
    ctx.fillStyle = '#22C55E'
    ctx.textAlign = 'center'
    ctx.fillText(priceStr, fin.width / 2, H / 2)

    // ── right side: iraqsm.com
    ctx.font      = 'bold 13px Inter, sans-serif'
    ctx.fillStyle = '#4F6BFF'
    ctx.textAlign = 'right'
    ctx.fillText('iraqsm.com', fin.width - PAD, H / 2)

    // ── chart below header (transparent bg → dark shows through)
    ctx.drawImage(srcCanvas, 0, H)

    // ── watermark stamp on chart area (bottom-left, unmissable on export)
    const WM = 'iraqsm.com'
    const WM_FONT = 'bold 15px "JetBrains Mono", monospace'
    ctx.font         = WM_FONT
    ctx.textAlign    = 'left'
    ctx.textBaseline = 'bottom'
    // dark pill background
    const metrics  = ctx.measureText(WM)
    const wmW      = metrics.width + 20
    const wmH      = 28
    const wmX      = PAD
    const wmY      = fin.height - PAD - wmH
    ctx.fillStyle  = 'rgba(11,14,20,0.72)'
    ctx.beginPath()
    ctx.roundRect(wmX, wmY, wmW, wmH, 6)
    ctx.fill()
    // text
    ctx.fillStyle = '#4F6BFF'
    ctx.fillText(WM, wmX + 10, fin.height - PAD - 7)

    return fin
  }

  function downloadChart() {
    if (!s.current.mainChart) return
    const fin = buildExportCanvas()
    const a   = document.createElement('a')
    a.href     = fin.toDataURL('image/png')
    a.download = `${sym}-${tf}-iraqsm.png`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
  }

  async function copyChart() {
    if (!s.current.mainChart) return
    const fin = buildExportCanvas()
    fin.toBlob(async blob => {
      if (!blob) return
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
        setCopyDone(true); setTimeout(() => setCopyDone(false), 2000)
      } catch { /* clipboard not available */ }
    }, 'image/png')
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Action buttons */}
      <div style={{ position: 'absolute', top: 0, insetInlineEnd: 0, display: 'flex', gap: 4, zIndex: 5 }}>
        <button onClick={downloadChart} title="Download chart" style={{
          padding: '4px 8px', borderRadius: 6, background: 'var(--surf2)',
          border: '1px solid var(--line)', color: 'var(--ink3)', fontSize: 10,
          fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          PNG
        </button>
        <button onClick={copyChart} title="Copy chart to clipboard" style={{
          padding: '4px 8px', borderRadius: 6,
          background: copyDone ? 'rgba(34,197,94,0.15)' : 'var(--surf2)',
          border: `1px solid ${copyDone ? 'rgba(34,197,94,0.4)' : 'var(--line)'}`,
          color: copyDone ? 'var(--up)' : 'var(--ink3)', fontSize: 10,
          fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
          {copyDone ? '✓ Copied' : 'Copy'}
        </button>
      </div>

      {/* Main chart */}
      <div ref={mainRef} style={{ width: '100%', height: 360 }} />

      {/* OHLC tooltip overlay */}
      <div ref={tooltipRef} style={{
        position: 'absolute', display: 'none', pointerEvents: 'none', zIndex: 10,
        background: 'rgba(11,14,20,0.92)', border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 8, padding: '7px 10px', fontFamily: 'var(--font-mono)',
        minWidth: 120, boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        color: 'rgba(255,255,255,0.85)',
      }} />

      {/* RSI sub-chart */}
      {showRSI && (
        <div style={{ marginTop: 2, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ padding: '4px 6px 2px', fontSize: 9, fontWeight: 800, color: 'rgba(168,85,247,0.8)', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>
            RSI (14)
          </div>
          <div ref={rsiRef} style={{ width: '100%', height: 120 }} />
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CompanyPage() {
  const { sym }      = useParams<{ sym: string }>()
  const { lang, watchlist, toggleWatchlist, user, profile, authLoading, openAuth, refreshProfile } = useApp()
  const ar = lang === 'ar'
  useQuestTrack('chart_view')

  const [co, setCo]           = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [tf, setTf]           = useState<string>('1M')

  // Chart controls
  const [chartType, setChartType] = useState<ChartType>('candle')
  const [showMA20,  setShowMA20]  = useState(false)
  const [showMA50,  setShowMA50]  = useState(false)
  const [showMA100, setShowMA100] = useState(false)
  const [showRSI,   setShowRSI]   = useState(false)

  // Trade state
  const [qty, setQty]             = useState('100')
  const [tradeMode, setTradeMode] = useState<'points' | 'demo'>('points')
  const [demoEnabled, setDemoEnabled] = useState(false)
  const [action, setAction]       = useState<'buy' | 'sell' | null>(null)
  const [trading, setTrading]     = useState(false)
  const [tradeMsg, setTradeMsg]   = useState<string | null>(null)
  const [buyAttempted, setBuyAttempted] = useState(false)

  useEffect(() => {
    setDemoEnabled(localStorage.getItem('demo_trading_enabled') === 'true')
  }, [])

  useEffect(() => {
    Promise.all([fetchLive(), fetchCompanyMeta()])
      .then(([live, meta]) => {
        const all = mergeCompanies(meta, live.stocks)
        setCo(all.find(c => c.sym === sym) ?? null)
      })
      .finally(() => setLoading(false))
  }, [sym])

  async function handleBuyWithPoints() {
    setBuyAttempted(true)
    if (!user || !co || !qty) return
    setTrading(true); setTradeMsg(null)
    try {
      const res  = await fetch('/api/wallet', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'buy_with_points', sym: co.sym, qty: Number(qty), price: co.close }),
      })
      const data = await res.json()
      if (data.ok) {
        setTradeMsg(ar ? `✅ اشتريت ${qty} سهم! نقاطك المتبقية: ${data.remainingPoints?.toLocaleString('en')}` : `✅ Bought ${qty} shares! Remaining: ${data.remainingPoints?.toLocaleString('en')} pts`)
        refreshProfile?.()
      } else {
        setTradeMsg(ar ? (data.error === 'Insufficient points' ? '❌ نقاطك غير كافية' : data.error) : data.error ?? 'Error')
      }
    } catch { setTradeMsg(ar ? 'خطأ في الاتصال' : 'Network error') }
    setTrading(false)
  }

  async function handleDemoTrade() {
    if (!user || !co || !action || !qty) return
    setTrading(true); setTradeMsg(null)
    try {
      const res  = await fetch('/api/wallet', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, sym: co.sym, qty: Number(qty), price: co.close }),
      })
      const data = await res.json()
      if (data.ok) {
        setTradeMsg(ar ? `✅ ${action === 'buy' ? 'تم الشراء' : 'تم البيع'} بنجاح` : `✅ ${action === 'buy' ? 'Purchase' : 'Sale'} completed`)
      } else { setTradeMsg(data.error ?? 'Error') }
    } catch { setTradeMsg(ar ? 'خطأ في الاتصال' : 'Network error') }
    setTrading(false)
  }

  if (loading) return (
    <div style={{ maxWidth: 900, margin: '40px auto', padding: '0 24px' }}>
      <div className="skeleton" style={{ height: 220, borderRadius: 16 }} />
    </div>
  )
  if (!co) return (
    <div style={{ maxWidth: 900, margin: '80px auto', padding: '0 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
      <div style={{ fontSize: 16, fontWeight: 700 }}>{ar ? 'الشركة غير موجودة' : 'Company not found'}</div>
      <Link href="/market" style={{ color: 'var(--brand)', fontSize: 13, marginTop: 8, display: 'inline-block' }}>
        {ar ? '← العودة للسوق' : '← Back to Market'}
      </Link>
    </div>
  )

  const up   = co.pct >= 0
  const inWL = watchlist.includes(co.sym)
  const stat = (label: string, value: string) => (
    <div>
      <div style={{ fontSize: 10, color: 'var(--ink4)', fontWeight: 600, marginBottom: 3 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600 }}>{value}</div>
    </div>
  )

  const indBtns = [
    { key: 'ma20',  label: 'MA20',  color: '#F59E0B', state: showMA20,  set: setShowMA20  },
    { key: 'ma50',  label: 'MA50',  color: '#3B82F6', state: showMA50,  set: setShowMA50  },
    { key: 'ma100', label: 'MA100', color: '#A855F7', state: showMA100, set: setShowMA100 },
    { key: 'rsi',   label: 'RSI',   color: '#EC4899', state: showRSI,   set: setShowRSI   },
  ]

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px' }}>

      {/* Breadcrumb */}
      <div style={{ fontSize: 11, color: 'var(--ink4)', marginBottom: 16 }}>
        <Link href="/market" style={{ color: 'var(--ink4)' }}>{ar ? 'السوق' : 'Market'}</Link>
        <span style={{ margin: '0 6px' }}>›</span>
        <span style={{ color: 'var(--ink)' }}>{co.sym}</span>
      </div>

      {/* Hero card */}
      <div style={{ background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 20, padding: '20px 24px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <CoLogo sym={co.sym} logo={co.logo} color={co.color} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20, fontWeight: 800 }}>{ar ? co.ar : co.en}</span>
                <button onClick={() => toggleWatchlist(co.sym)}
                  style={{ background: 'none', border: 'none', fontSize: 16, color: inWL ? 'var(--gold)' : 'var(--ink4)', cursor: 'pointer' }}>★</button>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 3 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink4)' }}>{co.sym}</span>
                <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: 'var(--surf3)', color: 'var(--ink3)' }}>{co.sec}</span>
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'end' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 32, fontWeight: 800 }}>{co.close.toFixed(3)}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: up ? 'var(--up)' : 'var(--dn)' }}>
              {up ? '▲' : '▼'} {Math.abs(co.pct).toFixed(2)}% ({co.change >= 0 ? '+' : ''}{co.change.toFixed(3)})
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 16, marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--line)' }}>
          {stat(ar ? 'فتح' : 'Open', co.open.toFixed(3))}
          {stat(ar ? 'أعلى' : 'High', co.high.toFixed(3))}
          {stat(ar ? 'أدنى' : 'Low', co.low.toFixed(3))}
          {stat(ar ? 'الحجم' : 'Vol', fmtVol(co.vol))}
          {stat(ar ? 'القيمة السوقية' : 'Mkt Cap', fmtMcap(co.mcap))}
          {stat(ar ? 'الصفقات' : 'Deals', (co.deals ?? 0).toLocaleString('en'))}
        </div>
      </div>

      {/* ── Chart card ── */}
      <div style={{ background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 20, padding: '20px 24px', marginBottom: 16 }}>
        {/* Row 1: title + chart type */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>{ar ? 'المخطط السعري' : 'Price Chart'}</span>
          <div style={{ display: 'flex', gap: 2, background: 'var(--surf3)', borderRadius: 8, padding: 3 }}>
            {([['candle', ar ? '🕯️ شموع' : '🕯️ Candles'], ['line', ar ? '📈 خطي' : '📈 Line']] as const).map(([t, label]) => (
              <button key={t} onClick={() => setChartType(t as ChartType)} style={{
                padding: '4px 12px', borderRadius: 6, border: 'none', fontSize: 11, fontWeight: 700,
                background: chartType === t ? 'var(--surf)' : 'none',
                color: chartType === t ? 'var(--ink)' : 'var(--ink4)',
                fontFamily: 'inherit', cursor: 'pointer',
                boxShadow: chartType === t ? '0 1px 4px rgba(0,0,0,0.25)' : 'none',
              }}>{label}</button>
            ))}
          </div>
        </div>

        {/* Row 2: indicators + timeframe */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {indBtns.map(ind => (
              <button key={ind.key} onClick={() => ind.set(!ind.state)} style={{
                padding: '3px 9px', borderRadius: 6, fontSize: 10, fontWeight: 800,
                border: `1px solid ${ind.state ? ind.color + '70' : 'var(--line)'}`,
                background: ind.state ? ind.color + '1A' : 'none',
                color: ind.state ? ind.color : 'var(--ink4)',
                fontFamily: 'var(--font-mono)', cursor: 'pointer', letterSpacing: '0.03em',
              }}>{ind.label}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 3 }}>
            {TF.map(t => (
              <button key={t} onClick={() => setTf(t)} style={{
                padding: '4px 10px', borderRadius: 6,
                background: tf === t ? 'var(--brand)' : 'none',
                border: `1px solid ${tf === t ? 'var(--brand)' : 'var(--line)'}`,
                color: tf === t ? '#fff' : 'var(--ink3)',
                fontSize: 11, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
              }}>{t}</button>
            ))}
          </div>
        </div>

        {/* MA legend */}
        {(showMA20 || showMA50 || showMA100) && (
          <div style={{ display: 'flex', gap: 12, marginBottom: 8, paddingBottom: 10, borderBottom: '1px solid var(--line)', flexWrap: 'wrap' }}>
            {showMA20  && <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: '#F59E0B', fontWeight: 700 }}>── MA20</span>}
            {showMA50  && <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: '#3B82F6', fontWeight: 700 }}>── MA50</span>}
            {showMA100 && <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: '#A855F7', fontWeight: 700 }}>── MA100</span>}
          </div>
        )}

        <AdvancedChart
          sym={co.sym} tf={tf} color={co.color} chartType={chartType}
          showMA20={showMA20} showMA50={showMA50} showMA100={showMA100} showRSI={showRSI}
          co={co}
        />
      </div>

      {/* Trade card */}
      <div style={{ background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 20, padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{ar ? 'اشترِ بنقاطك' : 'Buy with Points'}</div>
          {demoEnabled && (
            <div style={{ display: 'flex', gap: 4, background: 'var(--surf3)', borderRadius: 8, padding: 3 }}>
              {(['points', 'demo'] as const).map(m => (
                <button key={m} onClick={() => { setTradeMode(m); setTradeMsg(null) }} style={{
                  padding: '4px 10px', borderRadius: 6, border: 'none', fontSize: 11, fontWeight: 700,
                  background: tradeMode === m ? 'var(--surf)' : 'none',
                  color: tradeMode === m ? 'var(--ink)' : 'var(--ink4)',
                  fontFamily: 'inherit', boxShadow: tradeMode === m ? '0 1px 4px rgba(0,0,0,0.2)' : 'none',
                }}>
                  {m === 'points' ? (ar ? '🪙 نقاط' : '🪙 Points') : (ar ? '💹 تجريبي' : '💹 Demo')}
                </button>
              ))}
            </div>
          )}
        </div>

        {authLoading ? (
          <div style={{ padding: '20px 0' }}>
            <div className="skeleton" style={{ height: 40, borderRadius: 10, marginBottom: 12 }} />
            <div className="skeleton" style={{ height: 44, borderRadius: 10 }} />
          </div>
        ) : !user ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 13, color: 'var(--ink3)', marginBottom: 12 }}>
              {ar ? 'سجّل دخولك لشراء الأسهم بنقاطك' : 'Sign in to buy shares with your points'}
            </div>
            <button onClick={() => openAuth('signup')} style={{ padding: '9px 20px', background: 'var(--brand)', borderRadius: 10, fontSize: 13, fontWeight: 700, color: '#fff', border: 'none', fontFamily: 'inherit' }}>
              {ar ? 'إنشاء حساب' : 'Create Account'}
            </button>
          </div>
        ) : tradeMode === 'points' ? (() => {
          const userPoints    = profile?.points ?? 0
          const sharePrice    = co.close > 0 ? co.close : 0.001
          const maxAffordable = Math.floor(userPoints / sharePrice)
          const qtyNum        = Number(qty) || 0
          const costPts       = Math.round(qtyNum * sharePrice)
          const canAfford     = userPoints >= costPts && qtyNum > 0
          const overBudget    = qtyNum > 0 && !canAfford
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', background: 'rgba(245,200,75,0.08)', border: '1px solid rgba(245,200,75,0.2)', borderRadius: 9 }}>
                <span style={{ fontSize: 11, color: 'var(--ink4)' }}>{ar ? 'نقاطك المتاحة' : 'Your points'}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--gold)' }}>🪙 {userPoints.toLocaleString('en')}</span>
              </div>
              {buyAttempted && maxAffordable === 0 && (
                <div style={{ fontSize: 11, color: 'var(--dn)', padding: '0 2px' }}>
                  {ar ? `❌ نقاطك لا تكفي لشراء ولو سهم واحد (السعر: ${sharePrice.toFixed(3)} نقطة/سهم)` : `❌ Not enough points for even 1 share (${sharePrice.toFixed(3)} pts/share)`}
                </div>
              )}
              <div>
                <label style={{ fontSize: 11, color: 'var(--ink4)', display: 'block', marginBottom: 4 }}>{ar ? 'الكمية (سهم)' : 'Quantity (shares)'}</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input type="number" min="1" max={maxAffordable} value={qty}
                    onChange={e => { setQty(e.target.value); setTradeMsg(null); setBuyAttempted(false) }}
                    style={{ flex: 1, padding: '9px 12px', borderRadius: 9, background: 'var(--surf3)', border: `1px solid ${overBudget ? 'rgba(239,68,68,0.5)' : 'var(--line2)'}`, color: overBudget ? 'var(--dn)' : 'var(--ink)', fontFamily: 'var(--font-mono)', fontSize: 14, outline: 'none' }} />
                  <button onClick={() => { setQty(String(maxAffordable)); setTradeMsg(null) }} disabled={maxAffordable === 0}
                    style={{ padding: '9px 14px', borderRadius: 9, border: '1px solid var(--line)', background: 'var(--surf3)', color: 'var(--gold)', fontSize: 11, fontWeight: 700, fontFamily: 'inherit', opacity: maxAffordable === 0 ? 0.4 : 1 }}>
                    {ar ? 'الحد الأقصى' : 'Max'}
                  </button>
                </div>
                {buyAttempted && overBudget && <div style={{ fontSize: 10, color: 'var(--dn)', marginTop: 4 }}>{ar ? `نقاطك تكفي لـ ${maxAffordable.toLocaleString('en')} سهم فقط` : `Your points only cover ${maxAffordable.toLocaleString('en')} shares`}</div>}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--surf3)', borderRadius: 9, fontSize: 12 }}>
                <span style={{ color: 'var(--ink4)' }}>{ar ? 'التكلفة' : 'Cost'}</span>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: overBudget ? 'var(--dn)' : 'var(--gold)' }}>🪙 {costPts.toLocaleString('en')} {ar ? 'نقطة' : 'pts'}</span>
                  {qtyNum > 0 && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink4)' }}>{ar ? `يتبقى: ${Math.max(0, userPoints - costPts).toLocaleString('en')} نقطة` : `Remaining: ${Math.max(0, userPoints - costPts).toLocaleString('en')} pts`}</span>}
                </div>
              </div>
              {tradeMsg && <div style={{ padding: '9px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: tradeMsg.startsWith('✅') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${tradeMsg.startsWith('✅') ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`, color: tradeMsg.startsWith('✅') ? 'var(--up)' : 'var(--dn)' }}>{tradeMsg}</div>}
              <button onClick={handleBuyWithPoints} disabled={trading || !canAfford}
                style={{ padding: '11px', borderRadius: 10, border: 'none', background: canAfford ? 'var(--up)' : 'var(--surf3)', color: canAfford ? '#fff' : 'var(--ink4)', fontWeight: 700, fontSize: 14, fontFamily: 'inherit', opacity: trading ? 0.6 : 1, cursor: (!canAfford || trading) ? 'not-allowed' : 'pointer' }}>
                {trading ? '...' : canAfford ? (ar ? `🪙 شراء ${qty} سهم بنقاطك` : `🪙 Buy ${qty} shares with points`) : (ar ? 'نقاطك غير كافية' : 'Insufficient points')}
              </button>
              <button onClick={() => { const n = !demoEnabled; setDemoEnabled(n); localStorage.setItem('demo_trading_enabled', String(n)); if (n) setTradeMode('demo') }}
                style={{ padding: '6px', borderRadius: 8, border: '1px solid var(--line)', background: 'none', color: 'var(--ink4)', fontSize: 10, fontFamily: 'inherit' }}>
                {demoEnabled ? (ar ? 'إيقاف التداول التجريبي' : 'Disable demo trading') : (ar ? 'تفعيل التداول التجريبي (نقدي تجريبي)' : 'Enable demo trading (virtual cash)')}
              </button>
            </div>
          )
        })() : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ padding: '8px 12px', background: 'rgba(79,107,255,0.08)', border: '1px solid rgba(79,107,255,0.2)', borderRadius: 8, fontSize: 11, color: 'var(--ink3)' }}>
              {ar ? '💹 تداول تجريبي — رصيد افتراضي فقط، ليس مالاً حقيقياً' : '💹 Demo trading — virtual balance only, not real money'}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['buy', 'sell'] as const).map(a => (
                <button key={a} onClick={() => { setAction(action === a ? null : a); setTradeMsg(null) }} style={{
                  flex: 1, padding: '10px', borderRadius: 10, fontWeight: 700, fontSize: 13, fontFamily: 'inherit',
                  background: action === a ? (a === 'buy' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.2)') : 'var(--surf3)',
                  color: action === a ? (a === 'buy' ? 'var(--up)' : 'var(--dn)') : 'var(--ink3)',
                  border: `1px solid ${action === a ? (a === 'buy' ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.35)') : 'var(--line)'}`,
                }}>
                  {a === 'buy' ? (ar ? '🟢 شراء' : '🟢 Buy') : (ar ? '🔴 بيع' : '🔴 Sell')}
                </button>
              ))}
            </div>
            {action && (
              <>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--ink4)', display: 'block', marginBottom: 4 }}>{ar ? 'الكمية (سهم)' : 'Quantity (shares)'}</label>
                  <input type="number" min="1" value={qty} onChange={e => { setQty(e.target.value); setTradeMsg(null) }}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 9, background: 'var(--surf3)', border: '1px solid var(--line2)', color: 'var(--ink)', fontFamily: 'var(--font-mono)', fontSize: 14, outline: 'none' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--surf3)', borderRadius: 9, fontSize: 12 }}>
                  <span style={{ color: 'var(--ink4)' }}>{ar ? 'التكلفة الإجمالية' : 'Total Cost'}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{(co.close * Number(qty || 0)).toFixed(3)} IQD</span>
                </div>
                {tradeMsg && <div style={{ padding: '9px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: tradeMsg.startsWith('✅') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${tradeMsg.startsWith('✅') ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`, color: tradeMsg.startsWith('✅') ? 'var(--up)' : 'var(--dn)' }}>{tradeMsg}</div>}
                <button onClick={handleDemoTrade} disabled={trading}
                  style={{ padding: '11px', borderRadius: 10, border: 'none', background: action === 'buy' ? 'var(--up)' : 'var(--dn)', color: '#fff', fontWeight: 700, fontSize: 14, fontFamily: 'inherit', opacity: trading ? 0.6 : 1 }}>
                  {trading ? '...' : action === 'buy' ? (ar ? `شراء ${qty} سهم (تجريبي)` : `Buy ${qty} shares (demo)`) : (ar ? `بيع ${qty} سهم (تجريبي)` : `Sell ${qty} shares (demo)`)}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
