'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useApp } from '@/context/AppContext'
import { SECTORS } from '@/lib/market'

// ── Types ─────────────────────────────────────────────────────────────────────
interface AnalysisPoint { title: string; body: string }
interface AnalysisData {
  summary:  string
  bullCase: AnalysisPoint[]
  bearCase: AnalysisPoint[]
  themes:   string[]
  outlook:  string
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

// ── Logo ──────────────────────────────────────────────────────────────────────
function CoLogo({ sym, logo, color }: { sym: string; logo: string; color: string }) {
  const [err, setErr] = useState(false)
  if (logo && !err) return (
    <img src={logo} alt={sym} width={52} height={52}
      style={{ borderRadius: 14, objectFit: 'contain', background: '#fff', padding: 4, flexShrink: 0 }}
      onError={() => setErr(true)} />
  )
  return (
    <div style={{
      width: 52, height: 52, borderRadius: 14, flexShrink: 0,
      background: color + '22', border: `1.5px solid ${color}44`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 800, color,
    }}>
      {sym.slice(0, 4)}
    </div>
  )
}

// ── Bull / Bear card ──────────────────────────────────────────────────────────
function CaseCard({ type, points, lang }: { type: 'bull' | 'bear'; points: AnalysisPoint[]; lang: string }) {
  const isBull = type === 'bull'
  const ar     = lang === 'ar'
  const accent = isBull ? '#22C55E' : '#EF4444'
  const bg     = isBull ? 'rgba(34,197,94,0.06)'  : 'rgba(239,68,68,0.06)'
  const border = isBull ? 'rgba(34,197,94,0.18)'  : 'rgba(239,68,68,0.18)'

  return (
    <div style={{
      flex: 1, minWidth: 280,
      background: bg, border: `1px solid ${border}`,
      borderRadius: 18, padding: '24px 22px',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 9, marginBottom: 22,
        paddingBottom: 14, borderBottom: `1px solid ${border}`,
      }}>
        <span style={{ fontSize: 20 }}>{isBull ? '🐂' : '🐻'}</span>
        <span style={{ fontSize: 16, fontWeight: 900, color: accent }}>
          {isBull ? (ar ? 'الحالة الإيجابية' : 'Bull Case') : (ar ? 'الحالة السلبية' : 'Bear Case')}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {(points ?? []).map((p, i) => (
          <div key={i}>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--ink)', marginBottom: 5 }}>{p.title}</div>
            <div style={{ fontSize: 13, color: 'var(--ink3)', lineHeight: 1.75 }}>{p.body}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function AnalysisSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {[90, 70, 100, 80, 55].map((w, i) => (
        <div key={i} className="skeleton" style={{ height: 16, width: `${w}%`, borderRadius: 6 }} />
      ))}
      <div style={{ display: 'flex', gap: 14, marginTop: 12 }}>
        <div className="skeleton" style={{ flex: 1, height: 240, borderRadius: 16 }} />
        <div className="skeleton" style={{ flex: 1, height: 240, borderRadius: 16 }} />
      </div>
    </div>
  )
}

// ── Generating spinner ────────────────────────────────────────────────────────
function Generating({ ar }: { ar: boolean }) {
  const [dot, setDot] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setDot(d => (d + 1) % 4), 500)
    return () => clearInterval(t)
  }, [])
  const dots = '.'.repeat(dot)

