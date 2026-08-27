'use client'

import { useEffect, useState, useCallback } from 'react'
import { useLocale } from '@/context/LocaleContext'
import Link from 'next/link'
import { useApp } from '@/context/AppContext'
import { SECTORS } from '@/lib/market'
import { CompanyLogo } from '@/components/CompanyLogo'

interface KPI { label: string; value: string; change: string }
interface AnalysisPoint { title: string; body: string }
interface AnalysisData {
  headline:    string
  summary:     string
  kpis:        KPI[]
  bullCase:    AnalysisPoint[]
  bearCase:    AnalysisPoint[]
  verdict:     string
  verdictBody: string
  themes:      string[]
  outlook:     string
}

interface CoMeta {
  sym: string; en: string; ar: string
  sec: string; logo: string; color: string; mcap: number
}

const SECTOR_COLORS: Record<string, string> = {
  BANK: '#3B82F6', IND: '#EF4444', SVC: '#22C55E',
  HTL: '#C8973D',  TEL: '#EC4899', AGR: '#10B981',
  INS: '#F59E0B',  INV: '#8B5CF6',
}

const VERDICT_CONFIG: Record<string, { emoji: string; color: string; bg: string }> = {
  'Very Bullish':   { emoji: '🟢🟢', color: '#22C55E', bg: 'rgba(34,197,94,0.08)'  },
  'Bullish':        { emoji: '🟢',   color: '#22C55E', bg: 'rgba(34,197,94,0.06)'  },
  'Mildly Bullish': { emoji: '🟡🟢', color: '#86efac', bg: 'rgba(134,239,172,0.07)'},
  'Neutral':        { emoji: '⚪',   color: 'var(--ink3)', bg: 'rgba(255,255,255,0.04)' },
  'Mildly Bearish': { emoji: '🟠',   color: '#fb923c', bg: 'rgba(251,146,60,0.07)' },
  'Bearish':        { emoji: '🔴',   color: '#EF4444', bg: 'rgba(239,68,68,0.06)'  },
  'Very Bearish':   { emoji: '🔴🔴', color: '#EF4444', bg: 'rgba(239,68,68,0.08)'  },
  // Arabic
  'إيجابي جداً':   { emoji: '🟢🟢', color: '#22C55E', bg: 'rgba(34,197,94,0.08)'  },
  'إيجابي':        { emoji: '🟢',   color: '#22C55E', bg: 'rgba(34,197,94,0.06)'  },
  'إيجابي نسبياً': { emoji: '🟡🟢', color: '#86efac', bg: 'rgba(134,239,172,0.07)'},
  'محايد':         { emoji: '⚪',   color: 'var(--ink3)', bg: 'rgba(255,255,255,0.04)' },
  'سلبي نسبياً':   { emoji: '🟠',   color: '#fb923c', bg: 'rgba(251,146,60,0.07)' },
  'سلبي':          { emoji: '🔴',   color: '#EF4444', bg: 'rgba(239,68,68,0.06)'  },
  'سلبي جداً':     { emoji: '🔴🔴', color: '#EF4444', bg: 'rgba(239,68,68,0.08)'  },
}

function getVerdict(v: string) {
  return VERDICT_CONFIG[v] ?? { emoji: '⚪', color: 'var(--ink3)', bg: 'rgba(255,255,255,0.04)' }
}

function CoLogo({ sym, logo, color }: { sym: string; logo: string; color: string }) {
  return (
    <CompanyLogo
      sym={sym}
      logo={logo}
      letters={4}
      style={{
        background: color + '22',
        width: 52, height: 52, borderRadius: 14, flexShrink: 0,
        border: `1.5px solid ${color}44`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 800, color,
      }}
    />
  )
}

