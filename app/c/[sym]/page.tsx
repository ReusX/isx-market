'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useApp } from '@/context/AppContext'
import { fetchLive, fetchCompanyMeta, mergeCompanies, fmtVol, fmtMcap } from '@/lib/market'
import type { Company } from '@/types'
import KChart from '@/components/KChart'
import FinancialHighlights from '@/components/FinancialHighlights'

// ─── Logo ────────────────────────────────────────────────────────────────────
function CoLogo({ sym, logo, color, size = 40 }: { sym: string; logo?: string; color?: string; size?: number }) {
  const [err, setErr] = useState(false)
  if (logo && !err) return (
    <img src={logo} alt={sym} width={size} height={size}
      style={{ borderRadius: 10, objectFit: 'contain', background: '#fff', padding: 3, flexShrink: 0 }}
      onError={() => setErr(true)} />
  )
  return (
    <div style={{
      width: size, height: size, borderRadius: 10, background: color || 'var(--brand)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
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
  const [pe, setPe]           = useState<number | null>(null)

  useEffect(() => {
    Promise.all([fetchLive(), fetchCompanyMeta()])
      .then(([live, meta]) => {
        const all = mergeCompanies(meta, live.stocks)
        const found = all.find(c => c.sym === sym) ?? null
        setCo(found)
        if (found?.close) {
          ;(async () => {
            const { createClient } = await import('@/lib/supabase/client')
            const { fetchTtmPe } = await import('@/lib/fundamentals')
            const results = await fetchTtmPe(createClient(), { [sym]: found.close })
            if (results[sym]) setPe(results[sym].pe)
          })()
        }
      })
      .finally(() => setLoading(false))
  }, [sym])

  if (loading) return (
    <div style={{ padding: 24 }}>
      <div className="skeleton" style={{ height: 64, borderRadius: 12, marginBottom: 12 }} />
      <div className="skeleton" style={{ height: 'calc(100dvh - 200px)', borderRadius: 12 }} />
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

  // compact OHLC / key-stat chip
  const Stat = ({ label, value }: { label: string; value: string }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
      <span style={{ fontSize: 10, color: 'var(--ink4)', fontWeight: 700, whiteSpace: 'nowrap' }}>{label}</span>
      <span style={{ fontSize: 12.5, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap' }}>{value}</span>
    </div>
  )

  const tabBase: React.CSSProperties = {
    padding: '10px 2px', fontSize: 13, fontWeight: 700, textDecoration: 'none',
    borderBottom: '2px solid transparent', whiteSpace: 'nowrap',
  }

  return (
    <div>
      {/* ── Full-bleed terminal section (header + chart fill the viewport) ── */}
      <section style={{ display: 'flex', flexDirection: 'column', height: 'calc(100dvh - 48px)', minHeight: 520 }}>

        {/* ── Symbol header ── */}
        <div style={{ padding: '14px 20px 0', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
            <CoLogo sym={co.sym} logo={co.logo} color={co.color} size={44} />

            {/* name + price block */}
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 19, fontWeight: 800, color: 'var(--ink)' }}>{ar ? co.ar : co.en}</div>
                <button onClick={() => toggleWatchlist(co.sym)} title={inWL ? 'إزالة من المتابعة' : 'إضافة للمتابعة'}
                  style={{ background: 'none', border: 'none', fontSize: 17, lineHeight: 1, color: inWL ? 'var(--gold)' : 'var(--ink4)', cursor: 'pointer' }}>★</button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: 'var(--ink3)' }}>{co.sym}</span>
                <span style={{ fontSize: 11, color: 'var(--ink4)' }}>· {ar ? 'بورصة العراق ISX' : 'Iraq Stock Exchange'}</span>
                <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: 'var(--surf3)', color: 'var(--ink3)' }}>{co.sec}</span>
              </div>

              {/* big price + change */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 30, fontWeight: 800, color: 'var(--ink)', lineHeight: 1 }}>{co.close.toFixed(3)}</span>
                <span style={{ fontSize: 11, color: 'var(--ink4)', fontWeight: 700, marginBottom: 3 }}>IQD</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: up ? 'var(--up)' : 'var(--dn)', marginBottom: 1 }}>
                  {up ? '▲' : '▼'} {co.change >= 0 ? '+' : '−'}{Math.abs(co.change).toFixed(3)} ({co.pct >= 0 ? '+' : '−'}{Math.abs(co.pct).toFixed(2)}%)
                </span>
              </div>
            </div>
          </div>

          {/* OHLC / key-stat strip */}
          <div className="chip-scroll" style={{ display: 'flex', gap: 22, overflowX: 'auto', padding: '12px 0 10px' }}>
            <Stat label={ar ? 'افتتاح' : 'Open'} value={co.open.toFixed(3)} />
            <Stat label={ar ? 'أعلى' : 'High'} value={co.high.toFixed(3)} />
            <Stat label={ar ? 'أدنى' : 'Low'} value={co.low.toFixed(3)} />
            <Stat label={ar ? 'حجم التداول' : 'Volume'} value={fmtVol(co.vol)} />
            <Stat label={ar ? 'القيمة السوقية' : 'Mkt Cap'} value={fmtMcap(co.mcap)} />
            <Stat label={ar ? 'الصفقات' : 'Deals'} value={(co.deals ?? 0).toLocaleString('en')} />
            {pe != null && <Stat label={ar ? 'مكرر الربحية TTM' : 'P/E (TTM)'} value={pe >= 100 ? Math.round(pe) + '×' : pe.toFixed(1) + '×'} />}
          </div>

          {/* tabs */}
          <div className="chip-scroll" style={{ display: 'flex', gap: 22, overflowX: 'auto' }}>
            <span style={{ ...tabBase, color: 'var(--ink)', borderBottomColor: 'var(--brand)' }}>{ar ? 'نظرة عامة' : 'Overview'}</span>
            <Link href={`/c/${co.sym}/financials`} style={{ ...tabBase, color: 'var(--ink3)' }}>{ar ? 'البيانات المالية' : 'Financials'}</Link>
            <a href="#profile" style={{ ...tabBase, color: 'var(--ink3)' }}>{ar ? 'عن الشركة' : 'Profile'}</a>
          </div>
        </div>

        {/* ── Chart fills the rest ── */}
        <div style={{ flex: 1, minHeight: 0 }}>
          <KChart sym={co.sym} fill />
        </div>
      </section>

      {/* ── Below the fold ── */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px' }} id="profile">
        <FinancialHighlights sym={co.sym} />
      </div>
    </div>
  )
}
