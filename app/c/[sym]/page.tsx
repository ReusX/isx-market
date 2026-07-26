'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useApp } from '@/context/AppContext'
import { fetchLive, fetchCompanyMeta, mergeCompanies, fmtVol, fmtMcap } from '@/lib/market'
import type { Company } from '@/types'
import { CompanyLogo } from '@/components/CompanyLogo'
import { DirectionalChange } from '@/components/design/ui'
import { Range52Indicator } from '@/components/design/Range52Indicator'
import PerformanceOverview from '@/components/company/PerformanceOverview'
import EarningsTrends from '@/components/company/EarningsTrends'
import CompanyStatistics from '@/components/company/CompanyStatistics'

// Chart pulls in the heavy klinecharts lib. Code-split it and only mount when
// it nears the viewport, so it stays off the company page's critical path.
const ChartPlaceholder = () => (
  <div style={{ height: 360, borderRadius: 16, border: '1px solid var(--line)', background: 'var(--surf)' }} />
)
const KChart = dynamic(() => import('@/components/KChart'), { ssr: false, loading: ChartPlaceholder })

function LazyKChart(props: { sym: string; name?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [show, setShow] = useState(false)
  useEffect(() => {
    if (show || !ref.current) return
    const io = new IntersectionObserver(
      es => { if (es.some(e => e.isIntersecting)) { setShow(true); io.disconnect() } },
      { rootMargin: '400px' },
    )
    io.observe(ref.current)
    return () => io.disconnect()
  }, [show])
  return <div ref={ref}>{show ? <KChart {...props} /> : <ChartPlaceholder />}</div>
}

// ─── Logo ────────────────────────────────────────────────────────────────────
function CoLogo({ sym, logo, color }: { sym: string; logo?: string; color?: string }) {
  return <CompanyLogo className="company-logo-placeholder" sym={sym} logo={logo} color={color} />
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CompanyPage() {
  const { sym }      = useParams<{ sym: string }>()
  const { lang, watchlist, toggleWatchlist } = useApp()
  const ar = lang === 'ar'

  const [co, setCo]           = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [pe, setPe]           = useState<number | null>(null)
  const [range52, setRange52] = useState<{ low: number; high: number } | null>(null)

  // 52-week range lives on company_metrics, not on the daily quote.
  useEffect(() => {
    ;(async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const { data } = await createClient()
          .from('company_metrics').select('low_52w,high_52w').eq('ticker', sym).maybeSingle()
        const low = data?.low_52w as number | null, high = data?.high_52w as number | null
        if (low != null && high != null && high > low) setRange52({ low, high })
      } catch { /* the range block simply does not render */ }
    })()
  }, [sym])

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
    <main className="terminal-shell app-page company-page">
      <div className="skeleton" style={{ height: 220, borderRadius: 16 }} />
    </main>
  )
  if (!co) return (
    <main className="terminal-shell app-page company-page">
      <div className="empty-state">
        <strong>{ar ? 'الشركة غير موجودة' : 'Company not found'}</strong>
        <span><Link href="/market">{ar ? 'العودة إلى السوق ←' : 'Back to the market →'}</Link></span>
      </div>
    </main>
  )

  const up   = co.pct >= 0
  const inWL = watchlist.includes(co.sym)
  const stat = (label: string, value: string) => (
    <article className="metric-card company-stat-tile" key={label}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  )

  return (
    <main className="terminal-shell app-page company-page">
      <Link className="statistics-breadcrumb" href="/market">
        <span aria-hidden="true">›</span>
        {ar ? 'الشركات المدرجة' : 'Listed companies'}
      </Link>

      <section className="app-card company-card company-header">
        <div className="company-heading-identity">
          <CoLogo sym={co.sym} logo={co.logo} color={co.color} />
          <div>
            <span><bdi>{co.sym}</bdi> · {co.sec}</span>
            <h1>
              {ar ? co.ar : co.en}
              <button
                type="button"
                className={inWL ? 'watch-star is-on' : 'watch-star'}
                aria-pressed={inWL}
                aria-label={ar ? 'إضافة إلى المتابعة' : 'Add to watchlist'}
                onClick={() => toggleWatchlist(co.sym)}
              >
                ★
              </button>
            </h1>
          </div>
        </div>
        <div className="company-price">
          <strong><bdi>{co.close.toFixed(3)}</bdi></strong>
          <DirectionalChange value={co.pct} />
        </div>
      </section>

      <div className="company-stat-grid">
        {stat(ar ? 'فتح' : 'Open', co.open.toFixed(3))}
        {stat(ar ? 'أعلى' : 'High', co.high.toFixed(3))}
        {stat(ar ? 'أدنى' : 'Low', co.low.toFixed(3))}
        {stat(ar ? 'الحجم' : 'Volume', fmtVol(co.shares_traded))}
        {stat(ar ? 'قيمة التداول' : 'Turnover', fmtVol(co.vol) + ' IQD')}
        {stat(ar ? 'القيمة السوقية' : 'Mkt cap', fmtMcap(co.mcap))}
        {stat(ar ? 'الصفقات' : 'Deals', (co.deals ?? 0).toLocaleString('en'))}
        {pe != null ? stat(
          ar ? 'مكرر الربحية TTM' : 'P/E (TTM)',
          pe >= 100 ? Math.round(pe) + '×' : pe.toFixed(1) + '×',
        ) : null}
      </div>

      {range52 ? (
        <section className="app-card company-card company-range-card">
          <div className="company-range-heading">
            <span>{ar ? <>نطاق <bdi>52</bdi> أسبوعاً</> : <>Range · <bdi>52</bdi>w</>}</span>
            <bdi>{co.close.toFixed(2)} IQD</bdi>
          </div>
          <Range52Indicator price={co.close} low={range52.low} high={range52.high} showValues />
        </section>
      ) : null}

      <nav className="company-tabs" aria-label={ar ? 'أقسام الشركة' : 'Company sections'}>
        <span className="is-active">{ar ? 'نظرة عامة' : 'Overview'}</span>
        <Link href={`/c/${co.sym}/financials`}>{ar ? 'البيانات المالية' : 'Financials'}</Link>
      </nav>

      {/* ── Chart card ── */}
      <LazyKChart sym={co.sym} name={ar ? co.ar : co.en} />

      {/* ── Performance overview (trailing returns vs ISX60) ── */}
      <PerformanceOverview sym={co.sym} />

      {/* ── Earnings trends (renders only if financials extracted) ── */}
      <EarningsTrends sym={co.sym} />

      {/* ── Statistics: valuation + financial highlights + paywall ── */}
      <CompanyStatistics sym={co.sym} price={co.close} shares={co.shares} mcapFallback={co.mcap} />
    </main>
  )
}
