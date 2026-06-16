'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { fetchCompanyMeta } from '@/lib/market'
import type { CompanyMeta } from '@/types'

// ── Types ─────────────────────────────────────────────────────────────────────
type Side = 'buy' | 'sell'
interface FRow { date: string; ticker: string; side: Side; trades: number | null; volume: number | null; value: number | null }
interface CompanyFlow {
  ticker: string; ar: string; logo: string; sec: string
  buy: number; sell: number; net: number; trades: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtIQD(v: number): string {
  const a = Math.abs(v), s = v < 0 ? '−' : ''
  if (a >= 1e12) return s + (a / 1e12).toFixed(2) + 'T'
  if (a >= 1e9)  return s + (a / 1e9).toFixed(2) + 'B'
  if (a >= 1e6)  return s + (a / 1e6).toFixed(1) + 'M'
  if (a >= 1e3)  return s + (a / 1e3).toFixed(0) + 'K'
  return s + a.toFixed(0)
}
const arMonth = ['', 'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
function arDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} ${arMonth[m]} ${y}`
}

// ── Logo with fallback (mirrors the site's CoLogo) ─────────────────────────────
function CoLogo({ sym, logo, size = 30 }: { sym: string; logo?: string; size?: number }) {
  const [err, setErr] = useState(false)
  const src = !err ? (logo || `https://isc.gov.iq/Uploads/Companies/${sym}.png`) : null
  if (src) {
    return (
      <Image src={src} alt={sym} width={size} height={size} loading="lazy" sizes={`${size * 2}px`}
        style={{ borderRadius: 6, objectFit: 'contain', background: '#fff', padding: 1, flexShrink: 0 }}
        onError={() => setErr(true)} />
    )
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: 6, flexShrink: 0, background: 'var(--surf3)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 10, fontWeight: 800, color: 'var(--ink3)',
    }}>{sym.slice(0, 3)}</div>
  )
}

// ── Segmented control ──────────────────────────────────────────────────────────
function Seg<T extends string>({ value, onChange, options }: {
  value: T; onChange: (v: T) => void; options: [T, string][]
}) {
  return (
    <div style={{ display: 'inline-flex', background: 'var(--surf2)', borderRadius: 8, padding: 2, gap: 2 }}>
      {options.map(([v, label]) => {
        const on = v === value
        return (
          <button key={v} onClick={() => onChange(v)} style={{
            border: 'none', borderRadius: 6, padding: '5px 11px', fontSize: 11.5, fontWeight: 700,
            cursor: 'pointer', whiteSpace: 'nowrap',
            background: on ? 'var(--brand)' : 'transparent', color: on ? '#fff' : 'var(--ink3)',
          }}>{label}</button>
        )
      })}
    </div>
  )
}

type View = 'net' | 'in' | 'out'

// ── Company flow row — center-anchored net bar ─────────────────────────────────
function FlowRow({ c, i, view, maxNet, maxSide }: {
  c: CompanyFlow; i: number; view: View; maxNet: number; maxSide: number
}) {
  // net view: bar grows right (green, inflow) or left (red, outflow) from center.
  // in/out view: simple value bar.
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
      padding: '8px 6px', borderRadius: 8, textDecoration: 'none',
      transition: 'background .15s',
    }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surf2)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
      <span style={{ fontSize: 11, color: 'var(--ink4)', fontFamily: 'var(--font-mono)', textAlign: 'center' }}>{i + 1}</span>
      <CoLogo sym={c.ticker} logo={c.logo} />
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

// ── 30-session market-wide net trend sparkline ─────────────────────────────────
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

