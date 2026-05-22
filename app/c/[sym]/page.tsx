'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useApp } from '@/context/AppContext'
import { fmtPts } from '@/lib/ranks'
import { fetchLive, fetchCompanyMeta, mergeCompanies, fmtVol, fmtMcap } from '@/lib/market'
import type { Company } from '@/types'

const TF = ['1D','1W','1M','3M','1Y','5Y'] as const

const TF_DAYS: Record<string,number> = { '1D':1,'1W':7,'1M':30,'3M':90,'1Y':365,'5Y':1825 }

function CoLogo({ sym, logo, color }: { sym: string; logo?: string; color?: string }) {
  const [err, setErr] = useState(false)
  if (logo && !err) return (
    <img src={logo} alt={sym}
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
  }, [sym, tf, color])

  return <div ref={ref} style={{ width: '100%', height: 340 }} />
}

export default function CompanyPage() {
  const { sym } = useParams<{ sym: string }>()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { lang, watchlist, toggleWatchlist, user, profile, authLoading, openAuth, refreshProfile } = useApp()
  const ar = lang === 'ar'

  const [co, setCo]             = useState<Company | null>(null)
  const [loading, setLoading]   = useState(true)
  const [tf, setTf]             = useState<string>('1M')
  const [action, setAction]     = useState<'buy' | 'sell' | null>(null)
  const [qty, setQty]           = useState('100')
  const [tradeMode, setTradeMode] = useState<'points' | 'demo'>('points')
  const [demoEnabled, setDemoEnabled] = useState(false)
  const [trading, setTrading]   = useState(false)
  const [tradeMsg, setTradeMsg] = useState<string | null>(null)

  // Load demo trading preference from localStorage
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
    if (!user || !co || !qty) return
    setTrading(true)
    setTradeMsg(null)
    const costPts = Math.round(Number(qty) * co.close)
    try {
      const res = await fetch('/api/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'buy_with_points', sym: co.sym, qty: Number(qty), price: co.close }),
      })
      const data = await res.json()
      if (data.ok) {
        setTradeMsg(ar
          ? `✅ اشتريت ${qty} سهم! نقاطك المتبقية: ${data.remainingPoints?.toLocaleString('en')}`
          : `✅ Bought ${qty} shares! Remaining: ${data.remainingPoints?.toLocaleString('en')} pts`)
        refreshProfile?.()
      } else {
        setTradeMsg(ar
          ? (data.error === 'Insufficient points' ? '❌ نقاطك غير كافية' : data.error)
          : data.error ?? 'Error')
      }
    } catch {
      setTradeMsg(ar ? 'خطأ في الاتصال' : 'Network error')
    }
    setTrading(false)
  }

  async function handleDemoTrade() {
    if (!user || !co || !action || !qty) return
    setTrading(true)
    setTradeMsg(null)
    try {
      const res = await fetch('/api/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, sym: co.sym, qty: Number(qty), price: co.close }),
      })
      const data = await res.json()
      if (data.ok) {
        setTradeMsg(ar
          ? `✅ ${action === 'buy' ? 'تم الشراء' : 'تم البيع'} بنجاح`
          : `✅ ${action === 'buy' ? 'Purchase' : 'Sale'} completed`)
      } else {
        setTradeMsg(data.error ?? 'Error')
      }
    } catch {
      setTradeMsg(ar ? 'خطأ في الاتصال' : 'Network error')
    }
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
            <CoLogo sym={co.sym} logo={co.logo} color={co.color} />
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

        {/* Header + mode toggle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>
            {ar ? 'اشترِ بنقاطك' : 'Buy with Points'}
          </div>
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
            <button onClick={() => openAuth('signup')} style={{
              padding: '9px 20px', background: 'var(--brand)', borderRadius: 10,
              fontSize: 13, fontWeight: 700, color: '#fff', border: 'none', fontFamily: 'inherit',
            }}>
              {ar ? 'إنشاء حساب' : 'Create Account'}
            </button>
          </div>

        ) : tradeMode === 'points' ? (() => {
          const userPoints = profile?.points ?? 0
          const sharePrice = co.close > 0 ? co.close : 0.001
          const maxAffordable = Math.floor(userPoints / sharePrice)
          const qtyNum = Number(qty) || 0
          const costPts = Math.round(qtyNum * sharePrice)
          const canAfford = userPoints >= costPts && qtyNum > 0
          const overBudget = qtyNum > 0 && !canAfford

          return (
          /* ── Points mode ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* Points balance row */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '9px 12px', background: 'rgba(245,200,75,0.08)',
              border: '1px solid rgba(245,200,75,0.2)', borderRadius: 9,
            }}>
              <span style={{ fontSize: 11, color: 'var(--ink4)' }}>{ar ? 'نقاطك المتاحة' : 'Your points'}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--gold)' }}>
                🪙 {userPoints.toLocaleString('en')}
              </span>
            </div>

            {/* Max affordable info */}
            <div style={{
              fontSize: 11, color: maxAffordable === 0 ? 'var(--dn)' : 'var(--ink3)',
              padding: '0 2px',
            }}>
              {maxAffordable === 0
                ? (ar ? `❌ نقاطك لا تكفي لشراء ولو سهم واحد (السعر: ${sharePrice.toFixed(3)} نقطة/سهم)` : `❌ Not enough points for even 1 share (${sharePrice.toFixed(3)} pts/share)`)
                : (ar
                    ? `يمكنك شراء حتى ${maxAffordable.toLocaleString('en')} سهم (${sharePrice.toFixed(3)} نقطة/سهم)`
                    : `You can buy up to ${maxAffordable.toLocaleString('en')} shares (${sharePrice.toFixed(3)} pts/share)`)}
            </div>

            {/* Qty input + Max button */}
            <div>
              <label style={{ fontSize: 11, color: 'var(--ink4)', display: 'block', marginBottom: 4 }}>
                {ar ? 'الكمية (سهم)' : 'Quantity (shares)'}
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="number" min="1" max={maxAffordable} value={qty}
                  onChange={e => { setQty(e.target.value); setTradeMsg(null) }}
                  style={{
                    flex: 1, padding: '9px 12px', borderRadius: 9,
                    background: 'var(--surf3)',
                    border: `1px solid ${overBudget ? 'rgba(239,68,68,0.5)' : 'var(--line2)'}`,
                    color: overBudget ? 'var(--dn)' : 'var(--ink)',
                    fontFamily: 'var(--font-mono)', fontSize: 14, outline: 'none',
                  }}
                />
                <button
                  onClick={() => { setQty(String(maxAffordable)); setTradeMsg(null) }}
                  disabled={maxAffordable === 0}
                  style={{
                    padding: '9px 14px', borderRadius: 9, border: '1px solid var(--line)',
                    background: 'var(--surf3)', color: 'var(--gold)',
                    fontSize: 11, fontWeight: 700, fontFamily: 'inherit',
                    opacity: maxAffordable === 0 ? 0.4 : 1,
                  }}
                >
                  {ar ? 'الحد الأقصى' : 'Max'}
                </button>
              </div>
              {overBudget && (
                <div style={{ fontSize: 10, color: 'var(--dn)', marginTop: 4 }}>
                  {ar
                    ? `نقاطك تكفي لـ ${maxAffordable.toLocaleString('en')} سهم فقط`
                    : `Your points only cover ${maxAffordable.toLocaleString('en')} shares`}
                </div>
              )}
            </div>

            {/* Cost summary */}
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '10px 12px', background: 'var(--surf3)', borderRadius: 9, fontSize: 12,
            }}>
              <span style={{ color: 'var(--ink4)' }}>{ar ? 'التكلفة' : 'Cost'}</span>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: overBudget ? 'var(--dn)' : 'var(--gold)' }}>
                  🪙 {costPts.toLocaleString('en')} {ar ? 'نقطة' : 'pts'}
                </span>
                {qtyNum > 0 && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink4)' }}>
                    {ar ? `يتبقى: ${Math.max(0, userPoints - costPts).toLocaleString('en')} نقطة` : `Remaining: ${Math.max(0, userPoints - costPts).toLocaleString('en')} pts`}
                  </span>
                )}
              </div>
            </div>

            {tradeMsg && (
              <div style={{
                padding: '9px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: tradeMsg.startsWith('✅') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                border: `1px solid ${tradeMsg.startsWith('✅') ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
                color: tradeMsg.startsWith('✅') ? 'var(--up)' : 'var(--dn)',
              }}>{tradeMsg}</div>
            )}

            <button
              onClick={handleBuyWithPoints}
              disabled={trading || !canAfford}
              style={{
                padding: '11px', borderRadius: 10, border: 'none',
                background: canAfford ? 'var(--up)' : 'var(--surf3)',
                color: canAfford ? '#fff' : 'var(--ink4)',
                fontWeight: 700, fontSize: 14, fontFamily: 'inherit',
                opacity: trading ? 0.6 : 1,
                cursor: (!canAfford || trading) ? 'not-allowed' : 'pointer',
              }}
            >
              {trading ? '...' : canAfford
                ? (ar ? `🪙 شراء ${qty} سهم بنقاطك` : `🪙 Buy ${qty} shares with points`)
                : (ar ? 'نقاطك غير كافية' : 'Insufficient points')}
            </button>

            {/* Demo trading toggle */}
            <button
              onClick={() => {
                const next = !demoEnabled
                setDemoEnabled(next)
                localStorage.setItem('demo_trading_enabled', String(next))
                if (next) setTradeMode('demo')
              }}
              style={{
                padding: '6px', borderRadius: 8, border: '1px solid var(--line)',
                background: 'none', color: 'var(--ink4)', fontSize: 10, fontFamily: 'inherit',
              }}
            >
              {demoEnabled
                ? (ar ? 'إيقاف التداول التجريبي' : 'Disable demo trading')
                : (ar ? 'تفعيل التداول التجريبي (نقدي تجريبي)' : 'Enable demo trading (virtual cash)')}
            </button>
          </div>
          )
        })() : (
          /* ── Demo mode ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{
              padding: '8px 12px', background: 'rgba(79,107,255,0.08)',
              border: '1px solid rgba(79,107,255,0.2)', borderRadius: 8, fontSize: 11, color: 'var(--ink3)',
            }}>
              {ar ? '💹 تداول تجريبي — رصيد افتراضي فقط، ليس مالاً حقيقياً' : '💹 Demo trading — virtual balance only, not real money'}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              {(['buy', 'sell'] as const).map(a => (
                <button key={a} onClick={() => { setAction(action === a ? null : a); setTradeMsg(null) }} style={{
                  flex: 1, padding: '10px', borderRadius: 10, fontWeight: 700, fontSize: 13, fontFamily: 'inherit',
                  background: action === a
                    ? (a === 'buy' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.2)')
                    : 'var(--surf3)',
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
                  <label style={{ fontSize: 11, color: 'var(--ink4)', display: 'block', marginBottom: 4 }}>
                    {ar ? 'الكمية (سهم)' : 'Quantity (shares)'}
                  </label>
                  <input type="number" min="1" value={qty} onChange={e => { setQty(e.target.value); setTradeMsg(null) }}
                    style={{
                      width: '100%', padding: '9px 12px', borderRadius: 9,
                      background: 'var(--surf3)', border: '1px solid var(--line2)',
                      color: 'var(--ink)', fontFamily: 'var(--font-mono)', fontSize: 14, outline: 'none',
                    }} />
                </div>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '10px 12px', background: 'var(--surf3)', borderRadius: 9, fontSize: 12,
                }}>
                  <span style={{ color: 'var(--ink4)' }}>{ar ? 'التكلفة الإجمالية' : 'Total Cost'}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                    {(co.close * Number(qty || 0)).toFixed(3)} IQD
                  </span>
                </div>

                {tradeMsg && (
                  <div style={{
                    padding: '9px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    background: tradeMsg.startsWith('✅') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                    border: `1px solid ${tradeMsg.startsWith('✅') ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
                    color: tradeMsg.startsWith('✅') ? 'var(--up)' : 'var(--dn)',
                  }}>{tradeMsg}</div>
                )}

                <button onClick={handleDemoTrade} disabled={trading} style={{
                  padding: '11px', borderRadius: 10, border: 'none',
                  background: action === 'buy' ? 'var(--up)' : 'var(--dn)',
                  color: '#fff', fontWeight: 700, fontSize: 14, fontFamily: 'inherit',
                  opacity: trading ? 0.6 : 1,
                }}>
                  {trading ? '...' : action === 'buy'
                    ? (ar ? `شراء ${qty} سهم (تجريبي)` : `Buy ${qty} shares (demo)`)
                    : (ar ? `بيع ${qty} سهم (تجريبي)` : `Sell ${qty} shares (demo)`)}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
