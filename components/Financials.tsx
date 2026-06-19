'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '@/context/AppContext'
import schema from '@/data/fundamentals-schema.json'
import InfoDot from '@/components/InfoDot'

type Fact   = { fiscal_year: number; period: string; statement: string; line_key: string; value_iqd: number | null; source_label_ar: string | null }
type Ratio  = { fiscal_year: number; ratio_key: string; value: number | null }
type Report = { fiscal_year: number; template: string }

const RATIO_DEFS = (schema as any).ratio_defs as Record<string, { ar: string; en: string; unit: string }>
const TEMPLATES  = (schema as any).templates as Record<string, any>

function fmtIQD(v: number | null, ar: boolean): string {
  if (v == null) return '—'
  const neg = v < 0, a = Math.abs(v)
  const u = (n: number, w: string) => `${neg ? '−' : ''}${(a / n).toLocaleString('en', { maximumFractionDigits: 2 })} ${w}`
  if (a >= 1e12) return u(1e12, ar ? 'تريليون' : 'T')
  if (a >= 1e9)  return u(1e9, ar ? 'مليار' : 'B')
  if (a >= 1e6)  return u(1e6, ar ? 'مليون' : 'M')
  return `${neg ? '−' : ''}${a.toLocaleString('en')}`
}
function fmtRatio(v: number | null, unit: string): string {
  if (v == null) return '—'
  if (unit === '%') return `${(v * 100).toFixed(1)}%`
  if (unit === 'x') return `${v.toFixed(2)}×`
  if (unit === 'IQD') return v.toLocaleString('en', { maximumFractionDigits: 2 })
  return v.toFixed(2)
}
const QLABEL: Record<string, string> = { Q1: 'الربع الأول', Q2: 'الربع الثاني', Q3: 'الربع الثالث', Q4: 'الربع الرابع' }
const colLabel = (y: number, p: string, ar: boolean) =>
  p === 'ANNUAL' ? `${y}` : (ar ? `${y} ${QLABEL[p] ?? p}` : `${p} ${y}`)

// Period sort order: Q1 < Q2 < Q3 < Q4 < ANNUAL
const PERIOD_ORDER: Record<string, number> = { Q1: 1, Q2: 2, Q3: 3, Q4: 4, ANNUAL: 5 }
function periodCmp(a: { y: number; p: string }, b: { y: number; p: string }): number {
  if (b.y !== a.y) return b.y - a.y
  return (PERIOD_ORDER[b.p] ?? 9) - (PERIOD_ORDER[a.p] ?? 9)
}

const GROUPS: { ar: string; en: string; keys: string[] }[] = [
  { ar: 'التقييم', en: 'Valuation', keys: ['pe', 'pb', 'ps', 'dividend_yield', 'eps', 'bvps'] },
  { ar: 'الربحية', en: 'Profitability', keys: ['roe', 'roa', 'net_margin', 'operating_margin'] },
  { ar: 'النمو', en: 'Growth', keys: ['revenue_growth_yoy', 'net_income_growth_yoy', 'deposit_growth_yoy'] },
  { ar: 'الملاءة', en: 'Financial Health', keys: ['debt_to_equity', 'debt_to_assets', 'current_ratio', 'capital_adequacy_ratio', 'npl_ratio', 'loan_to_deposit'] },
]
const SUBTOTALS = new Set(['total_assets', 'total_equity_and_liabilities', 'total_liabilities_and_equity',
  'total_fixed_assets', 'total_current_assets', 'total_operating_expenses', 'total_equity',
  'operating_income', 'pretax_income', 'net_income', 'cfo', 'cfi', 'cff', 'net_change_in_cash'])

// Key lines shown in the QoQ snapshot (in order)
const QOQ_INCOME_KEYS = ['revenue', 'financing_income', 'revenue_and_commissions', 'operating_income', 'pretax_income', 'net_income']
const QOQ_BALANCE_KEYS = ['total_assets', 'total_equity', 'customer_deposits', 'net_loans']

function delta(curr: number | null, prev: number | null): number | null {
  if (curr == null || prev == null || prev === 0) return null
  return (curr - prev) / Math.abs(prev)
}

