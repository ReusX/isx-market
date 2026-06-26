'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '@/context/AppContext'

type Fact = { fiscal_year: number; period: string; line_key: string; value_iqd: number | null }
type Period = { y: number; p: string; rev: number | null; ni: number | null }

const QS = ['Q1', 'Q2', 'Q3', 'Q4']
const QLABEL: Record<string, string> = { Q1: 'الربع الأول', Q2: 'الربع الثاني', Q3: 'الربع الثالث', Q4: 'الربع الرابع' }
const periodRank = (y: number, p: string) => y * 100 + (p === 'ANNUAL' ? 12 : ({ Q1: 3, Q2: 6, Q3: 9, Q4: 12 } as Record<string, number>)[p] ?? 12)

function fmtIQD(v: number | null, ar: boolean): string {
  if (v == null) return '·'
  const neg = v < 0, a = Math.abs(v)
  const u = (n: number, w: string) => `${neg ? '−' : ''}${(a / n).toLocaleString('en', { maximumFractionDigits: 2 })} ${w}`
  if (a >= 1e12) return u(1e12, ar ? 'ت' : 'T')
  if (a >= 1e9)  return u(1e9, ar ? 'مليار' : 'B')
  if (a >= 1e6)  return u(1e6, ar ? 'مليون' : 'M')
  return `${neg ? '−' : ''}${a.toLocaleString('en')}`
}
const shortLabel = (y: number, p: string, ar: boolean) =>
  p === 'ANNUAL' ? (ar ? `${y}` : `FY${String(y).slice(2)}`)
                 : `${p} ${ar ? '' : "'"}${String(y).slice(2)}`

export default function EarningsTrends({ sym }: { sym: string }) {
  const { lang } = useApp()
  const ar = lang === 'ar'
  const [facts, setFacts] = useState<Fact[]>([])
  const [loaded, setLoaded] = useState(false)
  const [mode, setMode] = useState<'annual' | 'quarterly'>('quarterly')

  useEffect(() => {
    createClient()
      .from('financial_facts_public')
      .select('fiscal_year,period,line_key,value_iqd')
      .eq('ticker', sym).eq('statement', 'income')
      .in('line_key', ['revenue', 'net_income', 'financing_income', 'revenue_and_commissions'])
      .then(({ data }) => { setFacts((data as Fact[]) || []); setLoaded(true) })
  }, [sym])

  const val = (y: number, p: string, k: string) =>
    facts.find(f => f.fiscal_year === y && f.period === p && f.line_key === k)?.value_iqd ?? null
  // Q1-Q3 are filed cumulatively but stored standalone; Q4 is derived = annual − (Q1+Q2+Q3)
  const sq = (y: number, p: string, k: string): number | null => {
    if (p !== 'Q4') return val(y, p, k)
    const a = val(y, 'ANNUAL', k), q1 = val(y, 'Q1', k), q2 = val(y, 'Q2', k), q3 = val(y, 'Q3', k)
    return [a, q1, q2, q3].every(v => v != null) ? a! - q1! - q2! - q3! : null
  }
  // Banks don't report a single "revenue" line · their top line is net interest/
  // financing income + net commission income. Fall back to that composite.
  const effRev = (y: number, p: string): number | null => {
    const r = sq(y, p, 'revenue')
    if (r != null) return r
    const fi = sq(y, p, 'financing_income'), rc = sq(y, p, 'revenue_and_commissions')
    return fi != null || rc != null ? (fi ?? 0) + (rc ?? 0) : null
  }

  const annual = useMemo<Period[]>(() => {
    const yrs = Array.from(new Set(facts.filter(f => f.period === 'ANNUAL').map(f => f.fiscal_year))).sort((a, b) => a - b)
    return yrs.map(y => ({ y, p: 'ANNUAL', rev: effRev(y, 'ANNUAL'), ni: val(y, 'ANNUAL', 'net_income') }))
      .filter(r => r.rev != null || r.ni != null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facts])

  const quarterly = useMemo<Period[]>(() => {
    const yrs = Array.from(new Set(facts.map(f => f.fiscal_year)))
    const out: Period[] = []
    yrs.forEach(y => QS.forEach(p => {
      const rev = effRev(y, p), ni = sq(y, p, 'net_income')
      if (rev != null || ni != null) out.push({ y, p, rev, ni })
    }))
    return out.sort((a, b) => periodRank(a.y, a.p) - periodRank(b.y, b.p)).slice(-6)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facts])

  if (!loaded || (!annual.length && !quarterly.length)) return null

  const series = mode === 'annual' ? annual : quarterly
  const hasQuarterly = quarterly.length > 0
  const latest = series[series.length - 1]
  // Banks have no single "revenue" line · we use net interest + commission income
  // as the top line ("operating income"), and we suppress net-margin because the
  // proxy understates total bank income (would otherwise show >100% margins).
  const hasRevenue = facts.some(f => f.line_key === 'revenue')

  return (
    <section dir={ar ? 'rtl' : 'ltr'} style={{ marginTop: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: 'var(--ink)' }}>{ar ? 'اتجاهات الأرباح' : 'Earnings Trends'}</h2>
        <Link href={`/c/${sym}/financials`} style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand)', textDecoration: 'none' }}>
          {ar ? 'عرض المزيد ←' : 'View More →'}
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        <NetProfitCard series={series} mode={mode} setMode={setMode} hasQuarterly={hasQuarterly} latest={latest} ar={ar} hasRevenue={hasRevenue} />
        <RevenueEarningsCard series={series} mode={mode} setMode={setMode} hasQuarterly={hasQuarterly} latest={latest} ar={ar} hasRevenue={hasRevenue} />
      </div>
    </section>
  )
}

