'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useApp } from '@/context/AppContext'
import { fetchLive, fetchCompanyMeta, mergeCompanies, fmtVol, fmtMcap } from '@/lib/market'
import type { Company } from '@/types'

const TF = ['1D','1W','1M','3M','1Y','5Y'] as const

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

// Simple placeholder chart — replace with real chart lib later
function PriceChart({ sym, tf, pct }: { sym: string; tf: string; pct: number }) {
  const up = pct >= 0
  const pts = Array.from({ length: 40 }, (_, i) => {
    const noise = (Math.sin(i * 0.7 + sym.charCodeAt(0)) + Math.sin(i * 1.3)) * 8
    return 60 + noise + (up ? i * 0.5 : -i * 0.5)
  })
  const min = Math.min(...pts), max = Math.max(...pts)
  const norm = (v: number) => 90 - ((v - min) / (max - min)) * 80
  const poly = pts.map((v, i) => `${(i / 39) * 560},${norm(v)}`).join(' ')
  const fill = pts.map((v, i) => `${(i / 39) * 560},${norm(v)}`).concat(['560,100', '0,100']).join(' ')

  return (
    <svg viewBox="0 0 560 100" preserveAspectRatio="none" style={{ width: '100%', height: 160 }}>
      <defs>
        <linearGradient id="chg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={up ? '#22C55E' : '#EF4444'} stopOpacity="0.3" />
          <stop offset="100%" stopColor={up ? '#22C55E' : '#EF4444'} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={fill} fill="url(#chg)" />
      <polyline points={poly} fill="none" stroke={up ? '#22C55E' : '#EF4444'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function CompanyPage() {
  const { sym } = useParams<{ sym: string }>()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { lang, watchlist, toggleWatchlist, user, authLoading } = useApp()
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
        <PriceChart sym={co.sym} tf={tf} pct={co.pct} />
        <p style={{ fontSize: 10, color: 'var(--ink4)', textAlign: 'center', margin: '8px 0 0' }}>
          {ar ? '* بيانات تقريبية — سيتم توصيل البيانات الحقيقية قريباً' : '* Illustrative — real OHLCV data coming soon'}
        </p>
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
            <Link href="/?auth=signup" style={{
              padding: '9px 20px', background: 'var(--brand)', borderRadius: 10,
              fontSize: 13, fontWeight: 700, color: '#fff',
            }}>
              {ar ? 'إنشاء حساب' : 'Create Account'}
            </Link>
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
