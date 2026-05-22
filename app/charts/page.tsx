'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { useApp } from '@/context/AppContext'
import { fetchLive, fetchCompanyMeta, mergeCompanies } from '@/lib/market'
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

  useEffect(() => {
    if (!ref.current) return
    let chart: any = null
    let ro: ResizeObserver | null = null

    async function init() {
      const LC  = await import('lightweight-charts')
      const res = await fetch('/data/hist.json?t=' + Math.floor(Date.now() / 86400000))
      const hist = await res.json()

      const tfObj = TF.find(t => t.id === tf) ?? TF[4]
      const useLong = tfObj.days >= 365
      const raw: [number, number][] = useLong ? (hist.rsisx_l ?? []) : (hist.rsisx_s ?? [])
      const cutoff = tfObj.days >= 99999 ? 0 : Date.now() / 1000 - tfObj.days * 86400
      const filtered = raw.filter(p => p[0] >= cutoff)

      // Convert to date strings (Lightweight Charts is most reliable with YYYY-MM-DD)
      // Deduplicate: if two entries land on the same date, keep the last one
      const seen = new Map<string, number>()
      for (const [ts, v] of filtered) {
        seen.set(tsToDate(ts), v)
      }
      const data = Array.from(seen.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([time, value]) => ({ time: time as any, value }))

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
        },
        watermark: {
          visible:   true,
          text:      'iraqsm.com',
          fontSize:  16,
          color:     'rgba(79,107,255,0.18)',
          horzAlign: 'left',
          vertAlign:  'bottom',
          fontStyle:  'bold',
        },
        handleScroll: true,
        handleScale:  true,
      })

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
  const { lang, watchlist } = useApp()
  const ar = lang === 'ar'

  const [companies, setCompanies] = useState<Company[]>([])
  const [rsisxPct, setRsisxPct]   = useState(0)
  const [rsisxVal, setRsisxVal]   = useState('—')
  const [loading,  setLoading]    = useState(true)
  const [tf,       setTf]         = useState('1Y')
  const [view,     setView]       = useState<'grid' | 'watchlist'>('grid')
  const [histShort, setHistShort] = useState<Record<string, [number,number][]>>({})

  useEffect(() => {
    Promise.all([
      fetchLive(),
      fetchCompanyMeta(),
      fetch('/data/hist.json?t=' + Math.floor(Date.now() / 86400000)).then(r => r.json()).catch(() => ({})),
    ])
      .then(([live, meta, hist]) => {
        setCompanies(mergeCompanies(meta, live.stocks))
        setHistShort(hist.s ?? {})
        if (live.rsisx) {
          setRsisxPct(Number(live.rsisx.pct))
          setRsisxVal(Number(live.rsisx.value).toFixed(2))
        }
      })
      .finally(() => setLoading(false))
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
    <div style={{ maxWidth: 1440, margin: '0 auto', padding: '20px 24px 80px' }}>

      {/* ── RSISX Hero Chart ── */}
      <div style={{
        background: 'var(--surf)', border: '1px solid var(--line)',
        borderRadius: 20, padding: '20px 24px', marginBottom: 24,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--ink4)', fontWeight: 600, marginBottom: 6 }}>
              {ar ? 'مؤشر ربيع للأوراق المالية' : 'Rabee Securities ISX Index'}
            </div>
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
            ? 'قائمة المراقبة فارغة — أضف شركات من صفحة السوق ★'
            : 'Watchlist empty — add companies from Market page ★'
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
                    {co.close > 0 ? co.close.toFixed(3) : '—'}
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
