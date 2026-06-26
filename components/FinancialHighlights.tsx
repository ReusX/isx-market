'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '@/context/AppContext'
import schema from '@/data/fundamentals-schema.json'
import InfoDot from '@/components/InfoDot'

type Fact  = { fiscal_year: number; period: string; statement: string; line_key: string; value_iqd: number | null }
type Ratio = { fiscal_year: number; ratio_key: string; value: number | null }

const RATIO_DEFS = (schema as any).ratio_defs as Record<string, { ar: string; en: string; unit: string; desc_ar: string; desc_en: string }>
const HELP = (schema as any).concept_help as Record<string, { ar: string; en: string }>
const INLINE_RATIOS = ['pe', 'pb', 'dividend_yield', 'roe', 'eps', 'net_margin']

const periodRank = (y: number, p: string) => {
  const m = p === 'ANNUAL' ? 12 : ({ Q1: 3, Q2: 6, Q3: 9, Q4: 12 } as Record<string, number>)[p] ?? 12
  return y * 100 + m
}
function fmtIQD(v: number | null, ar: boolean): string {
  if (v == null) return '·'
  const neg = v < 0, a = Math.abs(v)
  const u = (n: number, w: string) => `${neg ? '−' : ''}${(a / n).toLocaleString('en', { maximumFractionDigits: 2 })} ${w}`
  if (a >= 1e12) return u(1e12, ar ? 'تريليون' : 'T')
  if (a >= 1e9)  return u(1e9, ar ? 'مليار' : 'B')
  if (a >= 1e6)  return u(1e6, ar ? 'مليون' : 'M')
  return `${neg ? '−' : ''}${a.toLocaleString('en')}`
}
function fmtRatio(v: number | null, unit: string): string {
  if (v == null) return '·'
  if (unit === '%') return `${(v * 100).toFixed(1)}%`
  if (unit === 'x') return `${v.toFixed(2)}×`
  return v.toFixed(2)
}
const QLABEL: Record<string, string> = { Q1: 'الربع الأول', Q2: 'الربع الثاني', Q3: 'الربع الثالث', Q4: 'الربع الرابع' }
const periodLabel = (y: number, p: string, ar: boolean) =>
  p === 'ANNUAL' ? (ar ? `عام ${y}` : `FY ${y}`)
                 : (ar ? `${QLABEL[p]} ${y}` : `${p} ${y}`)