// ── Shared bits ─────────────────────────────────────────────────────────────────
function Toggle({ mode, setMode, hasQuarterly, ar }: { mode: 'annual' | 'quarterly'; setMode: (m: 'annual' | 'quarterly') => void; hasQuarterly: boolean; ar: boolean }) {
  return (
    <div style={{ display: 'inline-flex', background: 'var(--surf3, var(--bg))', borderRadius: 999, padding: 2 }}>
      {([['annual', ar ? 'سنوي' : 'Annual'], ['quarterly', ar ? 'ربعي' : 'Quarterly']] as const).map(([m, lbl]) => {
        const on = mode === m, disabled = m === 'quarterly' && !hasQuarterly
        return (
          <button key={m} disabled={disabled} onClick={() => setMode(m)}
            style={{ padding: '4px 12px', borderRadius: 999, border: 'none', cursor: disabled ? 'default' : 'pointer',
              fontSize: 12, fontWeight: 700, opacity: disabled ? 0.4 : 1,
              background: on ? 'var(--brand)' : 'transparent', color: on ? '#fff' : 'var(--ink3)' }}>
            {lbl}
          </button>
        )
      })}
    </div>
  )
}
const CardShell = ({ title, children, head }: { title: string; children: React.ReactNode; head: React.ReactNode }) => (
  <div style={{ background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 16, padding: '18px 20px' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
      <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)' }}>{title}</span>
      {head}
    </div>
    {children}
  </div>
)

// ── Net Profit (+ Margin for non-banks) ──────────────────────────────────────────
function NetProfitCard({ series, mode, setMode, hasQuarterly, latest, ar, hasRevenue }: any) {
  const margin = (p: Period) => (hasRevenue && p.rev && p.ni != null ? p.ni / p.rev : null)
  const maxNi = Math.max(1, ...series.map((p: Period) => Math.abs(p.ni ?? 0)))
  const lm = latest ? margin(latest) : null
  return (
    <CardShell title={hasRevenue ? (ar ? 'صافي الربح والهامش' : 'Net Profit & Margin') : (ar ? 'صافي الربح' : 'Net Profit')}
      head={<Toggle mode={mode} setMode={setMode} hasQuarterly={hasQuarterly} ar={ar} />}>
      <div style={{ fontSize: 12, color: 'var(--ink4)', marginBottom: 14 }}>
        {latest && <>
          <span style={{ fontWeight: 700, color: 'var(--ink3)' }}>{shortLabel(latest.y, latest.p, ar)}</span>
          {'  '}<span style={{ color: 'var(--ink4)' }}>{ar ? 'صافي الربح' : 'Net Profit'} </span>
          <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{fmtIQD(latest.ni, ar)}</span>
          {lm != null && <>{'  ·  '}<span style={{ color: 'var(--ink4)' }}>{ar ? 'الهامش' : 'Margin'} </span>
            <span style={{ fontWeight: 700, color: lm >= 0 ? 'var(--up)' : 'var(--dn)' }}>{(lm * 100).toFixed(1)}%</span></>}
        </>}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 150 }}>
        {series.map((p: Period) => {
          const m = margin(p)
          const h = Math.abs(p.ni ?? 0) / maxNi * 100
          const up = (p.ni ?? 0) >= 0
          return (
            <div key={`${p.y}-${p.p}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
              {hasRevenue && (
                <span style={{ fontSize: 10, fontWeight: 700, color: m != null ? (m >= 0 ? 'var(--up)' : 'var(--dn)') : 'var(--ink4)' }}>
                  {m != null ? `${(m * 100).toFixed(0)}%` : '·'}
                </span>
              )}
              <div style={{ width: '70%', maxWidth: 38, height: `${h}%`, minHeight: 3, borderRadius: '4px 4px 0 0',
                background: up ? 'var(--up)' : 'var(--dn)' }} />
              <span style={{ fontSize: 10, color: 'var(--ink4)', fontWeight: 600 }}>{shortLabel(p.y, p.p, ar)}</span>
            </div>
          )
        })}
      </div>
      <div style={{ marginTop: 12, display: 'flex', gap: 14, fontSize: 10.5, color: 'var(--ink4)' }}>
        <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: 'var(--up)', marginInlineEnd: 4 }} />{ar ? 'صافي الربح' : 'Net Profit'}</span>
        {hasRevenue && <span>% {ar ? 'هامش صافي الربح' : 'Net Margin'}</span>}
      </div>
    </CardShell>
  )
}

// ── Revenue (or Operating Income for banks) vs Earnings ──────────────────────────
function RevenueEarningsCard({ series, mode, setMode, hasQuarterly, latest, ar, hasRevenue }: any) {
  const maxV = Math.max(1, ...series.flatMap((p: Period) => [Math.abs(p.rev ?? 0), Math.abs(p.ni ?? 0)]))
  const revLabel = hasRevenue ? (ar ? 'الإيرادات' : 'Revenue') : (ar ? 'الدخل التشغيلي' : 'Operating Income')
  return (
    <CardShell title={hasRevenue ? (ar ? 'الإيرادات مقابل الأرباح' : 'Revenue vs. Earnings') : (ar ? 'الدخل التشغيلي مقابل الأرباح' : 'Operating Income vs. Earnings')}
      head={<Toggle mode={mode} setMode={setMode} hasQuarterly={hasQuarterly} ar={ar} />}>
      <div style={{ fontSize: 12, color: 'var(--ink4)', marginBottom: 14 }}>
        {latest && <>
          <span style={{ fontWeight: 700, color: 'var(--ink3)' }}>{shortLabel(latest.y, latest.p, ar)}</span>
          {'  '}<span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: 'var(--brand)', margin: '0 4px' }} />
          <span style={{ color: 'var(--ink4)' }}>{revLabel} </span><span style={{ fontWeight: 700, color: 'var(--ink)' }}>{fmtIQD(latest.rev, ar)}</span>
          {'  '}<span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: 'var(--gold, #f59e0b)', margin: '0 4px' }} />
          <span style={{ color: 'var(--ink4)' }}>{ar ? 'الأرباح' : 'Earnings'} </span><span style={{ fontWeight: 700, color: 'var(--ink)' }}>{fmtIQD(latest.ni, ar)}</span>
        </>}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 150 }}>
        {series.map((p: Period) => (
          <div key={`${p.y}-${p.p}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: '100%', width: '100%', justifyContent: 'center' }}>
              <div style={{ width: '38%', maxWidth: 22, height: `${Math.abs(p.rev ?? 0) / maxV * 100}%`, minHeight: 2, borderRadius: '3px 3px 0 0', background: 'var(--brand)' }} />
              <div style={{ width: '38%', maxWidth: 22, height: `${Math.abs(p.ni ?? 0) / maxV * 100}%`, minHeight: 2, borderRadius: '3px 3px 0 0', background: 'var(--gold, #f59e0b)' }} />
            </div>
            <span style={{ fontSize: 10, color: 'var(--ink4)', fontWeight: 600 }}>{shortLabel(p.y, p.p, ar)}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 12, display: 'flex', gap: 14, fontSize: 10.5, color: 'var(--ink4)' }}>
        <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: 'var(--brand)', marginInlineEnd: 4 }} />{revLabel}</span>
        <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: 'var(--gold, #f59e0b)', marginInlineEnd: 4 }} />{ar ? 'صافي الربح' : 'Earnings'}</span>
      </div>
    </CardShell>
  )
}
