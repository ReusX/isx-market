'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useApp } from '@/context/AppContext'
import { fetchLive, fetchCompanyMeta, mergeCompanies, fmtVol, fmtMcap } from '@/lib/market'
import type { Company } from '@/types'

const TF = ['1D','1W','1M','3M','1Y','5Y'] as const

const TF_DAYS: Record<string,number> = { '1D':1,'1W':7,'1M':30,'3M':90,'1Y':365,'5Y':1825 }

function CoLogo({ sym, color }: { sym: string; color?: string }) {
  const [err, setErr] = useState(false)
  if (!err) return (
    <img src={`https://isc.gov.iq/Uploads/Companies/${sym}.png`} alt={sym}
      width={48} height={48}
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

function tsToDate(ts: number): string {
  const d = new Date((ts + 10800) * 1000)
  return d.getUTCFullYear() + '-' +
    String(d.getUTCMonth() + 1).padStart(2, '0') + '-' +
    String(d.getUTCDate()).padStart(2, '0')
}

function PriceChart({ sym, tf, color }: { sym: string; tf: string; color?: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    let chart: any = null
    let ro: ResizeObserver | null = null

    async function init() {
      const LC = await import('lightweight-charts')
      if (!ref.current) return

      const [histRes, ohlcvRes] = await Promise.all([
        fetch('/data/hist.json?t=' + Math.floor(Date.now() / 86400000)).then(r => r.json()),
        fetch('/data/ohlcv.json?t=' + Math.floor(Date.now() / 86400000)).then(r => r.json()),
      ])

      const days = TF_DAYS[tf] ?? 30
      const useLong = days >= 1825
      const raw: [number, number][] = (useLong ? histRes.l?.[sym] : null) ?? histRes.s?.[sym] ?? []
      const cutoff = Date.now() / 1000 - days * 86400
      const series = raw.filter(p => p[0] >= cutoff)

      // Build candles
      const candles = series.map((p, i) => {
        const [ts, c] = p
        const dateStr = tsToDate(ts)
        const ov = ohlcvRes?.[dateStr]?.[sym]
        if (ov?.o && ov?.h && ov?.l && ov?.c && +ov.c > 0) {
          return { time: ts as any, open: +Number(ov.o).toFixed(4), high: +Number(ov.h).toFixed(4), low: +Math.max(0.001, Number(ov.l)).toFixed(4), close: +Number(ov.c).toFixed(4) }
        }
        const prev = i > 0 ? series[i - 1][1] : c
        const hi = Math.max(prev, c), lo = Math.min(prev, c)
        const pad = (hi - lo) * 0.18 + c * 0.0015
        return { time: ts as any, open: +prev.toFixed(4), high: +(hi + pad).toFixed(4), low: +Math.max(0.001, lo - pad).toFixed(4), close: +c.toFixed(4) }
      })

      if (!candles.length || !ref.current) return

      const lineColor = color || '#4F6BFF'
      chart = LC.createChart(ref.current, {
        width: ref.current.clientWidth,
        height: 340,
        layout: { background: { color: 'transparent' }, textColor: 'rgba(255,255,255,0.45)', fontFamily: 'var(--font-ar), sans-serif', fontSize: 11 },
        grid: { vertLines: { color: 'rgba(255,255,255,0.05)' }, horzLines: { color: 'rgba(255,255,255,0.05)' } },
        crosshair: { mode: LC.CrosshairMode.Normal },
        rightPriceScale: { borderColor: 'rgba(255,255,255,0.08)' },
        timeScale: { borderColor: 'rgba(255,255,255,0.08)', timeVisible: false },
        watermark: { visible: true, text: 'iraqsm.com', fontSize: 14, color: 'rgba(79,107,255,0.25)', horzAlign: 'left', vertAlign: 'bottom', fontStyle: 'bold' },
        handleScroll: true,
        handleScale: true,
      })

      const areaSeries = chart.addAreaSeries({
        lineColor,
        topColor: lineColor + '55',
        bottomColor: lineColor + '05',
        lineWidth: 2,
        priceLineVisible: false,
      })
      areaSeries.setData(candles.map(c => ({ time: c.time, value: c.close })))
      chart.timeScale().fitContent()

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
  }, [sym, tf, color])

  return <div ref={ref} style={{ width: '100%', height: 340 }} />
}

export default function CompanyPage() {
  const { sym } = useParams<{ sym: string }>()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { lang, watchlist, toggleWatchlist, user, authLoading, openAuth } = useApp()
  const ar = lang === 'ar'

  const [co, setCo]             = useState<Company | null>(null)
  const [loading, setLoading]   = useState(true)
  const [tf, setTf]             = useState<string>('1M')
  const [action, setAction]     = useState<'buy' | 'sell' | null>(
    (searchParams.get('action') as any) ?? null
  )
  const [qty, setQty]           = useState('100')

  useEffect(() => {
    Promise.all([fetchLive(), fetchCompanyMeta()])
      .then(([live, meta]) => {
        const all = mergeCompanies(meta, live.stocks)
        setCo(all.find(c => c.sym === sym) ?? null)
      })
      .finally(() => setLoading(false))
  }, [sym])

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

  const up  = co.pct >= 0
  const inWL = watchlist.includes(co.sym)

  const stat = (label: string, value: string) => (
    <div>
      <div style={{ fontSize: 10, color: 'var(--ink4)', fontWeight: 600, marginBottom: 3 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600 }}>{value}</div>
    </div>
  )

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px' }}>
      {/* Breadcrumb */}
      <div style={{ fontSize: 11, color: 'var(--ink4)', marginBottom: 16 }}>
        <Link href="/market" style={{ color: 'var(--ink4)' }}>
          {ar ? 'السوق' : 'Market'}
        </Link>
        <span style={{ margin: '0 6px' }}>›</span>
        <span style={{ color: 'var(--ink)' }}>{co.sym}</span>
      </div>

      {/* Hero card */}
      <div style={{
        background: 'var(--surf)', border: '1px solid var(--line)',
        borderRadius: 20, padding: '20px 24px', marginBottom: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <CoLogo sym={co.sym} color={co.color} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20, fontWeight: 800 }}>{ar ? co.ar : co.en}</span>
                <button onClick={() => toggleWatchlist(co.sym)}
                  style={{ background: 'none', border: 'none', fontSize: 16, color: inWL ? 'var(--gold)' : 'var(--ink4)', cursor: 'pointer' }}>★</button>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 3 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink4)' }}>{co.sym}</span>
                <span style={{
                  padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700,
                  background: 'var(--surf3)', color: 'var(--ink3)',
                }}>{co.sec}</span>
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'end' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 32, fontWeight: 800 }}>
              {co.close.toFixed(3)}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: up ? 'var(--up)' : 'var(--dn)' }}>
              {up ? '▲' : '▼'} {Math.abs(co.pct).toFixed(2)}% ({co.change >= 0 ? '+' : ''}{co.change.toFixed(3)})
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
          gap: 16, marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--line)',
        }}>
          {stat(ar ? 'فتح' : 'Open',   co.open.toFixed(3))}
          {stat(ar ? 'أعلى' : 'High',  co.high.toFixed(3))}
          {stat(ar ? 'أدنى' : 'Low',   co.low.toFixed(3))}
          {stat(ar ? 'الحجم' : 'Vol',  fmtVol(co.vol))}
          {stat(ar ? 'القيمة السوقية' : 'Mkt Cap', fmtMcap(co.mcap))}
          {stat(ar ? 'الصفقات' : 'Deals', (co.deals ?? 0).toLocaleString('en'))}
        </div>
      </div>

      {/* Chart card */}
      <div style={{ background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 20, padding: '20px 24px', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>{ar ? 'المخطط السعري' : 'Price Chart'}</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {TF.map(t => (
              <button key={t} onClick={() => setTf(t)} style={{
                padding: '4px 10px', borderRadius: 6,
                background: tf === t ? 'var(--brand)' : 'none',
                border: `1px solid ${tf === t ? 'var(--brand)' : 'var(--line)'}`,
                color: tf === t ? '#fff' : 'var(--ink3)',
                fontSize: 11, fontWeight: 700, fontFamily: 'inherit',
              }}>{t}</button>
            ))}
          </div>
        </div>
        <PriceChart sym={co.sym} tf={tf} color={co.color} />
      </div>

      {/* Trade card */}
      <div style={{ background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 20, padding: '20px 24px' }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>{ar ? 'تداول' : 'Paper Trade'}</div>
        {authLoading ? (
          <div style={{ padding: '20px 0' }}>
            <div className="skeleton" style={{ height: 40, borderRadius: 10, marginBottom: 12 }} />
            <div className="skeleton" style={{ height: 40, borderRadius: 10, marginBottom: 12 }} />
            <div className="skeleton" style={{ height: 44, borderRadius: 10 }} />
          </div>
        ) : !user ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 13, color: 'var(--ink3)', marginBottom: 12 }}>
              {ar ? 'سجّل دخولك للتداول الافتراضي' : 'Sign in to paper trade'}
            </div>
            <button onClick={() => openAuth('signup')} style={{
              padding: '9px 20px', background: 'var(--brand)', borderRadius: 10,
              fontSize: 13, fontWeight: 700, color: '#fff', border: 'none', fontFamily: 'inherit',
            }}>
              {ar ? 'إنشاء حساب' : 'Create Account'}
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {(['buy', 'sell'] as const).map(a => (
                <button key={a} onClick={() => setAction(action === a ? null : a)} style={{
                  flex: 1, padding: '10px', borderRadius: 10,
                  background: action === a
                    ? (a === 'buy' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.2)')
                    : 'var(--surf3)',
                  color: action === a
                    ? (a === 'buy' ? 'var(--up)' : 'var(--dn)')
                    : 'var(--ink3)',
                  fontWeight: 700, fontSize: 13, fontFamily: 'inherit',
                  border: `1px solid ${action === a ? (a === 'buy' ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.35)') : 'var(--line)'}`,
                }}>
                  {a === 'buy' ? (ar ? '🟢 شراء' : '🟢 Buy') : (ar ? '🔴 بيع' : '🔴 Sell')}
                </button>
              ))}
            </div>
            {action && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--ink4)', display: 'block', marginBottom: 4 }}>
                    {ar ? 'الكمية (سهم)' : 'Quantity (shares)'}
                  </label>
                  <input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)}
                    style={{
                      width: '100%', padding: '9px 12px', borderRadius: 9,
                      background: 'var(--surf3)', border: '1px solid var(--line2)',
                      color: 'var(--ink)', fontFamily: 'var(--font-mono)', fontSize: 14, outline: 'none',
                    }} />
                </div>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '10px 12px', background: 'var(--surf3)', borderRadius: 9,
                  fontSize: 12,
                }}>
                  <span style={{ color: 'var(--ink4)' }}>{ar ? 'التكلفة الإجمالية' : 'Total Cost'}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                    {(co.close * Number(qty || 0)).toFixed(3)} IQD
                  </span>
                </div>
                <button
                  onClick={() => router.push(`/wallet?action=${action}&sym=${co.sym}&qty=${qty}`)}
                  style={{
                    padding: '11px', borderRadius: 10, border: 'none',
                    background: action === 'buy' ? 'var(--up)' : 'var(--dn)',
                    color: '#fff', fontWeight: 700, fontSize: 14, fontFamily: 'inherit',
                  }}>
                  {action === 'buy'
                    ? (ar ? `شراء ${qty} سهم` : `Buy ${qty} shares`)
                    : (ar ? `بيع ${qty} سهم` : `Sell ${qty} shares`)}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
