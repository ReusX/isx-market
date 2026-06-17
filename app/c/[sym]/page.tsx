'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useApp } from '@/context/AppContext'
import { fetchLive, fetchCompanyMeta, mergeCompanies, fmtVol, fmtMcap } from '@/lib/market'
import type { Company } from '@/types'
import KChart from '@/components/KChart'

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

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CompanyPage() {
  const { sym }      = useParams<{ sym: string }>()
  const { lang, watchlist, toggleWatchlist } = useApp()
  const ar = lang === 'ar'

  const [co, setCo]           = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)

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

  const up   = co.pct >= 0
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
      <KChart sym={co.sym} />
    </div>
  )
}
