'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { fetchCompanyMeta } from '@/lib/market'
import type { CompanyMeta } from '@/types'
import { fmtIQD, arDate, CoLogo, Seg, PreviewCard } from './_ui'

// ── Types ─────────────────────────────────────────────────────────────────────
type Side = 'buy' | 'sell'
interface FRow { date: string; ticker: string; side: Side; trades: number | null; volume: number | null; value: number | null }
interface CompanyFlow {
  ticker: string; ar: string; logo: string; sec: string
  buy: number; sell: number; net: number; trades: number
}
type View = 'net' | 'in' | 'out'

// ── Shared data hook ───────────────────────────────────────────────────────────
function useForeignFlow() {
  const [rows, setRows] = useState<FRow[]>([])
  const [meta, setMeta] = useState<Map<string, CompanyMeta>>(new Map())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const db = createClient()
        const cutoff = new Date(Date.now() - 120 * 86400_000).toISOString().slice(0, 10)
        const [{ data }, metaArr] = await Promise.all([
          db.from('foreign_flow_company_daily')
            .select('date,ticker,side,trades,volume,value')
            .gte('date', cutoff).order('date', { ascending: false }),
          fetchCompanyMeta(),
        ])
        setRows((data as FRow[]) ?? [])
        setMeta(new Map(metaArr.map(m => [m.sym, m])))
      } catch { /* keep empty */ }
      setLoading(false)
    })()
  }, [])

  const latestDate = useMemo(() => rows.reduce((a, r) => (r.date > a ? r.date : a), ''), [rows])

  const companies = useMemo<CompanyFlow[]>(() => {
    const m = new Map<string, CompanyFlow>()
    for (const r of rows) {
      if (r.date !== latestDate) continue
      const md = meta.get(r.ticker)
      const e = m.get(r.ticker) ?? {
        ticker: r.ticker, ar: md?.ar ?? '', logo: md?.logo ?? '', sec: md?.sec ?? '',
        buy: 0, sell: 0, net: 0, trades: 0,
      }
      if (r.side === 'buy') e.buy += r.value ?? 0
      else e.sell += r.value ?? 0
      e.trades += r.trades ?? 0
      e.net = e.buy - e.sell
      m.set(r.ticker, e)
    }
    return Array.from(m.values())
  }, [rows, latestDate, meta])

  const trend = useMemo(() => {
    const byDate = new Map<string, number>()
    for (const r of rows) {
      const v = (r.side === 'buy' ? 1 : -1) * (r.value ?? 0)
      byDate.set(r.date, (byDate.get(r.date) ?? 0) + v)
    }
    return Array.from(byDate.entries()).sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-30).map(([date, net]) => ({ date, net }))
  }, [rows])

  const totalIn = companies.reduce((s, c) => s + c.buy, 0)
  const totalOut = companies.reduce((s, c) => s + c.sell, 0)
  const totalNet = totalIn - totalOut

  return { loading, latestDate, companies, trend, totalIn, totalOut, totalNet }
}