export default function FinancialHighlights({ sym }: { sym: string }) {
  const { lang } = useApp()
  const ar = lang === 'ar'
  const [facts, setFacts]   = useState<Fact[]>([])
  const [ratios, setRatios] = useState<Ratio[]>([])
  const [loaded, setLoaded] = useState(false)
  const [sel, setSel]       = useState<number | null>(null)

  useEffect(() => {
    const sb = createClient()
    Promise.all([
      sb.from('financial_facts_public').select('fiscal_year,period,statement,line_key,value_iqd').eq('ticker', sym).eq('statement', 'income'),
      sb.from('financial_ratios_public').select('fiscal_year,ratio_key,value').eq('ticker', sym),
    ]).then(([f, r]) => {
      setFacts((f.data as Fact[]) || [])
      setRatios((r.data as Ratio[]) || [])
      setLoaded(true)
    })
  }, [sym])

  const inc = (y: number, p: string, key: string) =>
    facts.find(f => f.fiscal_year === y && f.period === p && f.line_key === key)?.value_iqd ?? null

  const latest = useMemo(() => {
    const periods = Array.from(new Set(facts.map(f => `${f.fiscal_year}:${f.period}`)))
      .map(s => { const [y, p] = s.split(':'); return { y: +y, p } })
      .sort((a, b) => periodRank(b.y, b.p) - periodRank(a.y, a.p))
    return periods[0]
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

  if (!loaded || !facts.length || !latest) return null

  const isQuarter = latest.p !== 'ANNUAL'
  // standalone quarter value: Q1-Q3 are stored standalone (from the "من X/1" column);
  // Q4 is derived = annual − (Q1+Q2+Q3) since there is no separate Q4 filing.
  const QS = ['Q1', 'Q2', 'Q3', 'Q4']
  const sq = (y: number, p: string, k: string): number | null => {
    if (p !== 'Q4') return inc(y, p, k)
    const a = inc(y, 'ANNUAL', k), q1 = inc(y, 'Q1', k), q2 = inc(y, 'Q2', k), q3 = inc(y, 'Q3', k)
    return [a, q1, q2, q3].every(v => v != null) ? (a! - q1! - q2! - q3!) : null
  }
  const sqList = (() => {
    const yrs = Array.from(new Set(facts.map(f => f.fiscal_year)))
    const out: { y: number; p: string }[] = []
    yrs.forEach(y => QS.forEach(p => { if (sq(y, p, 'revenue') != null) out.push({ y, p }) }))
    return out.sort((a, b) => periodRank(b.y, b.p) - periodRank(a.y, a.p))
  })()

  let rev: number | null, ni: number | null, revPrev: number | null, niPrev: number | null, priorLabel: string, cmpHelp: string
  if (isQuarter && sqList.length >= 2) {
    const cur = sqList[0], prv = sqList[1]
    rev = sq(cur.y, cur.p, 'revenue'); ni = sq(cur.y, cur.p, 'net_income')
    revPrev = sq(prv.y, prv.p, 'revenue'); niPrev = sq(prv.y, prv.p, 'net_income')
    priorLabel = periodLabel(prv.y, prv.p, ar)
    cmpHelp = ar
      ? `التغيّر مقارنةً بالربع السابق مباشرةً (${priorLabel}). تُصدر الشركات تقاريرها الربعية بشكل تراكمي، لذلك احتسبنا نتيجة كل ربع على حدة لإظهار أداء الربع وحده.`
      : `Change vs the immediately preceding quarter (${priorLabel}). ISX companies report quarters cumulatively, so each quarter is isolated to show its standalone result.`
  } else {
    rev = inc(latest.y, latest.p, 'revenue'); ni = inc(latest.y, latest.p, 'net_income')
    revPrev = inc(latest.y - 1, latest.p, 'revenue'); niPrev = inc(latest.y - 1, latest.p, 'net_income')
    priorLabel = periodLabel(latest.y - 1, latest.p, ar)
    cmpHelp = ar ? `مقارنةً بالسنة المالية السابقة (${priorLabel}).` : `Compared with the prior fiscal year (${priorLabel}).`
  }
  const yoy = (cur: number | null, prev: number | null) => cur != null && prev ? cur / prev - 1 : null
  const revYoY = yoy(rev, revPrev), niYoY = yoy(ni, niPrev)

  const trend = annualYears.map(y => ({ y, rev: inc(y, 'ANNUAL', 'revenue'), ni: inc(y, 'ANNUAL', 'net_income') }))
  const tMax = Math.max(1, ...trend.flatMap(t => [Math.abs(t.rev ?? 0), Math.abs(t.ni ?? 0)]))
  const selYear = sel ?? latestAnnual
  const selRow = trend.find(t => t.y === selYear)
  const selMargin = selRow && selRow.rev ? (selRow.ni ?? 0) / selRow.rev : null

  const Delta = ({ v }: { v: number | null }) => v == null ? null : (
    <span style={{ fontSize: 12, fontWeight: 700, color: v >= 0 ? 'var(--up)' : 'var(--dn)', marginInlineStart: 6 }}>
      {v >= 0 ? '▲' : '▼'} {Math.abs(v * 100).toFixed(1)}%
    </span>
  )

  return (
    <section dir={ar ? 'rtl' : 'ltr'} style={{ marginTop: 16 }}>
      <div style={{ background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 20, padding: '20px 22px' }}>

        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, margin: 0, color: 'var(--ink)' }}>{ar ? 'أبرز المؤشرات المالية' : 'Financial Highlights'}</h2>
          <span style={{ fontSize: 11, color: 'var(--ink4)' }}>
            {ar ? `أحدث نتائج: ${periodLabel(latest.y, latest.p, true)}` : `Latest: ${periodLabel(latest.y, latest.p, false)}`}
          </span>
        </div>
        {/* comparison basis */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 16, fontSize: 11, color: 'var(--ink4)' }}>
          <span>{ar ? `التغيّر مقارنةً بـ ${priorLabel}` : `Change vs ${priorLabel}`}</span>
          <InfoDot text={cmpHelp} ar={ar} />
        </div>

        {/* headline */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
          {[
            { key: 'revenue', label: ar ? 'الإيرادات' : 'Revenue', val: rev, d: revYoY },
            { key: 'net_income', label: ar ? 'صافي الربح' : 'Net Profit', val: ni, d: niYoY },
          ].map(c => (
            <div key={c.key} style={{ background: 'var(--surf2, var(--bg))', border: '1px solid var(--line)', borderRadius: 14, padding: '14px 16px' }}>
              <div style={{ fontSize: 11, color: 'var(--ink4)', fontWeight: 600, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                <span>{c.label}</span>
                <InfoDot text={ar ? HELP[c.key].ar : HELP[c.key].en} ar={ar} />
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 19, fontWeight: 800, color: 'var(--ink)' }}>{fmtIQD(c.val, ar)}<Delta v={c.d} /></div>
            </div>
          ))}
        </div>

        {/* interactive trend bars */}
        {trend.length > 1 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-end', height: 90, padding: '0 4px' }}>
              {trend.map(t => {
                const on = t.y === selYear
                return (
                  <button key={t.y} onClick={() => setSel(t.y)} aria-label={`${t.y}`}
                    style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', padding: 0, opacity: on ? 1 : 0.62 }}>
                    <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 64, width: '100%', justifyContent: 'center' }}>
                      <div style={{ width: '40%', height: `${Math.abs(t.rev ?? 0) / tMax * 100}%`, minHeight: 2, background: 'var(--brand)', borderRadius: '3px 3px 0 0', outline: on ? '2px solid var(--brand)' : 'none', outlineOffset: 1 }} />
                      <div style={{ width: '40%', height: `${Math.abs(t.ni ?? 0) / tMax * 100}%`, minHeight: 2, background: 'var(--up)', borderRadius: '3px 3px 0 0' }} />
                    </div>
                    <div style={{ fontSize: 10, color: on ? 'var(--ink)' : 'var(--ink4)', fontWeight: on ? 800 : 600 }}>{t.y}</div>
                  </button>
                )
              })}
            </div>
            {/* selected-year detail */}
            {selRow && (
              <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--surf2, var(--bg))', border: '1px solid var(--line)', borderRadius: 10, display: 'flex', flexWrap: 'wrap', gap: '4px 16px', fontSize: 12 }}>
                <span style={{ fontWeight: 800, color: 'var(--ink)' }}>{selYear}</span>
                <span style={{ color: 'var(--ink3)' }}><span style={{ color: 'var(--ink4)' }}>{ar ? 'الإيرادات:' : 'Revenue:'} </span>{fmtIQD(selRow.rev, ar)}</span>
                <span style={{ color: 'var(--ink3)' }}><span style={{ color: 'var(--ink4)' }}>{ar ? 'صافي الربح:' : 'Net Profit:'} </span>{fmtIQD(selRow.ni, ar)}</span>
                {selMargin != null && <span style={{ color: 'var(--ink3)' }}><span style={{ color: 'var(--ink4)' }}>{ar ? 'هامش الربح:' : 'Margin:'} </span>{(selMargin * 100).toFixed(1)}%</span>}
              </div>
            )}
            <div style={{ display: 'flex', gap: 14, marginTop: 8, fontSize: 10.5, color: 'var(--ink4)' }}>
              <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: 'var(--brand)', marginInlineEnd: 4 }} />{ar ? 'الإيرادات' : 'Revenue'}</span>
              <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: 'var(--up)', marginInlineEnd: 4 }} />{ar ? 'صافي الربح' : 'Net Profit'}</span>
              <span style={{ marginInlineStart: 'auto' }}>{ar ? '← اضغط عموداً للتفاصيل' : 'tap a bar for detail →'}</span>
            </div>
          </div>
        )}

        {/* 6 headline ratios with info */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 18 }}>
          {INLINE_RATIOS.filter(k => ratioMap.get(k) != null).map(k => {
            const def = RATIO_DEFS[k]
            return (
              <div key={k} style={{ textAlign: 'center', padding: '8px 4px' }}>
                <div style={{ fontSize: 10.5, color: 'var(--ink4)', fontWeight: 600, marginBottom: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <span>{ar ? def?.ar : def?.en}</span>
                  {def && <InfoDot text={ar ? def.desc_ar : def.desc_en} ar={ar} />}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 800, color: 'var(--ink)' }}>{fmtRatio(ratioMap.get(k)!, def?.unit ?? '')}</div>
              </div>
            )
          })}
        </div>

        <Link href={`/c/${sym}/financials`} style={{
          display: 'block', textAlign: 'center', padding: '11px', borderRadius: 12,
          background: 'var(--brand)', color: '#fff', fontWeight: 700, fontSize: 13, textDecoration: 'none',
        }}>
          {ar ? 'عرض التفاصيل المالية الكاملة ←' : 'View full financial details →'}
        </Link>
      </div>
    </section>
  )
}
