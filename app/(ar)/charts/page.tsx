'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { useLocale } from '@/context/LocaleContext'
import { useApp } from '@/context/AppContext'
import { fetchLive, fetchCompanyMeta, mergeCompanies } from '@/lib/market'
import { compositeWatermark, downloadImage, copyImage } from '@/lib/watermark'
import type { Company } from '@/types'
import Link from 'next/link'

// ─── Timeframe config ─────────────────────────────────────────────────────────
const TF = [
  { id: '1D',  label: '1D',  days: 1    },
  { id: '1W',  label: '1W',  days: 7    },
  { id: '1M',  label: '1M',  days: 30   },
  { id: '3M',  label: '3M',  days: 90   },
  { id: '1Y',  label: '1Y',  days: 365  },
  { id: '5Y',  label: '5Y',  days: 1825 },
  { id: 'ALL', label: 'كل', days: 99999 },
] as const

// ─── Convert Unix timestamp → YYYY-MM-DD (Baghdad +3h offset) ────────────────
function tsToDate(ts: number): string {
  const d = new Date((ts + 10800) * 1000)   // +3 h for Iraq timezone
  return d.getUTCFullYear() + '-' +
    String(d.getUTCMonth() + 1).padStart(2, '0') + '-' +
    String(d.getUTCDate()).padStart(2, '0')
}