// ── Compact preview card (statistics grid) ─────────────────────────────────────
export function DailyForeignFlowPreview() {
  const { loading, latestDate, companies, totalIn, totalOut, totalNet } = useForeignFlow()
  const inflowShare = totalIn + totalOut ? (totalIn / (totalIn + totalOut)) * 100 : 0
  const topNet = useMemo(() => [...companies].sort((a, b) => Math.abs(b.net) - Math.abs(a.net)).slice(0, 3), [companies])

  return (
    <PreviewCard
      title="تدفق المستثمر الأجنبي اليوم"
      subtitle={latestDate ? `جلسة ${arDate(latestDate)}` : 'آخر جلسة'}
      badge="مباشر" badgeLive href="/statistics/foreign-flow" loading={loading}
    >
      {!companies.length ? (
        <div style={{ fontSize: 12, color: 'var(--ink4)', textAlign: 'center', padding: '20px 0' }}>
          لا نشاط أجنبي في آخر جلسة.
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--ink4)' }}>صافي التدفق</span>
            <span style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-mono)', color: totalNet >= 0 ? 'var(--up)' : 'var(--dn)' }}>
              {totalNet >= 0 ? '+' : ''}{fmtIQD(totalNet)}
            </span>
          </div>
          <div style={{ display: 'flex', height: 7, borderRadius: 4, overflow: 'hidden', marginBottom: 4, background: 'var(--surf2)' }}>
            <div style={{ width: `${inflowShare}%`, background: 'var(--up)' }} />
            <div style={{ width: `${100 - inflowShare}%`, background: 'var(--dn)' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, color: 'var(--ink4)', marginBottom: 12 }}>
            <span style={{ color: 'var(--up)' }}>شراء {fmtIQD(totalIn)}</span>
            <span style={{ color: 'var(--dn)' }}>بيع {fmtIQD(totalOut)}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {topNet.map(c => (
              <div key={c.ticker} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CoLogo sym={c.ticker} logo={c.logo} size={22} />
                <span style={{ flex: 1, fontSize: 11.5, color: 'var(--ink2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.ar || c.ticker}</span>
                <span style={{ fontSize: 11.5, fontWeight: 700, fontFamily: 'var(--font-mono)', color: c.net >= 0 ? 'var(--up)' : 'var(--dn)' }}>
                  {c.net >= 0 ? '+' : ''}{fmtIQD(c.net)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </PreviewCard>
  )
}

// ── Full detail (dedicated page) ───────────────────────────────────────────────
export function DailyForeignFlowFull() {
  const { loading, latestDate, companies, trend, totalIn, totalOut, totalNet } = useForeignFlow()
  const [view, setView] = useState<View>('net')

  const inflowShare = totalIn + totalOut ? (totalIn / (totalIn + totalOut)) * 100 : 0

  const sorted = useMemo(() => {
    const arr = [...companies]
    if (view === 'net') arr.sort((a, b) => b.net - a.net)
    else if (view === 'in') arr.sort((a, b) => b.buy - a.buy)
    else arr.sort((a, b) => b.sell - a.sell)
    return view === 'net' ? arr.filter(c => c.net !== 0) : arr.filter(c => (view === 'in' ? c.buy : c.sell) > 0)
  }, [companies, view])

  const maxNet = Math.max(...sorted.map(c => Math.abs(c.net)), 1)
  const maxSide = Math.max(...sorted.map(c => (view === 'in' ? c.buy : c.sell)), 1)

  if (loading) return <div className="skeleton" style={{ height: 420, borderRadius: 16 }} />
  if (!companies.length) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--ink4)', fontSize: 13 }}>
        لا يوجد نشاط للمستثمرين الأجانب في آخر جلسة متاحة.
      </div>
    )
  }

  return (
    <div>
      {/* summary strip */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        <Stat label="تدفق داخل (شراء)" value={fmtIQD(totalIn)} col="var(--up)" />
        <Stat label="تدفق خارج (بيع)" value={fmtIQD(totalOut)} col="var(--dn)" />
        <Stat label="الصافي" value={(totalNet >= 0 ? '+' : '') + fmtIQD(totalNet)} col={totalNet >= 0 ? 'var(--up)' : 'var(--dn)'} />
        <Stat label="شركات نشطة" value={String(companies.length)} col="var(--ink2)" />
      </div>

      <div style={{ display: 'flex', height: 8, borderRadius: 5, overflow: 'hidden', margin: '8px 0 4px', background: 'var(--surf2)' }}>
        <div style={{ width: `${inflowShare}%`, background: 'var(--up)' }} />
        <div style={{ width: `${100 - inflowShare}%`, background: 'var(--dn)' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--ink4)', marginBottom: 16 }}>
        <span style={{ color: 'var(--up)' }}>شراء {inflowShare.toFixed(0)}%</span>
        <span style={{ color: 'var(--dn)' }}>بيع {(100 - inflowShare).toFixed(0)}%</span>
      </div>

      {trend.length >= 5 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10.5, color: 'var(--ink4)', marginBottom: 4 }}>صافي التدفق الأجنبي — آخر {trend.length} جلسة</div>
          <NetTrend series={trend} />
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8, flexWrap: 'wrap' }}>
        <Seg value={view} onChange={setView} options={[['net', 'الصافي'], ['in', 'الأكثر شراءً'], ['out', 'الأكثر بيعاً']]} />
        <span style={{ fontSize: 10.5, color: 'var(--ink4)' }}>{sorted.length} شركة</span>
      </div>

      <div>
        {sorted.map((c, i) => <FlowRow key={c.ticker} c={c} i={i} view={view} maxNet={maxNet} maxSide={maxSide} />)}
      </div>
    </div>
  )
}

// ── Bits ────────────────────────────────────────────────────────────────────────
function FlowRow({ c, i, view, maxNet, maxSide }: {
  c: CompanyFlow; i: number; view: View; maxNet: number; maxSide: number
}) {
  let bar: React.ReactNode
  if (view === 'net') {
    const pct = Math.min((Math.abs(c.net) / maxNet) * 100, 100)
    const up = c.net >= 0
    bar = (
      <div style={{ position: 'relative', height: 18, display: 'flex' }}>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
          {!up && <div style={{ width: `${pct}%`, height: '100%', background: 'var(--dn)', borderRadius: '4px 0 0 4px', opacity: 0.9 }} />}
        </div>
        <div style={{ width: 1, background: 'var(--line2)' }} />
        <div style={{ flex: 1 }}>
          {up && <div style={{ width: `${pct}%`, height: '100%', background: 'var(--up)', borderRadius: '0 4px 4px 0', opacity: 0.9 }} />}
        </div>
      </div>
    )
  } else {
    const val = view === 'in' ? c.buy : c.sell
    const col = view === 'in' ? 'var(--up)' : 'var(--dn)'
    const pct = maxSide ? Math.min((val / maxSide) * 100, 100) : 0
    bar = (
      <div style={{ height: 18, background: 'var(--surf2)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: col, borderRadius: 4, opacity: 0.9 }} />
      </div>
    )
  }

  const right = view === 'net' ? c.net : view === 'in' ? c.buy : c.sell
  const rightCol = view === 'net' ? (c.net >= 0 ? 'var(--up)' : 'var(--dn)') : view === 'in' ? 'var(--up)' : 'var(--dn)'

  return (
    <Link href={`/c/${c.ticker}`} style={{
      display: 'grid', gridTemplateColumns: '20px 30px 1fr 1.4fr auto', gap: 10, alignItems: 'center',
      padding: '8px 6px', borderRadius: 8, textDecoration: 'none', transition: 'background .15s',
    }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surf2)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
      <span style={{ fontSize: 11, color: 'var(--ink4)', fontFamily: 'var(--font-mono)', textAlign: 'center' }}>{i + 1}</span>
      <CoLogo sym={c.ticker} logo={c.logo} size={30} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12.5, color: 'var(--ink)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.ar || c.ticker}</div>
        <div style={{ fontSize: 10, color: 'var(--ink4)', fontFamily: 'var(--font-mono)' }}>{c.ticker} · {c.trades} صفقة</div>
      </div>
      {bar}
      <div style={{ textAlign: 'end', minWidth: 78 }}>
        <div style={{ fontSize: 13, fontWeight: 800, fontFamily: 'var(--font-mono)', color: rightCol }}>
          {view === 'net' && c.net >= 0 ? '+' : ''}{fmtIQD(right)}
        </div>
        {view === 'net' && (
          <div style={{ fontSize: 9.5, color: 'var(--ink4)', fontFamily: 'var(--font-mono)' }}>
            <span style={{ color: 'var(--up)' }}>{fmtIQD(c.buy)}</span> / <span style={{ color: 'var(--dn)' }}>{fmtIQD(c.sell)}</span>
          </div>
        )}
      </div>
    </Link>
  )
}

function NetTrend({ series }: { series: { date: string; net: number }[] }) {
  if (series.length < 2) return null
  const W = 300, H = 48, n = series.length
  const max = Math.max(...series.map(s => Math.abs(s.net)), 1)
  const x = (i: number) => (i / (n - 1)) * W
  const y = (v: number) => H / 2 - (v / max) * (H / 2 - 3)
  const line = series.map((s, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(s.net).toFixed(1)}`).join(' ')
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke="var(--line2)" strokeWidth="1" />
      {series.map((s, i) => {
        const yy = y(s.net), zero = H / 2
        return <line key={i} x1={x(i)} y1={zero} x2={x(i)} y2={yy}
          stroke={s.net >= 0 ? 'var(--up)' : 'var(--dn)'} strokeWidth={Math.max(W / n - 1.5, 1)} opacity={0.55} />
      })}
      <path d={line} fill="none" stroke="var(--ink3)" strokeWidth="1.2" opacity={0.7} />
    </svg>
  )
}

function Stat({ label, value, col }: { label: string; value: string; col: string }) {
  return (
    <div style={{ flex: '1 1 110px', background: 'var(--surf2)', borderRadius: 11, padding: '10px 12px' }}>
      <div style={{ fontSize: 10.5, color: 'var(--ink4)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 800, fontFamily: 'var(--font-mono)', color: col }}>{value}</div>
    </div>
  )
}