// ── Main ───────────────────────────────────────────────────────────────────────
export default function DailyForeignFlow() {
  const [rows, setRows] = useState<FRow[]>([])
  const [meta, setMeta] = useState<Map<string, CompanyMeta>>(new Map())
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>('net')
  const [expanded, setExpanded] = useState(false)

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

  // per-company aggregate for the latest session
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

  // market-wide net per session (for the trend sparkline)
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
  const inflowShare = totalIn + totalOut ? (totalIn / (totalIn + totalOut)) * 100 : 0

  const sorted = useMemo(() => {
    const arr = [...companies]
    if (view === 'net') arr.sort((a, b) => b.net - a.net)
    else if (view === 'in') arr.sort((a, b) => b.buy - a.buy)
    else arr.sort((a, b) => b.sell - a.sell)
    // in net view, drop companies with zero net (no foreign activity nuance)
    return view === 'net' ? arr.filter(c => c.net !== 0) : arr.filter(c => (view === 'in' ? c.buy : c.sell) > 0)
  }, [companies, view])

  const maxNet = Math.max(...sorted.map(c => Math.abs(c.net)), 1)
  const maxSide = Math.max(...sorted.map(c => (view === 'in' ? c.buy : c.sell)), 1)
  const shown = expanded ? sorted : sorted.slice(0, 8)

  if (loading) {
    return <div className="skeleton" style={{ height: 420, borderRadius: 16, marginBottom: 22 }} />
  }

  return (
    <div style={{
      background: 'linear-gradient(180deg, var(--surf), var(--surf))',
      border: '1px solid var(--line)', borderRadius: 16, padding: '18px 18px 20px', marginBottom: 22,
    }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{
              width: 32, height: 32, borderRadius: 9, fontSize: 16,
              background: 'linear-gradient(135deg,#3CA0F0,#2570C8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>🌍</span>
            <h2 style={{ fontSize: 16.5, fontWeight: 800, color: 'var(--ink)', margin: 0 }}>تدفق المستثمر الأجنبي اليوم</h2>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700,
              color: 'var(--up)', background: 'var(--up-s)', border: '1px solid rgba(22,163,74,0.25)',
              padding: '2px 8px', borderRadius: 20,
            }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--up)' }} />مباشر
            </span>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ink4)', marginTop: 4, marginInlineStart: 41 }}>
            صافي شراء/بيع غير العراقيين لكل شركة · يُحدَّث يومياً مع نشرة التداول
          </div>
        </div>
        {latestDate && (
          <div style={{ fontSize: 11.5, color: 'var(--ink3)', textAlign: 'end' }}>
            جلسة<br /><span style={{ fontWeight: 700, color: 'var(--ink2)' }}>{arDate(latestDate)}</span>
          </div>
        )}
      </div>

      {!companies.length ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ink4)', fontSize: 12.5 }}>
          لا يوجد نشاط للمستثمرين الأجانب في آخر جلسة متاحة.
        </div>
      ) : (
        <>
          {/* summary strip */}
          <div style={{ display: 'flex', gap: 10, margin: '16px 0 6px', flexWrap: 'wrap' }}>
            <Stat label="تدفق داخل (شراء)" value={fmtIQD(totalIn)} col="var(--up)" />
            <Stat label="تدفق خارج (بيع)" value={fmtIQD(totalOut)} col="var(--dn)" />
            <Stat label="الصافي" value={(totalNet >= 0 ? '+' : '') + fmtIQD(totalNet)} col={totalNet >= 0 ? 'var(--up)' : 'var(--dn)'} />
            <Stat label="شركات نشطة" value={String(companies.length)} col="var(--ink2)" />
          </div>

          {/* inflow vs outflow tug-of-war */}
          <div style={{ display: 'flex', height: 8, borderRadius: 5, overflow: 'hidden', margin: '8px 0 4px', background: 'var(--surf2)' }}>
            <div style={{ width: `${inflowShare}%`, background: 'var(--up)' }} />
            <div style={{ width: `${100 - inflowShare}%`, background: 'var(--dn)' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--ink4)', marginBottom: 14 }}>
            <span style={{ color: 'var(--up)' }}>شراء {inflowShare.toFixed(0)}%</span>
            <span style={{ color: 'var(--dn)' }}>بيع {(100 - inflowShare).toFixed(0)}%</span>
          </div>

          {/* trend */}
          {trend.length >= 5 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10.5, color: 'var(--ink4)', marginBottom: 4 }}>صافي التدفق الأجنبي — آخر {trend.length} جلسة</div>
              <NetTrend series={trend} />
            </div>
          )}

          {/* view toggle */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, gap: 8, flexWrap: 'wrap' }}>
            <Seg value={view} onChange={(v) => { setView(v); setExpanded(false) }}
              options={[['net', 'الصافي'], ['in', 'الأكثر شراءً'], ['out', 'الأكثر بيعاً']]} />
            <span style={{ fontSize: 10.5, color: 'var(--ink4)' }}>{sorted.length} شركة</span>
          </div>

          {/* ranked list */}
          <div>
            {shown.map((c, i) => (
              <FlowRow key={c.ticker} c={c} i={i} view={view} maxNet={maxNet} maxSide={maxSide} />
            ))}
          </div>

          {sorted.length > 8 && (
            <button onClick={() => setExpanded(e => !e)} style={{
              width: '100%', marginTop: 10, padding: '9px 0', borderRadius: 9,
              background: 'var(--surf2)', border: '1px solid var(--line)', color: 'var(--ink2)',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}>
              {expanded ? 'عرض أقل' : `عرض كل الشركات (${sorted.length})`}
            </button>
          )}
        </>
      )}
    </div>
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