// ─── Real RSISX Chart (Lightweight Charts) ────────────────────────────────────
function RSISXChart({ tf }: { tf: string }) {
  const ref     = useRef<HTMLDivElement>(null)
  const tipRef  = useRef<HTMLDivElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const chartInst = useRef<any>(null)
  const [exportMsg, setExportMsg] = useState('')

  const exportImage = async (mode: 'download' | 'copy') => {
    const chart = chartInst.current
    if (!chart) return
    try {
      const shot = chart.takeScreenshot() as HTMLCanvasElement
      const { blob, url } = await compositeWatermark(shot.toDataURL('image/png'), {
        bg: '#0b0f1a', label: 'ISX60',
      })
      if (mode === 'download') {
        downloadImage(url, 'ISX60-iraqsm.png')
        setExportMsg('تم التنزيل ✓')
      } else {
        const ok = await copyImage(blob)
        setExportMsg(ok ? 'تم النسخ ✓' : 'النسخ غير مدعوم · استخدم التنزيل')
      }
    } catch {
      setExportMsg('تعذّر التصدير')
    }
    setTimeout(() => setExportMsg(''), 2200)
  }

  useEffect(() => {
    if (!ref.current) return
    let chart: any = null
    let ro: ResizeObserver | null = null

    async function init() {
      const LC = await import('lightweight-charts')

      // ISX60 · the official market index from OUR OWN daily_index table
      // (parsed ISX daily workbooks, refreshed by the daily cron).
      const { createClient } = await import('@/lib/supabase/client')
      const tfObj = TF.find(t => t.id === tf) ?? TF[4]
      // 2015-03-05 minimum: ISX60 was rebased here (~70 → ~850 base). Earlier
      // values are on the old base and would distort the series, so we floor
      // at the rebase date and show one continuous scale from there to today.
      const minDate = '2015-03-05'
      const fromDate = tfObj.days < 99999
        ? new Date(Date.now() - tfObj.days * 86400 * 1000).toISOString().slice(0, 10)
        : minDate
      // The project caps API responses at 1000 rows, so page through with
      // .range() until a short page comes back (full history ≈ 2.6k+ points).
      const sb = createClient()
      const PAGE = 1000
      const rows: { date: string; isx60: number }[] = []
      for (let from = 0; ; from += PAGE) {
        const { data: page } = await sb
          .from('daily_index')
          .select('date,isx60')
          .not('isx60', 'is', null)
          .gte('date', fromDate)
          .order('date')
          .range(from, from + PAGE - 1)
        if (!page?.length) break
        rows.push(...(page as any))
        if (page.length < PAGE) break
      }
      const data = rows.map(r => ({ time: r.date as any, value: r.isx60 as number }))

      if (!data.length || !ref.current) return

      chart = LC.createChart(ref.current, {
        width:  ref.current.clientWidth,
        height: 420,
        layout: {
          background:  { color: 'transparent' },
          textColor:   'rgba(255,255,255,0.5)',
          fontFamily:  'var(--font-ar), sans-serif',
          fontSize:    12,
        },
        grid: {
          vertLines: { color: 'rgba(255,255,255,0.04)' },
          horzLines: { color: 'rgba(255,255,255,0.04)' },
        },
        crosshair: { mode: LC.CrosshairMode.Normal },
        rightPriceScale: {
          borderColor: 'rgba(255,255,255,0.07)',
          scaleMargins: { top: 0.08, bottom: 0.08 },
        },
        timeScale: {
          borderColor: 'rgba(255,255,255,0.07)',
          timeVisible: false,
          // allow fitContent to compress the full multi-year daily series
          // (~2.6k points) into a narrow container; the default minBarSpacing
          // (~0.5px) otherwise clips the view to the most recent ~800 days.
          minBarSpacing: 0.02,
        },
        watermark: {
          visible:   true,
          text:      'iraqsm.com',
          fontSize:  64,
          color:     'rgba(79,107,255,0.16)',
          horzAlign: 'center',
          vertAlign:  'center',
          fontStyle:  'bold',
        },
        handleScroll: true,
        handleScale:  true,
      })
      chartInst.current = chart

      const up = data[data.length - 1].value >= data[0].value
      const lineColor = up ? '#22C55E' : '#EF4444'

      const area = chart.addAreaSeries({
        lineColor,
        topColor:    lineColor + '44',
        bottomColor: lineColor + '05',
        lineWidth:   2,
        priceLineVisible: true,
        priceLineColor:   lineColor + '88',
        crosshairMarkerVisible: true,
        crosshairMarkerRadius:  4,
        crosshairMarkerBorderColor: lineColor,
        crosshairMarkerBackgroundColor: lineColor,
        lastValueVisible: true,
        lastPriceAnimation: LC.LastPriceAnimationMode?.Continuous ?? 0,
      })

      area.setData(data)
      chart.timeScale().fitContent()

      // ── Custom crosshair tooltip ──────────────────────────────────────────
      chart.subscribeCrosshairMove((param: any) => {
        const tip  = tipRef.current
        const wrap = wrapRef.current
        if (!tip || !wrap) return

        if (!param.time || !param.point || param.point.x < 0 || param.point.y < 0) {
          tip.style.display = 'none'
          return
        }

        const d = param.seriesData.get(area)
        if (d == null) { tip.style.display = 'none'; return }

        // param.time is a string "YYYY-MM-DD" for area series with string time
        let dateStr = ''
        if (typeof param.time === 'string') {
          dateStr = param.time
        } else if (param.time && typeof param.time === 'object') {
          const { year, month, day } = param.time as any
          dateStr = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`
        }

        const val = typeof d === 'object' && 'value' in d ? d.value : d as number

        tip.innerHTML = `
          <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-bottom:4px">${dateStr}</div>
          <div style="font-size:15px;font-weight:800;color:#fff;font-family:'JetBrains Mono',monospace">${val.toFixed(2)}</div>
        `
        tip.style.display = 'block'

        const chartW = wrap.clientWidth
        const tw = tip.offsetWidth || 120
        const x = param.point.x
        const y = param.point.y
        tip.style.left  = (x + tw + 16 > chartW ? x - tw - 8 : x + 10) + 'px'
        tip.style.top   = Math.max(4, y - 32) + 'px'
      })

      // Remove TradingView attribution logo
      ref.current?.querySelectorAll('a[href*="tradingview"]').forEach(el => el.remove())

      ro = new ResizeObserver(() => {
        if (chart && ref.current) chart.applyOptions({ width: ref.current.clientWidth })
      })
      ro.observe(ref.current)
    }

    init()
    return () => {
      ro?.disconnect()
      chart?.remove()
    }
  }, [tf])

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%' }}>
      {/* Export controls */}
      <div style={{ position: 'absolute', top: 8, insetInlineEnd: 8, zIndex: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
        {exportMsg && (
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--brand)', background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 6, padding: '3px 7px' }}>{exportMsg}</span>
        )}
        <button onClick={() => exportImage('download')} title="تنزيل صورة الرسم (PNG)"
          style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 7, background: 'var(--surf)', border: '1px solid var(--line)', color: 'var(--ink3)', cursor: 'pointer', fontSize: 14 }}>⬇</button>
        <button onClick={() => exportImage('copy')} title="نسخ صورة الرسم"
          style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 7, background: 'var(--surf)', border: '1px solid var(--line)', color: 'var(--ink3)', cursor: 'pointer', fontSize: 14 }}>⧉</button>
      </div>
      <div ref={ref} style={{ width: '100%', height: 420 }} />
      <div ref={tipRef} style={{
        display: 'none',
        position: 'absolute',
        pointerEvents: 'none',
        zIndex: 10,
        background: 'rgba(17,21,30,0.95)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 8,
        padding: '8px 12px',
        minWidth: 110,
      }} />
    </div>
  )
}

// ─── Simple SVG sparkline for company mini-cards ──────────────────────────────
function MiniSpark({ points, up }: { points: number[]; up: boolean }) {
  if (!points || points.length < 2) {
    return (
      <svg width="100%" height="48" viewBox="0 0 120 48" preserveAspectRatio="none">
        <line x1="0" y1="24" x2="120" y2="24" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" />
      </svg>
    )
  }
  const min = Math.min(...points), max = Math.max(...points)
  const range = max - min || 1
  const w = 120, h = 48, pad = 3
  const pts = points.map((v, i) => {
    const x = pad + (i / (points.length - 1)) * (w - pad * 2)
    const y = h - pad - ((v - min) / range) * (h - pad * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const color = up ? '#22C55E' : '#EF4444'
  const first = pts[0], last = pts[pts.length - 1]
  const lx = last.split(',')[0], ly = last.split(',')[1]
  const poly = pts.join(' ')
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`sg-${up}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`${first} ${poly} ${lx},${h} ${pad},${h}`} fill={`url(#sg-${up})`} />
      <polyline points={poly} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ChartsPage() {
  const { watchlist } = useApp()
  const { locale } = useLocale()
  const ar = locale === 'ar'

  const [companies, setCompanies] = useState<Company[]>([])
  const [rsisxPct, setRsisxPct]   = useState(0)
  const [rsisxVal, setRsisxVal]   = useState('·')
  const [loading,  setLoading]    = useState(true)
  const [tf,       setTf]         = useState('1Y')
  const [view,     setView]       = useState<'grid' | 'watchlist'>('grid')
  const [histShort, setHistShort] = useState<Record<string, [number,number][]>>({})

  useEffect(() => {
    ;(async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const db = createClient()
        const cutoff = new Date(Date.now() - 60 * 86400 * 1000).toISOString().slice(0, 10)
        const [live, meta, spark, idx] = await Promise.all([
          fetchLive(),
          fetchCompanyMeta(),
          // sparklines + hero index from OUR OWN tables (parsed ISX reports)
          db.from('daily_prices').select('ticker,date,close').gte('date', cutoff).order('date'),
          db.from('daily_index').select('date,isx60').not('isx60', 'is', null)
            .order('date', { ascending: false }).limit(2),
        ])
        setCompanies(mergeCompanies(meta, live.stocks))
        const bySym: Record<string, [number, number][]> = {}
        for (const r of spark.data ?? []) {
          if (r.close == null) continue
          ;(bySym[r.ticker] ??= []).push([Date.parse(r.date) / 1000, r.close])
        }
        setHistShort(bySym)
        const [last, prev] = idx.data ?? []
        if (last?.isx60) {
          setRsisxVal(Number(last.isx60).toFixed(2))
          setRsisxPct(prev?.isx60 ? ((last.isx60 - prev.isx60) / prev.isx60) * 100 : 0)
        }
      } catch { /* keep defaults */ }
      setLoading(false)
    })()
  }, [])

  const display = useMemo(() =>
    view === 'watchlist'
      ? companies.filter(c => watchlist.includes(c.sym))
      : companies.filter(c => c.close > 0),
    [companies, view, watchlist]
  )

  const rsisxUp = rsisxPct >= 0

  function sparkPts(sym: string) {
    const s = histShort[sym]
    if (!s || s.length < 2) return []
    return s.slice(-30).map(p => p[1])
  }

  return (
    <div className="terminal-shell app-page charts-page">

      {/* ── RSISX Hero Chart ── */}
      <div style={{
        background: 'var(--surf)', border: '1px solid var(--line)',
        borderRadius: 20, padding: '20px 24px', marginBottom: 24,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            {/* The page's h1. It was a plain <div>, which left /charts with no
                heading at all once the layout's hidden duplicate was removed. */}
            <h1 style={{ fontSize: 12, color: 'var(--ink4)', fontWeight: 600, margin: '0 0 6px' }}>
              {ar ? 'مخططات الاسهم العراقية · مؤشر ISX60' : 'Iraq stock charts · ISX60 index'}
            </h1>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 36, fontWeight: 800, letterSpacing: '-1px' }}>
                {rsisxVal}
              </span>
              {!loading && (
                <span style={{
                  fontSize: 15, fontWeight: 700,
                  color: rsisxUp ? 'var(--up)' : 'var(--dn)',
                }}>
                  {rsisxUp ? '▲' : '▼'} {Math.abs(rsisxPct).toFixed(2)}%
                </span>
              )}
            </div>
          </div>

          {/* TF buttons */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {TF.map(t => (
              <button key={t.id} onClick={() => setTf(t.id)} style={{
                padding: '5px 12px', borderRadius: 7,
                background: tf === t.id ? 'var(--brand)' : 'none',
                border: `1px solid ${tf === t.id ? 'var(--brand)' : 'var(--line)'}`,
                color: tf === t.id ? '#fff' : 'var(--ink3)',
                fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
                cursor: 'pointer',
              }}>{t.label}</button>
            ))}
          </div>
        </div>

        {/* Chart */}
        {loading
          ? <div className="skeleton" style={{ height: 420, borderRadius: 12 }} />
          : <RSISXChart tf={tf} />
        }
      </div>

      {/* ── Company mini-chart grid ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>
          {ar ? 'أسهم الشركات' : 'Company Charts'}
        </h2>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['grid', 'watchlist'] as const).map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: '5px 14px', borderRadius: 999, border: 'none',
              background: view === v ? 'var(--brand)' : 'var(--surf)',
              color: view === v ? '#fff' : 'var(--ink3)',
              fontSize: 11, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
            }}>
              {v === 'grid' ? (ar ? 'الكل' : 'All') : (ar ? 'المراقبة' : 'Watchlist')}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 120, borderRadius: 14 }} />
          ))}
        </div>
      ) : display.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--ink4)', fontSize: 13 }}>
          {ar
            ? 'قائمة المراقبة فارغة · أضف شركات من صفحة السوق ★'
            : 'Watchlist empty · add companies from Market page ★'
          }
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
          {display.map(co => {
            const up = co.pct >= 0
            const pts = sparkPts(co.sym)
            return (
              <Link key={co.sym} href={`/c/${co.sym}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  background: 'var(--surf)', border: '1px solid var(--line)',
                  borderRadius: 14, overflow: 'hidden', cursor: 'pointer',
                  transition: 'border-color 0.15s, transform 0.1s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--brand)'
                  ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--line)'
                  ;(e.currentTarget as HTMLDivElement).style.transform = ''
                }}
                >
                  <div style={{ padding: '10px 12px 6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>
                        {co.sym}
                      </span>
                      <span style={{
                        fontSize: 10, fontWeight: 700,
                        color: up ? 'var(--up)' : 'var(--dn)',
                      }}>
                        {up ? '+' : ''}{co.pct.toFixed(2)}%
                      </span>
                    </div>
                    <div style={{
                      fontSize: 10, color: 'var(--ink4)', marginTop: 2,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {ar ? co.ar : co.en}
                    </div>
                  </div>

                  {/* Sparkline */}
                  <MiniSpark points={pts} up={up} />

                  <div style={{ padding: '4px 12px 10px', fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700 }}>
                    {co.close > 0 ? co.close.toFixed(3) : '·'}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