function CaseCard({ type, points, locale }: { type: 'bull' | 'bear'; points: AnalysisPoint[]; locale: string }) {
  const isBull = type === 'bull'
  const ar     = locale === 'ar'
  const accent = isBull ? '#22C55E' : '#EF4444'
  const bg     = isBull ? 'rgba(34,197,94,0.05)'  : 'rgba(239,68,68,0.05)'
  const border = isBull ? 'rgba(34,197,94,0.16)'  : 'rgba(239,68,68,0.16)'

  return (
    <div style={{ flex: 1, minWidth: 280, background: bg, border: `1px solid ${border}`, borderRadius: 18, padding: '22px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 20, paddingBottom: 14, borderBottom: `1px solid ${border}` }}>
        <span style={{ fontSize: 20 }}>{isBull ? '🐂' : '🐻'}</span>
        <span style={{ fontSize: 15, fontWeight: 900, color: accent }}>
          {isBull ? (ar ? 'الحالة الإيجابية' : 'Bull Case') : (ar ? 'الحالة السلبية' : 'Bear Case')}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {(points ?? []).map((p, i) => (
          <div key={i}>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--ink)', marginBottom: 5 }}>{p.title}</div>
            <div style={{ fontSize: 13, color: 'var(--ink3)', lineHeight: 1.8 }}>{p.body}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Loading({ ar }: { ar: boolean }) {
  const [dot, setDot] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setDot(d => (d + 1) % 4), 500)
    return () => clearInterval(t)
  }, [])
  return (
    <div style={{ padding: '56px 24px', textAlign: 'center' }}>
      <div style={{ position: 'relative', width: 56, height: 56, margin: '0 auto 24px' }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid rgba(79,107,255,0.15)' }} />
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid transparent', borderTopColor: 'var(--brand)', animation: 'spin 0.9s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ position: 'absolute', inset: 8, borderRadius: '50%', background: 'rgba(79,107,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📊</div>
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>
        {ar ? `جارٍ تحليل التقارير المالية${'.'.repeat(dot)}` : `Analysing financial filings${'.'.repeat(dot)}`}
      </div>
      <div style={{ fontSize: 12, color: 'var(--ink5)' }}>
        {ar ? '~20 ثانية' : '~20 seconds'}
      </div>
    </div>
  )
}

export default function AnalysisPage({ params }: { params: { sym: string } }) {
  const sym = params.sym.toUpperCase()
  const { locale } = useLocale()
  const ar = locale === 'ar'

  const [co,       setCo]       = useState<CoMeta | null>(null)
  const [live,     setLive]     = useState<{ close: number; pct: number } | null>(null)
  const [analysis, setAnalysis] = useState<{ en: AnalysisData; ar: AnalysisData } | null>(null)
  const [phase,    setPhase]    = useState<'booting' | 'loading' | 'done' | 'error'>('booting')
  const [errMsg,   setErrMsg]   = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/data/companies.json').then(r => r.json()),
      fetch('/data/live.json').then(r => r.json()).catch(() => null),
    ]).then(([companies, liveData]) => {
      setCo((companies as CoMeta[]).find(c => c.sym === sym) ?? null)
      if (liveData?.stocks) {
        const st = liveData.stocks.find((s: any) => s.code === sym)
        if (st) setLive({ close: st.close ?? 0, pct: st.pct ?? 0 })
      }
    })
  }, [sym])

  const loadOrGenerate = useCallback(async () => {
    // Try cache first
    try {
      const res = await fetch(`/api/analysis/${sym}`)
      if (res.ok) {
        setAnalysis(await res.json())
        setPhase('done')
        return
      }
    } catch (_) {}

    // Auto-generate if not cached
    setPhase('loading')
    setErrMsg('')
    try {
      const res = await fetch(`/api/analysis/${sym}`, { method: 'POST' })
      if (!res.ok) {
        const e = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        throw new Error(e.error ?? 'Failed to load analysis')
      }
      setAnalysis(await res.json())
      setPhase('done')
    } catch (e: any) {
      setErrMsg(e.message ?? 'Unknown error')
      setPhase('error')
    }
  }, [sym])

  useEffect(() => { loadOrGenerate() }, [loadOrGenerate])

  const content  = analysis ? (ar ? analysis.ar : analysis.en) : null
  const secColor = SECTOR_COLORS[co?.sec ?? ''] ?? 'var(--brand)'
  const secLabel = SECTORS.find(s => s.id === co?.sec)
  const price    = live?.close ?? 0
  const pct      = live?.pct ?? 0
  const up       = pct >= 0
  const verdict  = content?.verdict ? getVerdict(content.verdict) : null

  // Thmanyah font for this page regardless of language toggle
  const thmanyah = "'ThmanyahSans', sans-serif"

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 24px 80px', fontFamily: thmanyah }}>

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28, fontSize: 13, color: 'var(--ink4)', fontFamily: thmanyah }}>
        <Link href="/analysis" style={{ color: 'var(--brand)', fontWeight: 600 }}>{ar ? 'التحليلات' : 'Analysis'}</Link>
        <span>/</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--ink)' }}>{sym}</span>
      </div>

      {/* Company header */}
      {co && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <CoLogo sym={co.sym} logo={co.logo} color={secColor} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 900, color: 'var(--ink)' }}>{sym}</span>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 6, background: secColor + '18', color: secColor, border: `1px solid ${secColor}30` }}>
                  {ar ? (secLabel?.ar ?? co.sec) : (secLabel?.en ?? co.sec)}
                </span>
              </div>
              <div style={{ fontSize: 15, color: 'var(--ink3)', marginBottom: 6, fontFamily: thmanyah }}>{ar ? co.ar : co.en}</div>
              {price > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 800 }}>{price.toFixed(3)}</span>
                  <span style={{ fontSize: 13, color: 'var(--ink4)' }}>IQD</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: up ? 'var(--up)' : 'var(--dn)' }}>
                    {up ? '▲' : '▼'} {Math.abs(pct).toFixed(2)}%
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div style={{ height: 1, background: 'var(--line)', marginBottom: 28 }} />

      {/* States */}
      {phase === 'booting'  && <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--ink5)' }}>…</div>}
      {phase === 'loading'  && <Loading ar={ar} />}

      {phase === 'error' && (
        <div style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginBottom: 8, fontFamily: thmanyah }}>
            {ar ? 'تعذّر تحميل التحليل' : 'Could not load analysis'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink4)', marginBottom: 24, maxWidth: 360, margin: '0 auto 24px', lineHeight: 1.7, fontFamily: thmanyah }}>
            {errMsg}
          </div>
        </div>
      )}

      {/* ── Analysis content ── */}
      {phase === 'done' && content && (
        <div style={{ fontFamily: thmanyah }}>

          {/* Headline */}
          {content.headline && (
            <h2 style={{ fontSize: 28, fontWeight: 900, lineHeight: 1.3, color: 'var(--ink)', margin: '0 0 18px', fontFamily: thmanyah }}>
              {content.headline}
            </h2>
          )}

          {/* Summary */}
          <p style={{ fontSize: 16, lineHeight: 2, color: 'var(--ink2)', margin: '0 0 28px', fontWeight: 400, fontFamily: thmanyah }}>
            {content.summary}
          </p>

          {/* KPI row */}
          {(content.kpis?.length ?? 0) > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${content.kpis.length}, 1fr)`, gap: 10, marginBottom: 28 }}>
              {content.kpis.map((k, i) => {
                const isPos = k.change?.startsWith('+') || k.change?.includes('↑')
                const isNeg = k.change?.startsWith('-') || k.change?.includes('↓')
                const changeColor = isPos ? 'var(--up)' : isNeg ? 'var(--dn)' : 'var(--ink4)'
                return (
                  <div key={i} style={{ padding: '16px', borderRadius: 13, background: 'var(--surf)', border: '1px solid var(--line)' }}>
                    <div style={{ fontSize: 10, color: 'var(--ink5)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6, fontFamily: thmanyah }}>{k.label}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 800, color: 'var(--ink)', marginBottom: 3 }}>{k.value}</div>
                    {k.change && <div style={{ fontSize: 11, fontWeight: 700, color: changeColor, fontFamily: thmanyah }}>{k.change}</div>}
                  </div>
                )
              })}
            </div>
          )}

          {/* Bull / Bear */}
          <div style={{ display: 'flex', gap: 14, marginBottom: 28, flexWrap: 'wrap' }}>
            <CaseCard type="bull" points={content.bullCase} locale={locale} />
            <CaseCard type="bear" points={content.bearCase} locale={locale} />
          </div>

          {/* Verdict */}
          {content.verdict && verdict && (
            <div style={{ padding: '22px 24px', borderRadius: 16, background: verdict.bg, border: `1px solid ${verdict.color}28`, marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 20 }}>{verdict.emoji}</span>
                <span style={{ fontSize: 15, fontWeight: 900, color: verdict.color, fontFamily: thmanyah }}>
                  {ar ? 'الحكم:' : 'Verdict:'} {content.verdict}
                </span>
              </div>
              {content.verdictBody && (
                <p style={{ fontSize: 14, color: 'var(--ink2)', margin: 0, lineHeight: 1.9, fontFamily: thmanyah }}>{content.verdictBody}</p>
              )}
            </div>
          )}

          {/* Themes */}
          {(content.themes?.length ?? 0) > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, fontFamily: thmanyah }}>
                {ar ? 'المحاور الرئيسية' : 'Key Themes'}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {content.themes.map((t, i) => (
                  <span key={i} style={{ padding: '5px 14px', borderRadius: 999, background: 'var(--surf2)', border: '1px solid var(--line)', fontSize: 12, fontWeight: 600, color: 'var(--ink3)', fontFamily: thmanyah }}>{t}</span>
                ))}
              </div>
            </div>
          )}

          {/* Outlook */}
          {content.outlook && (
            <div style={{ padding: '18px 20px', borderRadius: 14, background: 'var(--surf)', border: '1px solid var(--line)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontFamily: thmanyah }}>{ar ? 'التوقعات' : 'Outlook'}</div>
              <p style={{ fontSize: 14, color: 'var(--ink2)', margin: 0, lineHeight: 1.9, fontFamily: thmanyah }}>{content.outlook}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
