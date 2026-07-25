'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { fetchCompanyMeta } from '@/lib/market'
import { ForeignFlowGaugeVisual } from '@/components/design/ForeignFlowGauge'
import { MonthlyFlowCard, SectorRotationCard } from './StatCards'
import { OwnershipDonut } from '@/components/design/OwnershipDonut'
import type { CompanyMeta } from '@/types'

// ── Types ─────────────────────────────────────────────────────────────────────
type DailyRow = { date: string; ticker: string; side: 'buy' | 'sell'; value: number | null }
type FlowRow = { year: number; month: number; side: 'buy' | 'sell'; value: number | null }
type SectorRow = { year: number; month: number; sector: string; side: string; value: number | null }
type OwnRow = { iraqi_shares: number | null; foreign_shares: number | null; foreign_count: number | null }
type ShareRow = { company_name_ar: string; name_ar: string; curr_pct: number | null }

const arMonth = ['', 'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
const nf = new Intl.NumberFormat('en-US')

function fmtIQD(v: number): string {
  const a = Math.abs(v), s = v < 0 ? '−' : ''
  if (a >= 1e12) return s + (a / 1e12).toFixed(2) + 'T'
  if (a >= 1e9) return s + (a / 1e9).toFixed(2) + 'B'
  if (a >= 1e6) return s + (a / 1e6).toFixed(1) + 'M'
  if (a >= 1e3) return s + (a / 1e3).toFixed(0) + 'K'
  return s + a.toFixed(0)
}

function arDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} ${arMonth[m]} ${y}`
}

export default function StatisticsPage() {
  const [daily, setDaily] = useState<DailyRow[]>([])
  const [meta, setMeta] = useState<Map<string, CompanyMeta>>(new Map())
  const [flow, setFlow] = useState<FlowRow[]>([])
  const [sectorRows, setSectorRows] = useState<SectorRow[]>([])
  const [own, setOwn] = useState<OwnRow[]>([])
  const [ownMonth, setOwnMonth] = useState('')
  const [holders, setHolders] = useState<ShareRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const db = createClient()

        // foreign_flow_daily runs past PostgREST's 1000-row cap (~1.4k rows),
        // which silently dropped the most recent months · page through it.
        const fetchAllFlow = async (): Promise<FlowRow[]> => {
          const out: FlowRow[] = []
          for (let from = 0; ; from += 1000) {
            const { data } = await db
              .from('foreign_flow_daily').select('year,month,side,value')
              .order('year').order('month').range(from, from + 999)
            if (!data?.length) break
            out.push(...(data as FlowRow[]))
            if (data.length < 1000) break
          }
          return out
        }

        const cutoff = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10)
        const [dailyRes, flowRes, sectorRes, ownLatest, holdersRes, metaArr] = await Promise.all([
          db.from('foreign_flow_company_daily').select('date,ticker,side,value')
            .gte('date', cutoff).order('date', { ascending: false }),
          fetchAllFlow(),
          db.from('foreign_flow_sector').select('year,month,sector,side,value'),
          db.from('ownership_monthly').select('year,month')
            .order('year', { ascending: false }).order('month', { ascending: false }).limit(1),
          db.from('major_shareholders').select('company_name_ar,name_ar,curr_pct')
            .order('year', { ascending: false }).order('month', { ascending: false }).limit(1000),
          fetchCompanyMeta().catch(() => [] as CompanyMeta[]),
        ])

        setDaily((dailyRes.data as DailyRow[]) ?? [])
        setFlow(flowRes)
        setSectorRows((sectorRes.data as SectorRow[]) ?? [])
        setHolders((holdersRes.data as ShareRow[]) ?? [])
        setMeta(new Map(metaArr.map(m => [m.sym, m])))

        const oy = ownLatest.data?.[0]?.year, om = ownLatest.data?.[0]?.month
        if (oy && om) {
          setOwnMonth(`${arMonth[om]} ${oy}`)
          const { data } = await db.from('ownership_monthly')
            .select('iraqi_shares,foreign_shares,foreign_count').eq('year', oy).eq('month', om)
          setOwn((data as OwnRow[]) ?? [])
        }
      } catch { /* panels degrade to their empty states */ }
      setLoading(false)
    })()
  }, [])

  // ── Hero · today's session ────────────────────────────────────────────────
  const today = useMemo(() => {
    if (!daily.length) return null
    const latest = daily.reduce((a, r) => (r.date > a ? r.date : a), '')
    const rows = daily.filter(r => r.date === latest)
    const buy = rows.filter(r => r.side === 'buy').reduce((s, r) => s + (r.value ?? 0), 0)
    const sell = rows.filter(r => r.side === 'sell').reduce((s, r) => s + (r.value ?? 0), 0)

    const byTicker = new Map<string, number>()
    for (const r of rows) {
      const sign = r.side === 'buy' ? 1 : -1
      byTicker.set(r.ticker, (byTicker.get(r.ticker) ?? 0) + sign * (r.value ?? 0))
    }
    const topBuys = Array.from(byTicker.entries())
      .filter(([, net]) => net > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([ticker, net]) => ({ ticker, net, name: meta.get(ticker)?.ar || ticker }))

    return { date: latest, buy, sell, net: buy - sell, topBuys }
  }, [daily, meta])

  // ── Ownership ─────────────────────────────────────────────────────────────
  const ownership = useMemo(() => {
    const iraqi = own.reduce((s, r) => s + (r.iraqi_shares ?? 0), 0)
    const foreign = own.reduce((s, r) => s + (r.foreign_shares ?? 0), 0)
    const total = iraqi + foreign
    return {
      foreignPct: total ? (foreign / total) * 100 : 0,
      withForeign: own.filter(r => (r.foreign_shares ?? 0) > 0).length,
      foreignHolders: own.reduce((s, r) => s + (r.foreign_count ?? 0), 0),
    }
  }, [own])

  // ── Top shareholders · newest record per company+holder ───────────────────
  const topHolders = useMemo(() => {
    const seen = new Set<string>()
    const out: ShareRow[] = []
    for (const r of holders) {
      if (r.curr_pct == null || !r.name_ar) continue
      const k = `${r.company_name_ar}|${r.name_ar}`
      if (seen.has(k)) continue
      seen.add(k)
      out.push(r)
    }
    return {
      total: out.length,
      rows: [...out].sort((a, b) => (b.curr_pct ?? 0) - (a.curr_pct ?? 0)).slice(0, 3),
    }
  }, [holders])

  return (
    <main className="terminal-shell app-page statistics-page">
      <header className="statistics-heading">
        <h1>الإحصائيات</h1>
        <p>أين يتحرك المال الأجنبي، اليوم وعلى مدى الوقت</p>
      </header>

      {/* ── Hero: today's foreign flow ──────────────────────────────────── */}
      <section className="app-card statistics-card statistics-hero">
        <div className="statistics-card-heading">
          <div>
            <span className="app-badge success"><span className="app-badge-dot" aria-hidden="true" />مباشر</span>
            <h2>تدفق المستثمر الأجنبي اليوم</h2>
            <p>{today ? `جلسة ${arDate(today.date)}` : 'لم تُنشر جلسة بعد'}</p>
          </div>
        </div>

        <div className="statistics-hero-grid">
          <div className="statistics-gauge">
            <ForeignFlowGaugeVisual
              foreignBuy={today?.buy ?? 0}
              foreignSell={today?.sell ?? 0}
              netFlow={today?.net ?? 0}
              isLoading={loading && !today}
              readoutLabel="صافي التدفق"
              scale="large"
            />
          </div>

          <div className="biggest-buys">
            <span className="statistics-label">أكبر المشتريات اليوم</span>
            {today?.topBuys.length ? (
              today.topBuys.map((item, index) => (
                <Link href={`/c/${item.ticker}`} key={item.ticker}>
                  <span>
                    <bdi>{item.ticker}</bdi>
                    <strong>{item.name}</strong>
                  </span>
                  <bdi className="statistics-positive">+{fmtIQD(item.net)} IQD</bdi>
                  <em>{index + 1}</em>
                </Link>
              ))
            ) : (
              <p className="statistics-empty">
                {loading ? 'جاري التحميل…' : 'لا توجد مشتريات أجنبية في الجلسة الأخيرة.'}
              </p>
            )}
            <Link className="statistics-text-link" href="/statistics/foreign-flow">عرض الكل ←</Link>
          </div>
        </div>
      </section>

      {/* ── Monthly flow + sector rotation ──────────────────────────────── */}
      <div className="statistics-secondary">
        <MonthlyFlowCard rows={flow} />
        <SectorRotationCard rows={sectorRows} />
      </div>

      {/* ── Market ownership ────────────────────────────────────────────── */}
      <section className="app-card statistics-card ownership-card">
        <span className="app-badge">شهري</span>
        <h2>ملكية السوق</h2>
        <p>من يملك السوق العراقي{ownMonth ? ` · ${ownMonth}` : ''}</p>

        <div className="ownership-grid">
          <div className="ownership-structure">
            <OwnershipDonut foreignPct={ownership.foreignPct} />
            <div className="ownership-stats">
              <div><bdi>{nf.format(ownership.withForeign)}</bdi><span>شركة بملكية أجنبية</span></div>
              <div><bdi>{nf.format(ownership.foreignHolders)}</bdi><span>حملة أجانب</span></div>
            </div>
            <Link className="statistics-text-link" href="/statistics/ownership">عرض هيكل الملكية ←</Link>
          </div>

          <div className="shareholders-list">
            <span className="statistics-label">
              أكبر المساهمين · <bdi>{nf.format(topHolders.total)}</bdi> مساهم كبير
            </span>
            {topHolders.rows.map(holder => (
              <div key={`${holder.company_name_ar}-${holder.name_ar}`}>
                <span>{holder.name_ar}</span>
                <bdi>{(holder.curr_pct ?? 0).toFixed(1)}%</bdi>
              </div>
            ))}
            <Link className="statistics-text-link" href="/statistics/shareholders">عرض كبار المساهمين ←</Link>
          </div>
        </div>
      </section>
    </main>
  )
}