function DeltaBadge({ pct }: { pct: number | null }) {
  if (pct == null) return <span style={{ color: 'var(--ink4)', fontSize: 11 }}>—</span>
  const up = pct >= 0
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 99,
      background: up ? '#16a34a18' : '#dc262618',
      color: up ? 'var(--up, #16a34a)' : 'var(--dn, #dc2626)',
    }}>
      {up ? '▲' : '▼'} {Math.abs(pct * 100).toFixed(1)}%
    </span>
  )
}

export default function Financials({ sym }: { sym: string }) {
  const { lang } = useApp()
  const ar = lang === 'ar'
  const [facts, setFacts]   = useState<Fact[]>([])
  const [ratios, setRatios] = useState<Ratio[]>([])
  const [tpl, setTpl]       = useState('industrial')
  const [tab, setTab]       = useState<'income' | 'balance' | 'cashflow' | 'metrics'>('income')
  const [pmode, setPmode]   = useState<'ANNUAL' | 'QUARTER'>('ANNUAL')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const sb = createClient()
    Promise.all([
      sb.from('financial_facts_public').select('fiscal_year,period,statement,line_key,value_iqd,source_label_ar').eq('ticker', sym),
      sb.from('financial_ratios_public').select('fiscal_year,ratio_key,value').eq('ticker', sym),
      sb.from('financial_reports_public').select('fiscal_year,template').eq('ticker', sym).order('fiscal_year', { ascending: false }).limit(1),
    ]).then(([f, r, rep]) => {
      setFacts((f.data as Fact[]) || [])
      setRatios((r.data as Ratio[]) || [])
      const t = (rep.data as Report[])?.[0]?.template
      if (t) setTpl(t)
      setLoaded(true)
    })
  }, [sym])

  const hasQuarter = useMemo(() => facts.some(f => f.period !== 'ANNUAL'), [facts])

  // All unique (year, period) combos sorted newest-first
  const allCols = useMemo(() => {
    return Array.from(new Set(facts.map(f => `${f.fiscal_year}:${f.period}`)))
      .map(s => { const [y, p] = s.split(':'); return { y: +y, p } })
      .sort(periodCmp)
  }, [facts])

  // Columns for the chosen period mode
  const cols = useMemo(() => {
    const want = (p: string) => pmode === 'ANNUAL' ? p === 'ANNUAL' : p !== 'ANNUAL'
    return allCols.filter(c => want(c.p)).slice(0, 6)
  }, [allCols, pmode])

  // QoQ box: most recent quarter vs same quarter prior year (YoY).
  // Falls back to sequential-quarter comparison if same-period prior year is missing.
  const qCols = useMemo(() => {
    const nonAnnual = allCols.filter(c => c.p !== 'ANNUAL')
    if (nonAnnual.length === 0) return []
    const curr = nonAnnual[0]
    // Try same period, prior year
    const yoy = nonAnnual.find(c => c.p === curr.p && c.y === curr.y - 1)
    if (yoy) return [curr, yoy]
    // Fall back to second most-recent quarter (sequential)
    return nonAnnual.slice(0, 2)
  }, [allCols])

  const factMap = useMemo(() => {
    const m = new Map<string, number | null>()
    facts.forEach(f => m.set(`${f.statement}:${f.line_key}:${f.fiscal_year}:${f.period}`, f.value_iqd))
    return m
  }, [facts])

  const labelMap = useMemo(() => {
    const m = new Map<string, string>()
    const seen = new Map<string, number>()
    facts.forEach(f => {
      if (!f.source_label_ar) return
      const k = `${f.statement}:${f.line_key}`
      const rank = f.fiscal_year + (f.period === 'ANNUAL' ? 0.5 : 0)
      if ((seen.get(k) ?? -Infinity) < rank) { seen.set(k, rank); m.set(k, f.source_label_ar) }
    })
    return m
  }, [facts])

  const annualYears = useMemo(
    () => Array.from(new Set(facts.filter(f => f.period === 'ANNUAL').map(f => f.fiscal_year))).sort((a, b) => a - b),
    [facts],
  )
  const latestAnnual = annualYears[annualYears.length - 1]
  const ratioMap = useMemo(() => {
    const m = new Map<string, number | null>()
    ratios.forEach(r => { if (r.fiscal_year === latestAnnual) m.set(r.ratio_key, r.value) })
    return m
  }, [ratios, latestAnnual])

  // Derived from schema only (cheap; doesn't depend on loaded data) — must stay above early returns
  const tplDef = TEMPLATES[tpl]
  const allLineDefs: Record<string, string> = (() => {
    const m: Record<string, string> = {}
    for (const def of Object.values(tplDef.statements as Record<string, any>)) {
      for (const l of (def.lines ?? [])) m[l.key] = l.name_ar ?? l.ar?.[0] ?? l.key
    }
    for (const l of (tplDef.metrics?.lines ?? [])) m[l.key] = l.name_ar ?? l.ar?.[0] ?? l.key
    return m
  })()

  if (!loaded) return null
  if (!facts.length) return (
    <div style={{ background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 16, padding: 28, textAlign: 'center', color: 'var(--ink4)', fontSize: 14 }}>
      {ar ? 'لم تُنشر بيانات مالية لهذه الشركة بعد.' : 'No financial data published for this company yet.'}
    </div>
  )

  const statementsAvail = Object.keys(tplDef.statements).concat(tplDef.metrics ? ['metrics'] : [])
  const activeTab = statementsAvail.includes(tab) ? tab : (statementsAvail[0] as any)
  const tabLabels: Record<string, [string, string]> = {
    income: ['قائمة الدخل', 'Income'], balance: ['المركز المالي', 'Balance Sheet'],
    cashflow: ['التدفقات النقدية', 'Cash Flow'], metrics: ['مؤشرات مصرفية', 'Bank Metrics'],
  }
  const lineDefs: { key: string; ar: string }[] =
    activeTab === 'metrics'
      ? (tplDef.metrics?.lines ?? []).map((l: any) => ({ key: l.key, ar: l.name_ar ?? l.ar[0] }))
      : (tplDef.statements[activeTab]?.lines ?? []).map((l: any) => ({ key: l.key, ar: l.name_ar ?? l.ar[0] }))

  const trendRevKey = tpl === 'bank' ? 'financing_income' : 'revenue'
  const trend = annualYears.map(y => ({
    y, rev: factMap.get(`income:${trendRevKey}:${y}:ANNUAL`) ?? null, ni: factMap.get(`income:net_income:${y}:ANNUAL`) ?? null,
  }))
  const trendMax = Math.max(1, ...trend.flatMap(t => [Math.abs(t.rev ?? 0), Math.abs(t.ni ?? 0)]))

  // ── QoQ comparison helpers ────────────────────────────────────────────────────
  const [qCurr, qPrev] = qCols
  function qVal(stmt: string, key: string, col: typeof qCols[0] | undefined): number | null {
    if (!col) return null
    return factMap.get(`${stmt}:${key}:${col.y}:${col.p}`) ?? null
  }
  const incomeKeys  = QOQ_INCOME_KEYS.filter(k => qVal('income', k, qCurr) != null || qVal('income', k, qPrev) != null)
  const balanceKeys = QOQ_BALANCE_KEYS.filter(k => qVal('balance', k, qCurr) != null || qVal('balance', k, qPrev) != null)
  const hasQoQ = qCurr != null && (incomeKeys.length > 0 || balanceKeys.length > 0)

  return (
    <section dir={ar ? 'rtl' : 'ltr'} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Card 1: QoQ comparison ────────────────────────────────────────── */}
      {hasQoQ && (
        <div style={{ background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 20, padding: '22px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 2px', color: 'var(--ink)' }}>
                {ar ? 'مقارنة ربعية' : 'Quarterly Comparison'}
              </h2>
              <div style={{ fontSize: 11, color: 'var(--ink4)' }}>
                {qCurr && colLabel(qCurr.y, qCurr.p, ar)}
                {qPrev && <> {ar ? 'مقابل' : 'vs'} {colLabel(qPrev.y, qPrev.p, ar)}</>}
              </div>
            </div>
            <span style={{ fontSize: 10, color: 'var(--ink4)', fontStyle: 'italic' }}>
              {ar ? '* التقارير الربعية تراكمية (من بداية السنة)' : '* Quarterly figures are year-to-date cumulative'}
            </span>
          </div>

          {/* Header row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '6px 12px', marginBottom: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink4)', textTransform: 'uppercase' }}>{ar ? 'البند' : 'Item'}</div>
            {qCurr && <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--brand)', textAlign: ar ? 'left' : 'right' }}>{colLabel(qCurr.y, qCurr.p, ar)}</div>}
            {qPrev && <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink4)', textAlign: ar ? 'left' : 'right' }}>{colLabel(qPrev.y, qPrev.p, ar)}</div>}
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink4)', textAlign: 'center' }}>{ar ? 'التغيير' : 'Δ'}</div>
          </div>

          {/* Income lines */}
          {incomeKeys.length > 0 && (
            <>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink4)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '12px 0 6px' }}>
                {ar ? 'الدخل' : 'Income Statement'}
              </div>
              {incomeKeys.map(k => {
                const curr = qVal('income', k, qCurr), prev = qVal('income', k, qPrev)
                const label = allLineDefs[k] ?? labelMap.get(`income:${k}`) ?? k
                const d = delta(curr, prev)
                const isSub = SUBTOTALS.has(k)
                return (
                  <div key={k} style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '4px 12px',
                    padding: '6px 0', borderBottom: '1px solid var(--line)',
                    fontWeight: isSub ? 800 : 500,
                  }}>
                    <div style={{ fontSize: 12, color: 'var(--ink)' }}>{label}</div>
                    <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--ink)', textAlign: ar ? 'left' : 'right' }}>{fmtIQD(curr, ar)}</div>
                    <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--ink4)', textAlign: ar ? 'left' : 'right' }}>{fmtIQD(prev, ar)}</div>
                    <div style={{ textAlign: 'center', minWidth: 72 }}><DeltaBadge pct={d} /></div>
                  </div>
                )
              })}
            </>
          )}

          {/* Balance lines */}
          {balanceKeys.length > 0 && (
            <>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink4)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '14px 0 6px' }}>
                {ar ? 'المركز المالي' : 'Balance Sheet'}
              </div>
              {balanceKeys.map(k => {
                const curr = qVal('balance', k, qCurr), prev = qVal('balance', k, qPrev)
                const label = allLineDefs[k] ?? labelMap.get(`balance:${k}`) ?? k
                const d = delta(curr, prev)
                const isSub = SUBTOTALS.has(k)
                return (
                  <div key={k} style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '4px 12px',
                    padding: '6px 0', borderBottom: '1px solid var(--line)',
                    fontWeight: isSub ? 800 : 500,
                  }}>
                    <div style={{ fontSize: 12, color: 'var(--ink)' }}>{label}</div>
                    <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--ink)', textAlign: ar ? 'left' : 'right' }}>{fmtIQD(curr, ar)}</div>
                    <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--ink4)', textAlign: ar ? 'left' : 'right' }}>{fmtIQD(prev, ar)}</div>
                    <div style={{ textAlign: 'center', minWidth: 72 }}><DeltaBadge pct={d} /></div>
                  </div>
                )
              })}
            </>
          )}
        </div>
      )}

      {/* ── Card 2: Annual statements + ratios ───────────────────────────────── */}
      <div style={{ background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 20, padding: '22px 24px' }}>

        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: 'var(--ink)' }}>
            {ar ? 'البيانات المالية السنوية' : 'Annual Financials'}
          </h2>
          <span style={{ fontSize: 11, color: 'var(--ink4)' }}>
            {ar ? 'المصدر: هيئة الأوراق المالية العراقية' : 'Source: Iraq Securities Commission'}
          </span>
        </div>

        {/* ratio scorecard (latest annual) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
          {GROUPS.map(g => {
            const cells = g.keys.filter(k => ratioMap.get(k) != null)
            if (!cells.length) return null
            return (
              <div key={g.en}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{ar ? g.ar : g.en}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
                  {cells.map(k => {
                    const def = RATIO_DEFS[k]
                    return (
                      <div key={k} style={{ background: 'var(--surf2, var(--bg))', border: '1px solid var(--line)', borderRadius: 12, padding: '10px 12px' }}>
                        <div style={{ fontSize: 11, color: 'var(--ink4)', fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{def ? (ar ? def.ar : def.en) : k}</span>
                          {def && <InfoDot text={ar ? (def as any).desc_ar : (def as any).desc_en} ar={ar} />}
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>{fmtRatio(ratioMap.get(k)!, def?.unit ?? '')}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* trend */}
        {trend.length > 1 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
              {ar ? (tpl === 'bank' ? 'الدخل وصافي الربح (سنوي)' : 'الإيرادات وصافي الربح (سنوي)') : 'Revenue vs Net Income (annual)'}
            </div>
            <div style={{ display: 'flex', gap: 18, alignItems: 'flex-end', height: 130, padding: '0 4px' }}>
              {trend.map(t => (
                <div key={t.y} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 90, width: '100%', justifyContent: 'center' }}>
                    <div title={fmtIQD(t.rev, ar)} style={{ width: '38%', height: `${Math.abs(t.rev ?? 0) / trendMax * 100}%`, minHeight: 2, background: 'var(--brand)', borderRadius: '4px 4px 0 0' }} />
                    <div title={fmtIQD(t.ni, ar)} style={{ width: '38%', height: `${Math.abs(t.ni ?? 0) / trendMax * 100}%`, minHeight: 2, background: 'var(--up)', borderRadius: '4px 4px 0 0' }} />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink4)', fontWeight: 600 }}>{t.y}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 11, color: 'var(--ink4)' }}>
              <span><span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 2, background: 'var(--brand)', marginInlineEnd: 5 }} />{ar ? (tpl === 'bank' ? 'الدخل' : 'الإيرادات') : 'Revenue'}</span>
              <span><span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 2, background: 'var(--up)', marginInlineEnd: 5 }} />{ar ? 'صافي الربح' : 'Net Income'}</span>
            </div>
          </div>
        )}

        {/* statement tabs + period toggle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {statementsAvail.map(s => (
              <button key={s} onClick={() => setTab(s as any)} style={{
                padding: '7px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: '1px solid var(--line)',
                background: activeTab === s ? 'var(--brand)' : 'transparent', color: activeTab === s ? '#fff' : 'var(--ink3)',
              }}>{ar ? tabLabels[s][0] : tabLabels[s][1]}</button>
            ))}
          </div>
          {hasQuarter && activeTab !== 'metrics' && (
            <div style={{ display: 'flex', gap: 4, background: 'var(--surf2, var(--bg))', borderRadius: 999, padding: 3 }}>
              {(['ANNUAL', 'QUARTER'] as const).map(m => (
                <button key={m} onClick={() => setPmode(m)} style={{
                  padding: '6px 12px', borderRadius: 999, fontSize: 11.5, fontWeight: 700, cursor: 'pointer', border: 'none',
                  background: pmode === m ? 'var(--brand)' : 'transparent', color: pmode === m ? '#fff' : 'var(--ink4)',
                }}>{m === 'ANNUAL' ? (ar ? 'سنوي' : 'Annual') : (ar ? 'ربعي' : 'Quarterly')}</button>
              ))}
            </div>
          )}
        </div>

        {/* statement table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                <th style={{ textAlign: ar ? 'right' : 'left', padding: '8px 6px', fontSize: 11, color: 'var(--ink4)', fontWeight: 700 }}>{ar ? 'البند' : 'Item'}</th>
                {cols.map(c => (
                  <th key={`${c.y}:${c.p}`} style={{ textAlign: ar ? 'left' : 'right', padding: '8px 6px', fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ink3)', fontWeight: 700, whiteSpace: 'nowrap' }}>{colLabel(c.y, c.p, ar)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lineDefs.map(ld => {
                if (!cols.some(c => factMap.get(`${activeTab}:${ld.key}:${c.y}:${c.p}`) != null)) return null
                const isSub = SUBTOTALS.has(ld.key)
                return (
                  <tr key={ld.key} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td style={{ padding: '8px 6px', color: 'var(--ink)', fontWeight: isSub ? 800 : 500 }}>{labelMap.get(`${activeTab}:${ld.key}`) ?? ld.ar}</td>
                    {cols.map(c => {
                      const v = factMap.get(`${activeTab}:${ld.key}:${c.y}:${c.p}`) ?? null
                      return (
                        <td key={`${c.y}:${c.p}`} style={{ textAlign: ar ? 'left' : 'right', padding: '8px 6px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink2, var(--ink))', fontWeight: isSub ? 800 : 500, whiteSpace: 'nowrap' }}>
                          {activeTab === 'metrics' ? (v == null ? '—' : `${v}%`) : fmtIQD(v, ar)}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <p style={{ fontSize: 10.5, color: 'var(--ink4)', marginTop: 14, lineHeight: 1.6 }}>
          {ar
            ? 'البيانات مستخرجة من التقارير المالية المدققة المنشورة على موقع هيئة الأوراق المالية العراقية. البيانات الربعية تراكمية (من بداية السنة). للأغراض المعلوماتية فقط.'
            : 'Extracted from audited financial statements published by the Iraq Securities Commission. Quarterly figures are year-to-date cumulative. For informational purposes only.'}
        </p>
      </div>
    </section>
  )
}