  return (
    <div style={{ padding: '56px 24px', textAlign: 'center' }}>
      {/* Animated ring */}
      <div style={{ position: 'relative', width: 56, height: 56, margin: '0 auto 24px' }}>
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          border: '3px solid rgba(79,107,255,0.15)',
        }} />
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          border: '3px solid transparent', borderTopColor: 'var(--brand)',
          animation: 'spin 0.9s linear infinite',
        }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{
          position: 'absolute', inset: 8, borderRadius: '50%',
          background: 'rgba(79,107,255,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18,
        }}>✦</div>
      </div>

      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)', marginBottom: 8 }}>
        {ar ? `جارٍ توليد التحليل${dots}` : `Generating analysis${dots}`}
      </div>
      <div style={{ fontSize: 13, color: 'var(--ink4)', lineHeight: 1.6 }}>
        {ar
          ? 'يقوم Gemini AI بتحليل أحدث البيانات المالية للشركة'
          : 'Gemini AI is analysing the latest financial data for this company'}
      </div>
      <div style={{ fontSize: 11, color: 'var(--ink5)', marginTop: 8 }}>
        {ar ? '~١٥ ثانية' : '~15 seconds'}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AnalysisPage({ params }: { params: { sym: string } }) {
  const sym = params.sym.toUpperCase()
  const { lang } = useApp()
  const ar = lang === 'ar'

  const [co,       setCo]       = useState<CoMeta | null>(null)
  const [live,     setLive]     = useState<{ close: number; pct: number } | null>(null)
  const [analysis, setAnalysis] = useState<{ en: AnalysisData; ar: AnalysisData; generated_at: string } | null>(null)
  const [phase,    setPhase]    = useState<'booting' | 'generating' | 'done' | 'error'>('booting')
  const [errMsg,   setErrMsg]   = useState('')

  // Load company meta + live price
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

  // Auto-fetch cache, then auto-generate if missing
  const loadOrGenerate = useCallback(async (forceRegen = false) => {
    if (!forceRegen) {
      // 1. Try cache first
      try {
        const res = await fetch(`/api/analysis/${sym}`)
        if (res.ok) {
          const data = await res.json()
          setAnalysis(data)
          setPhase('done')
          return
        }
      } catch (_) { /* fall through to generate */ }
    }

    // 2. Generate
    setPhase('generating')
    setErrMsg('')
    try {
      const res = await fetch(`/api/analysis/${sym}`, { method: 'POST' })
      if (!res.ok) {
        const e = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        throw new Error(e.error ?? 'Generation failed')
      }
      const data = await res.json()
      setAnalysis(data)
      setPhase('done')
    } catch (e: any) {
      setErrMsg(e.message ?? 'Unknown error')
      setPhase('error')
    }
  }, [sym])

  useEffect(() => { loadOrGenerate() }, [loadOrGenerate])

  const content    = analysis ? (ar ? analysis.ar : analysis.en) : null
  const secColor   = SECTOR_COLORS[co?.sec ?? ''] ?? 'var(--brand)'
  const secLabel   = SECTORS.find(s => s.id === co?.sec)
  const price      = live?.close ?? 0
  const pct        = live?.pct ?? 0
  const up         = pct >= 0
  const genDate    = analysis?.generated_at
    ? new Date(analysis.generated_at).toLocaleDateString(ar ? 'ar-IQ' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : ''

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 24px 80px' }}>

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28, fontSize: 13, color: 'var(--ink4)' }}>
        <Link href="/analysis" style={{ color: 'var(--brand)', fontWeight: 600 }}>
          {ar ? 'التحليلات' : 'Analysis'}
        </Link>
        <span>/</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--ink)' }}>{sym}</span>
      </div>

      {/* Company header */}
      {co && (
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <CoLogo sym={co.sym} logo={co.logo} color={secColor} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 900, color: 'var(--ink)' }}>{sym}</span>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 6,
                  background: secColor + '18', color: secColor, border: `1px solid ${secColor}30`,
                }}>
                  {ar ? (secLabel?.ar ?? co.sec) : (secLabel?.en ?? co.sec)}
                </span>
              </div>
              <div style={{ fontSize: 15, color: 'var(--ink3)', marginBottom: 6 }}>
                {ar ? co.ar : co.en}
              </div>
              {price > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 800 }}>{price.toFixed(3)}</span>
                  <span style={{ fontSize: 13, color: 'var(--ink4)' }}>IQD</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: up ? 'var(--up)' : 'var(--dn)' }}>
                    {up ? '▲' : '▼'} {Math.abs(pct).toFixed(2)}%
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Refresh — only shown when analysis is loaded */}
          {phase === 'done' && (
            <button onClick={() => loadOrGenerate(true)} style={{
              padding: '8px 16px', borderRadius: 9,
              background: 'none', border: '1px solid var(--line)',
              color: 'var(--ink4)', fontSize: 12, fontWeight: 700,
              fontFamily: 'inherit', cursor: 'pointer', flexShrink: 0,
              transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--brand)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--brand)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--line)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--ink4)' }}
            >
              ↻ {ar ? 'تحديث' : 'Refresh'}
            </button>
          )}
        </div>
      )}

      <div style={{ height: 1, background: 'var(--line)', marginBottom: 28 }} />

      {/* ── States ── */}
      {(phase === 'booting') && <AnalysisSkeleton />}
      {phase === 'generating' && <Generating ar={ar} />}

      {phase === 'error' && (() => {
        const isQuota = errMsg.includes('429') || errMsg.toLowerCase().includes('quota')
        return (
          <div style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ fontSize: 32, marginBottom: 16 }}>{isQuota ? '⚡' : '❌'}</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)', marginBottom: 8 }}>
              {isQuota
                ? (ar ? 'تم تجاوز حصة الذكاء الاصطناعي مؤقتاً' : 'AI quota temporarily reached')
                : (ar ? 'فشل توليد التحليل' : 'Analysis generation failed')}
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink4)', marginBottom: 24, lineHeight: 1.7, maxWidth: 360, margin: '0 auto 24px' }}>
              {isQuota
                ? (ar
                    ? 'جارٍ استنفاد حصة Gemini AI مؤقتاً. يرجى المحاولة مرة أخرى بعد قليل.'
                    : 'Gemini AI quota is temporarily exhausted. Please try again in a few minutes.')
                : (ar ? 'حدث خطأ أثناء التوليد. يرجى المحاولة مجدداً.' : 'Something went wrong. Please try again.')}
            </div>
            <button onClick={() => loadOrGenerate(true)} style={{
              padding: '10px 28px', borderRadius: 10, background: 'var(--brand)',
              border: 'none', color: '#fff', fontWeight: 700, fontSize: 13,
              fontFamily: 'inherit', cursor: 'pointer',
            }}>
              {ar ? 'إعادة المحاولة' : 'Try Again'}
            </button>
          </div>
        )
      })()}

      {/* ── Analysis ── */}
      {phase === 'done' && content && (
        <div>
          {/* AI badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 22, fontSize: 12, color: 'var(--ink4)' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: 'rgba(79,107,255,0.1)', border: '1px solid rgba(79,107,255,0.22)',
              borderRadius: 6, padding: '3px 9px', fontSize: 11, fontWeight: 700, color: 'var(--brand)',
            }}>
              ✦ Groq · LLaMA 3.3
            </span>
            <span>·</span>
            <span>{ar ? 'تم التوليد في' : 'Generated'} {genDate}</span>
          </div>

          {/* Summary */}
          <p style={{ fontSize: 16, lineHeight: 1.9, color: 'var(--ink2)', margin: '0 0 34px', fontWeight: 400 }}>
            {content.summary}
          </p>

          {/* Bull / Bear */}
          <div style={{ display: 'flex', gap: 14, marginBottom: 30, flexWrap: 'wrap' }}>
            <CaseCard type="bull" points={content.bullCase} lang={lang} />
            <CaseCard type="bear" points={content.bearCase} lang={lang} />
          </div>

          {/* Themes */}
          {(content.themes?.length ?? 0) > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                {ar ? 'المحاور الرئيسية' : 'Key Themes'}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {content.themes.map((t, i) => (
                  <span key={i} style={{
                    padding: '5px 14px', borderRadius: 999,
                    background: 'var(--surf2)', border: '1px solid var(--line)',
                    fontSize: 12, fontWeight: 600, color: 'var(--ink3)',
                  }}>{t}</span>
                ))}
              </div>
            </div>
          )}

          {/* Outlook */}
          {content.outlook && (
            <div style={{
              padding: '18px 20px', borderRadius: 14,
              background: 'var(--surf)', border: '1px solid var(--line)', marginBottom: 28,
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                {ar ? 'التوقعات' : 'Outlook'}
              </div>
              <p style={{ fontSize: 14, color: 'var(--ink2)', margin: 0, lineHeight: 1.8 }}>
                {content.outlook}
              </p>
            </div>
          )}

          {/* Metrics */}
          {co && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 28 }}>
              {[
                { label: ar ? 'السعر' : 'Price',         value: price > 0 ? price.toFixed(3) + ' IQD' : '—', mono: true },
                { label: ar ? 'القيمة السوقية' : 'Mkt Cap', value: co.mcap >= 1000 ? (co.mcap / 1000).toFixed(1) + (ar ? ' م.د' : 'B IQD') : co.mcap + (ar ? ' م.د' : 'M IQD'), mono: true },
                { label: ar ? 'القطاع' : 'Sector',       value: ar ? (secLabel?.ar ?? co.sec) : (secLabel?.en ?? co.sec), mono: false },
                { label: ar ? 'الرمز' : 'Ticker',        value: co.sym, mono: true },
              ].map(m => (
                <div key={m.label} style={{ padding: '13px 15px', borderRadius: 12, background: 'var(--surf)', border: '1px solid var(--line)' }}>
                  <div style={{ fontSize: 10, color: 'var(--ink5)', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{m.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink)', fontFamily: m.mono ? 'var(--font-mono)' : 'inherit' }}>{m.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Disclaimer */}
          <div style={{
            padding: '12px 16px', borderRadius: 10,
            background: 'rgba(245,200,75,0.05)', border: '1px solid rgba(245,200,75,0.15)',
            fontSize: 11.5, color: 'var(--ink5)', lineHeight: 1.7,
          }}>
            ⚠ {ar
              ? 'هذا التحليل مُولَّد بالذكاء الاصطناعي (Groq · LLaMA 3.3) استناداً إلى بيانات السوق المتاحة. ليس نصيحة استثمارية.'
              : 'AI-generated (Groq · LLaMA 3.3 70B) based on available market data and training knowledge. Not investment advice.'}
          </div>
        </div>
      )}
    </div>
  )
}
