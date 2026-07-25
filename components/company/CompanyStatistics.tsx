'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '@/context/AppContext'
import { arDate } from '@/lib/date'

type Ratio = { fiscal_year: number; ratio_key: string; value: number | null }
type Fact  = { fiscal_year: number; period: string; line_key: string; value_iqd: number | null }
type Row   = { label: string; value: string }

// ── Formatters ──────────────────────────────────────────────────────────────────
const money = (v: number | null): string => {
  if (v == null) return '·'
  const neg = v < 0, a = Math.abs(v)
  const u = (n: number, w: string) => `${neg ? '−' : ''}${(a / n).toFixed(2)}${w}`
  if (a >= 1e12) return u(1e12, 'T')
  if (a >= 1e9)  return u(1e9, 'B')
  if (a >= 1e6)  return u(1e6, 'M')
  if (a >= 1e3)  return u(1e3, 'K')
  return `${neg ? '−' : ''}${a.toFixed(0)}`
}
const pct = (v: number | null) => (v == null ? '·' : `${(v * 100).toFixed(2)}%`)
const mult = (v: number | null) => (v == null ? '·' : `${v.toFixed(2)}×`)
const num  = (v: number | null) => (v == null ? '·' : v.toFixed(2))

export default function CompanyStatistics({ sym, price, shares, mcapFallback }: {
  sym: string; price: number; shares?: number; mcapFallback?: number
}) {
  const { lang } = useApp()
  const ar = lang === 'ar'
  const [ratios, setRatios] = useState<Ratio[]>([])
  const [facts, setFacts]   = useState<Fact[]>([])
  const [ttm, setTtm]       = useState<{ pe: number; ttmNi: number; eps: number; shares: number } | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const sb = createClient()
    Promise.all([
      sb.from('financial_ratios_public').select('fiscal_year,ratio_key,value').eq('ticker', sym),
      sb.from('financial_facts_public').select('fiscal_year,period,line_key,value_iqd').eq('ticker', sym),
      import('@/lib/fundamentals').then(m => m.fetchTtmPe(sb, { [sym]: price })).catch(() => ({} as any)),
    ]).then(([r, f, peMap]: any[]) => {
      setRatios((r.data as Ratio[]) || [])
      setFacts((f.data as Fact[]) || [])
      setTtm(peMap?.[sym] ?? null)
      setLoaded(true)
    })
  }, [sym, price])

  const isBank = facts.some(f => f.line_key === 'financing_income')

  // Latest fiscal year for annual ratios / facts
  const latestFY = useMemo(() => {
    const ys = facts.filter(f => f.period === 'ANNUAL').map(f => f.fiscal_year)
    return ys.length ? Math.max(...ys) : (ratios.length ? Math.max(...ratios.map(r => r.fiscal_year)) : null)
  }, [facts, ratios])

  const ratioMap = useMemo(() => {
    const m = new Map<string, number | null>()
    ratios.filter(r => r.fiscal_year === latestFY).forEach(r => m.set(r.ratio_key, r.value))
    return m
  }, [ratios, latestFY])

  const val = (y: number, p: string, k: string) =>
    facts.find(f => f.fiscal_year === y && f.period === p && f.line_key === k)?.value_iqd ?? null

  // Effective revenue (bank = net interest + commission income)
  const effRev = (y: number, p: string): number | null => {
    const r = val(y, p, 'revenue')
    if (r != null) return r
    const fi = val(y, p, 'financing_income'), rc = val(y, p, 'revenue_and_commissions')
    return fi != null || rc != null ? (fi ?? 0) + (rc ?? 0) : null
  }
  // TTM = last reported quarter + prior full year − same quarter a year ago
  const ttmRev = useMemo(() => {
    if (!latestFY) return null
    const anchorQ = ['Q3', 'Q2', 'Q1'].find(p => effRev(latestFY + 1, p) != null)
    if (anchorQ) {
      const cur = effRev(latestFY + 1, anchorQ), ann = effRev(latestFY, 'ANNUAL'), prv = effRev(latestFY, anchorQ)
      if (cur != null && ann != null && prv != null) return cur + ann - prv
    }
    return effRev(latestFY, 'ANNUAL')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facts, latestFY])

  if (!loaded) return null

  const mcap = price > 0 && shares ? price * shares : (mcapFallback ? mcapFallback * 1e6 : null)
  const ttmNi = ttm?.ttmNi ?? null
  const cash  = isBank ? val(latestFY!, 'ANNUAL', 'cash_and_cbi') : val(latestFY!, 'ANNUAL', 'cash')
  const cfo   = val(latestFY!, 'ANNUAL', 'cfo')
  const capex = val(latestFY!, 'ANNUAL', 'capex')
  const fcf   = cfo != null ? cfo - Math.abs(capex ?? 0) : null
  const hasFin = facts.length > 0 || ratios.length > 0

  // Live valuation from current price (consistent with "as of today")
  const peLive = mcap != null && ttmNi ? mcap / ttmNi : ratioMap.get('pe') ?? null
  const psLive = mcap != null && ttmRev ? mcap / ttmRev : ratioMap.get('ps') ?? null
  const pbLive = mcap != null && val(latestFY!, 'ANNUAL', 'total_equity')
    ? mcap / val(latestFY!, 'ANNUAL', 'total_equity')! : ratioMap.get('pb') ?? null

  const valuation: Row[] = [
    { label: ar ? 'القيمة السوقية' : 'Market Cap', value: money(mcap) },
    { label: ar ? 'مكرر الربحية (TTM)' : 'Trailing P/E', value: mult(peLive) },
    { label: ar ? 'السعر/المبيعات' : 'Price/Sales (ttm)', value: mult(psLive) },
    { label: ar ? 'السعر/القيمة الدفترية' : 'Price/Book', value: mult(pbLive) },
    { label: ar ? 'عائد التوزيعات' : 'Dividend Yield', value: pct(ratioMap.get('dividend_yield') ?? null) },
  ].filter(r => r.value !== '·' || r.label.includes('Market') || r.label.includes('السوقية'))

  // Margin computed on the SAME (TTM) basis as the revenue/NI shown below it, so
  // the numbers reconcile; falls back to the latest annual ratio.
  const marginTtm = ttmNi != null && ttmRev ? ttmNi / ttmRev : ratioMap.get('net_margin') ?? null
  const profitability: Row[] = [
    { label: ar ? 'هامش صافي الربح' : 'Profit Margin', value: pct(marginTtm) },
    { label: ar ? 'العائد على الأصول' : 'Return on Assets', value: pct(ratioMap.get('roa') ?? null) },
    { label: ar ? 'العائد على حقوق الملكية' : 'Return on Equity', value: pct(ratioMap.get('roe') ?? null) },
    { label: ar ? (isBank ? 'الدخل التشغيلي (TTM)' : 'الإيرادات (TTM)') : (isBank ? 'Operating Income (ttm)' : 'Revenue (ttm)'), value: money(ttmRev) },
    { label: ar ? 'صافي الربح (TTM)' : 'Net Income (ttm)', value: money(ttmNi) },
    { label: ar ? 'ربحية السهم (TTM)' : 'Diluted EPS (ttm)', value: num(ttm?.eps ?? ratioMap.get('eps') ?? null) },
  ].filter(r => r.value !== '·')

  const balance: Row[] = (isBank
    ? [
        { label: ar ? 'النقد وأرصدة البنك المركزي' : 'Total Cash (mrq)', value: money(cash) },
        { label: ar ? 'القيمة الدفترية للسهم' : 'Book Value/Share', value: num(ratioMap.get('bvps') ?? null) },
        { label: ar ? 'كفاية رأس المال' : 'Capital Adequacy Ratio', value: pct(ratioMap.get('capital_adequacy_ratio') ?? null) },
        { label: ar ? 'القروض/الودائع' : 'Loan-to-Deposit', value: pct(ratioMap.get('loan_to_deposit') ?? null) },
      ]
    : [
        { label: ar ? 'إجمالي النقد' : 'Total Cash (mrq)', value: money(cash) },
        { label: ar ? 'القيمة الدفترية للسهم' : 'Book Value/Share', value: num(ratioMap.get('bvps') ?? null) },
        { label: ar ? 'الدين/حقوق الملكية' : 'Total Debt/Equity (mrq)', value: pct(ratioMap.get('debt_to_equity') ?? null) },
        { label: ar ? 'التدفق النقدي الحر (TTM)' : 'Free Cash Flow (ttm)', value: money(fcf) },
      ]).filter(r => r.value !== '·')

  const lockedRows = [
    ar ? 'قيمة المنشأة' : 'Enterprise Value',
    ar ? 'مكرر الربحية الآجل' : 'Forward P/E',
    ar ? 'نسبة PEG' : 'PEG Ratio',
    ar ? 'قيمة المنشأة/الإيرادات' : 'EV/Revenue',
    ar ? 'قيمة المنشأة/EBITDA' : 'EV/EBITDA',
    ar ? 'مقارنة النظراء' : 'Peer Comparison',
  ]

  const today = ar
    ? arDate(new Date().toISOString().slice(0, 10))
    : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })

  const RowList = ({ rows }: { rows: Row[] }) => (
    <div>
      {rows.map((r, i) => (
        <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0',
          borderBottom: i < rows.length - 1 ? '1px dashed var(--line)' : 'none', gap: 12 }}>
          <span style={{ fontSize: 13, color: 'var(--ink3)' }}>{r.label}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>{r.value}</span>
        </div>
      ))}
    </div>
  )
  const SubHead = ({ children }: { children: React.ReactNode }) => (
    <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--ink)', margin: '14px 0 2px' }}>{children}</div>
  )

  return (
    <section dir={ar ? 'rtl' : 'ltr'} style={{ marginTop: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: 'var(--ink)' }}>{ar ? 'الإحصائيات' : 'Statistics'}</h2>
        <Link href={`/c/${sym}/financials`} style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand)', textDecoration: 'none' }}>
          {ar ? 'عرض المزيد ←' : 'View More →'}
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        {/* Valuation Measures */}
        <div style={{ background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 16, padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>{ar ? 'مقاييس التقييم' : 'Valuation Measures'}</span>
            <span style={{ fontSize: 11, color: 'var(--ink4)' }}>{ar ? `كما في ${today}` : `As of ${today}`}</span>
          </div>
          <RowList rows={valuation} />
        </div>

        {/* Financial Highlights */}
        <div style={{ background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 16, padding: '18px 20px' }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)', marginBottom: 4 }}>{ar ? 'أبرز المؤشرات المالية' : 'Financial Highlights'}</div>
          {hasFin && (profitability.length || balance.length) ? (
            <>
              {profitability.length > 0 && <><SubHead>{ar ? 'الربحية وقائمة الدخل' : 'Profitability and Income Statement'}</SubHead><RowList rows={profitability} /></>}
              {balance.length > 0 && <><SubHead>{ar ? 'الميزانية والتدفقات النقدية' : 'Balance Sheet and Cash Flow'}</SubHead><RowList rows={balance} /></>}
              {latestFY && <div style={{ fontSize: 10.5, color: 'var(--ink4)', marginTop: 12 }}>{ar ? `النسب وفق آخر سنة مالية (${latestFY})` : `Ratios based on latest fiscal year (${latestFY})`}</div>}
            </>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--ink4)', padding: '20px 0' }}>
              {ar ? 'لم تُستخرج البيانات المالية المفصّلة لهذه الشركة بعد.' : 'Detailed financials for this company are not extracted yet.'}
            </div>
          )}
        </div>
      </div>

      {/* ── Paywall-locked advanced metrics ── */}
      <div style={{ position: 'relative', marginTop: 16, background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 16, padding: '18px 20px', overflow: 'hidden' }}>
        <div style={{ filter: 'blur(5px)', opacity: 0.55, pointerEvents: 'none', userSelect: 'none' }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)', marginBottom: 6 }}>{ar ? 'مقاييس متقدمة' : 'Advanced Metrics'}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0 28px' }}>
            {lockedRows.map(l => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 0', borderBottom: '1px dashed var(--line)' }}>
                <span style={{ fontSize: 13, color: 'var(--ink3)' }}>{l}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>•••</span>
              </div>
            ))}
          </div>
        </div>
        {/* Lock overlay */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
          background: 'color-mix(in srgb, var(--surf) 55%, transparent)' }}>
          <div style={{ fontSize: 22 }}>🔒</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)' }}>{ar ? 'تحليلات متقدمة' : 'Advanced Analytics'}</div>
          <div style={{ fontSize: 12.5, color: 'var(--ink4)', textAlign: 'center', maxWidth: 360 }}>
            {ar ? 'قيمة المنشأة، المكررات الآجلة، مقارنة النظراء والمزيد · متاحة قريباً للمشتركين.'
                : 'Enterprise value, forward multiples, peer comparison & more · coming soon for subscribers.'}
          </div>
          <span style={{ marginTop: 4, padding: '7px 16px', borderRadius: 999, background: 'var(--brand)', color: '#fff', fontSize: 12.5, fontWeight: 700, opacity: 0.95 }}>
            {ar ? 'قريباً' : 'Coming soon'}
          </span>
        </div>
      </div>
    </section>
  )
}
