'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useApp } from '@/context/AppContext'
import { SECTORS } from '@/lib/market'

// ── Types ─────────────────────────────────────────────────────────────────────
interface AnalysisPoint { title: string; body: string }

interface AnalysisData {
  summary:   string
  bullCase:  AnalysisPoint[]
  bearCase:  AnalysisPoint[]
  themes:    string[]
  outlook:   string
}

interface CoMeta {
  sym: string; en: string; ar: string
  sec: string; logo: string; color: string; mcap: number
}

interface LiveStock {
  code: string; close: number; pct: number; change: number; open: number; high: number; low: number
}

// ── Sector map ─────────────────────────────────────────────────────────────
const SECTOR_COLORS: Record<string, string> = {
  BANK: '#3B82F6', IND: '#EF4444', SVC: '#22C55E',
  HTL: '#C8973D', TEL: '#EC4899', AGR: '#10B981',
  INS: '#F59E0B', INV: '#8B5CF6',
}

// ── Company logo ───────────────────────────────────────────────────────────
function CoLogo({ sym, logo, color }: { sym: string; logo: string; color: string }) {
  const [err, setErr] = useState(false)
  if (logo && !err) return (
    <img src={logo} alt={sym} width={48} height={48}
      style={{ borderRadius: 12, objectFit: 'contain', background: '#fff', padding: 4 }}
      onError={() => setErr(true)} />
  )
  return (
    <div style={{
      width: 48, height: 48, borderRadius: 12, flexShrink: 0,
      background: color + '22', border: `1.5px solid ${color}44`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 800, color,
    }}>
      {sym.slice(0, 4)}
    </div>
  )
}

// ── Bull / Bear card ───────────────────────────────────────────────────────
function CaseCard({
  type, points, lang,
}: { type: 'bull' | 'bear'; points: AnalysisPoint[]; lang: 'en' | 'ar' }) {
  const isBull = type === 'bull'
  const ar = lang === 'ar'
  const accent = isBull ? '#22C55E' : '#EF4444'
  const bg     = isBull ? 'rgba(34,197,94,0.06)'  : 'rgba(239,68,68,0.06)'
  const border = isBull ? 'rgba(34,197,94,0.2)'   : 'rgba(239,68,68,0.2)'

  return (
    <div style={{
      background: bg, border: `1px solid ${border}`,
      borderRadius: 18, padding: '26px 24px', flex: 1, minWidth: 0,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        marginBottom: 24, paddingBottom: 16,
        borderBottom: `1px solid ${border}`,
      }}>
        <span style={{ fontSize: 22 }}>{isBull ? '🐂' : '🐻'}</span>
        <span style={{ fontSize: 17, fontWeight: 900, color: accent }}>
          {isBull
            ? (ar ? 'الحالة الإيجابية' : 'Bull Case')
            : (ar ? 'الحالة السلبية'   : 'Bear Case')}
        </span>
      </div>

      {/* Points */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {points.map((p, i) => (
          <div key={i}>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink)', marginBottom: 6 }}>
              {p.title}
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--ink3)', lineHeight: 1.75 }}>
              {p.body}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Loading skeleton ───────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {[80, 60, 100, 60, 40].map((w, i) => (
        <div key={i} className="skeleton" style={{ height: 18, width: `${w}%`, borderRadius: 6 }} />
      ))}
      <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
        <div className="skeleton" style={{ flex: 1, height: 220, borderRadius: 16 }} />
        <div className="skeleton" style={{ flex: 1, height: 220, borderRadius: 16 }} />
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────
export default function AnalysisPage({ params }: { params: { sym: string } }) {
  const sym = params.sym.toUpperCase()
  const { lang } = useApp()
  const ar = lang === 'ar'

  const [co,          setCo]          = useState<CoMeta | null>(null)
  const [live,        setLive]        = useState<LiveStock | null>(null)
  const [analysis,    setAnalysis]    = useState<{ en: AnalysisData; ar: AnalysisData; generated_at: string } | null>(null)
  const [status,      setStatus]      = useState<'idle' | 'loading' | 'generating' | 'done' | 'error'>('idle')
  const [errMsg,      setErrMsg]      = useState('')

  // ── Fetch company meta + live price ─────────────────────────────────────
  useEffect(() => {
    Promise.all([
      fetch('/data/companies.json').then(r => r.json()),
      fetch('/data/live.json').then(r => r.json()).catch(() => null),
    ]).then(([companies, liveData]) => {
      const found = (companies as CoMeta[]).find(c => c.sym === sym)
      setCo(found ?? null)
      if (liveData?.stocks) {
        const st = liveData.stocks.find((s: LiveStock) => s.code === sym)
        if (st) setLive(st)
      }
    })
  }, [sym])

  // ── Fetch cached analysis ────────────────────────────────────────────────
  const fetchCached = useCallback(() => {
    setStatus('loading')
    fetch(`/api/analysis/${sym}`)
      .then(async r => {
        if (r.ok) {
          const data = await r.json()
          setAnalysis(data)
          setStatus('done')
        } else {
          setStatus('idle') // no cache → show generate button
        }
      })
      .catch(() => setStatus('idle'))
  }, [sym])

  useEffect(() => { fetchCached() }, [fetchCached])

  // ── Generate analysis ────────────────────────────────────────────────────
  async function generate() {
    setStatus('generating')
    setErrMsg('')
    try {
      const res = await fetch(`/api/analysis/${sym}`, { method: 'POST' })
      if (!res.ok) {
        const e = await res.json()
        throw new Error(e.error ?? 'Generation failed')
      }
      const data = await res.json()
      setAnalysis(data)
      setStatus('done')
    } catch (e: any) {
      setErrMsg(e.message ?? 'Unknown error')
      setStatus('error')
    }
  }

  const content: AnalysisData | null = analysis ? (ar ? analysis.ar : analysis.en) : null
  const secColor = SECTOR_COLORS[co?.sec ?? ''] ?? 'var(--brand)'
  const secLabel = SECTORS.find(s => s.id === co?.sec)
  const price    = live?.close ?? 0
  const pct      = live?.pct   ?? 0
  const up       = pct >= 0

  const genDate = analysis?.generated_at
    ? new Date(analysis.generated_at).toLocaleDateString(ar ? 'ar-IQ' : 'en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
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
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          gap: 16, marginBottom: 24, flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <CoLogo sym={co.sym} logo={co.logo} color={secColor} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 900, color: 'var(--ink)',
                }}>{sym}</span>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                  background: secColor + '20', color: secColor, border: `1px solid ${secColor}33`,
                }}>
                  {ar ? (secLabel?.ar ?? co.sec) : (secLabel?.en ?? co.sec)}
                </span>
              </div>
              <div style={{ fontSize: 15, color: 'var(--ink3)', marginBottom: 6 }}>
                {ar ? co.ar : co.en}
              </div>
              {price > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 800 }}>
                    {price.toFixed(3)}
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--ink4)' }}>IQD</span>
                  <span style={{
                    fontSize: 13, fontWeight: 700,
                    color: up ? 'var(--up)' : 'var(--dn)',
                  }}>
                    {up ? '▲' : '▼'} {Math.abs(pct).toFixed(2)}%
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Refresh button (when analysis exists) */}
          {status === 'done' && (
            <button onClick={generate} style={{
              padding: '8px 16px', borderRadius: 9,
              background: 'var(--surf)', border: '1px solid var(--line)',
              color: 'var(--ink3)', fontSize: 12, fontWeight: 700,
              fontFamily: 'inherit', cursor: 'pointer', flexShrink: 0,
            }}>
              ↻ {ar ? 'تحديث التحليل' : 'Refresh Analysis'}
            </button>
          )}
        </div>
      )}

      <div style={{ height: 1, background: 'var(--line)', marginBottom: 28 }} />

      {/* ── States ── */}

      {/* Idle: no analysis yet */}
      {status === 'idle' && (
        <div style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✦</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink)', marginBottom: 8 }}>
            {ar ? 'لا يوجد تحليل بعد' : 'No analysis yet'}
          </div>
          <div style={{ fontSize: 14, color: 'var(--ink3)', marginBottom: 28, lineHeight: 1.6 }}>
            {ar
              ? 'انقر لتوليد تحليل استثماري شامل بالذكاء الاصطناعي يشمل الحالة الإيجابية والسلبية والتوقعات المستقبلية.'
              : 'Click to generate a comprehensive AI-powered investment analysis with bull & bear cases and forward outlook.'}
          </div>
          <button onClick={generate} style={{
            padding: '13px 32px', borderRadius: 12,
            background: 'var(--brand)', border: 'none',
            color: '#fff', fontSize: 15, fontWeight: 800,
            fontFamily: 'inherit', cursor: 'pointer',
          }}>
            ✦ {ar ? 'توليد التحليل' : 'Generate Analysis'}
          </button>
        </div>
      )}

      {/* Loading: fetching cache */}
      {status === 'loading' && (
        <div style={{ padding: '20px 0' }}>
          <Skeleton />
        </div>
      )}

      {/* Generating */}
      {status === 'generating' && (
        <div style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            border: '3px solid var(--brand)', borderTopColor: 'transparent',
            animation: 'spin 0.8s linear infinite', margin: '0 auto 20px',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
            {ar ? 'جارٍ توليد التحليل...' : 'Generating analysis...'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink4)' }}>
            {ar ? 'قد يستغرق 10-20 ثانية' : 'This may take 10–20 seconds'}
          </div>
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div style={{ textAlign: 'center', padding: '40px 24px' }}>
          <div style={{ color: 'var(--dn)', fontSize: 15, marginBottom: 16 }}>
            ❌ {ar ? 'فشل التوليد' : 'Generation failed'}: {errMsg}
          </div>
          <button onClick={generate} style={{
            padding: '10px 24px', borderRadius: 10, background: 'var(--brand)', border: 'none',
            color: '#fff', fontWeight: 700, fontSize: 13, fontFamily: 'inherit', cursor: 'pointer',
          }}>
            {ar ? 'إعادة المحاولة' : 'Try Again'}
          </button>
        </div>
      )}

      {/* ── Analysis content ── */}
      {status === 'done' && content && (
        <div>

          {/* AI badge + timestamp */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24,
            fontSize: 12, color: 'var(--ink4)',
          }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: 'rgba(79,107,255,0.12)', border: '1px solid rgba(79,107,255,0.25)',
              borderRadius: 6, padding: '3px 9px',
              fontSize: 11, fontWeight: 700, color: 'var(--brand)',
            }}>
              ✦ {ar ? 'AI — Gemini' : 'AI — Gemini'}
            </span>
            <span>·</span>
            <span>{ar ? 'تم التوليد في' : 'Generated'} {genDate}</span>
          </div>

          {/* Summary */}
          <p style={{
            fontSize: 16.5, lineHeight: 1.85, color: 'var(--ink2)',
            margin: '0 0 36px', fontWeight: 400,
          }}>
            {content.summary}
          </p>

          {/* Bull / Bear cases */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 32, flexWrap: 'wrap' }}>
            <CaseCard type="bull" points={content.bullCase} lang={lang} />
            <CaseCard type="bear" points={content.bearCase} lang={lang} />
          </div>

          {/* Key themes */}
          {content.themes?.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <div style={{
                fontSize: 11, fontWeight: 700, color: 'var(--ink4)',
                textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12,
              }}>
                {ar ? 'المحاور الرئيسية' : 'Key Themes'}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {content.themes.map((t, i) => (
                  <span key={i} style={{
                    padding: '5px 13px', borderRadius: 999,
                    background: 'var(--surf2)', border: '1px solid var(--line)',
                    fontSize: 12, fontWeight: 600, color: 'var(--ink3)',
                  }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Outlook */}
          {content.outlook && (
            <div style={{
              padding: '20px 22px', borderRadius: 14,
              background: 'var(--surf)', border: '1px solid var(--line)',
              marginBottom: 32,
            }}>
              <div style={{
                fontSize: 11, fontWeight: 700, color: 'var(--ink4)',
                textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10,
              }}>
                {ar ? 'التوقعات' : 'Outlook'}
              </div>
              <p style={{ fontSize: 14.5, color: 'var(--ink2)', margin: 0, lineHeight: 1.8 }}>
                {content.outlook}
              </p>
            </div>
          )}

          {/* Key metrics */}
          {co && (
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: 10, marginBottom: 32,
            }}>
              {[
                {
                  label: ar ? 'السعر' : 'Price',
                  value: price > 0 ? price.toFixed(3) + ' IQD' : '—',
                  mono: true,
                },
                {
                  label: ar ? 'القيمة السوقية' : 'Market Cap',
                  value: co.mcap >= 1000
                    ? (co.mcap / 1000).toFixed(1) + (ar ? ' م.د' : 'B IQD')
                    : co.mcap + (ar ? ' م.د' : 'M IQD'),
                  mono: true,
                },
                {
                  label: ar ? 'القطاع' : 'Sector',
                  value: ar ? (secLabel?.ar ?? co.sec) : (secLabel?.en ?? co.sec),
                  mono: false,
                },
                {
                  label: ar ? 'الرمز' : 'Ticker',
                  value: co.sym,
                  mono: true,
                },
              ].map(m => (
                <div key={m.label} style={{
                  padding: '14px 16px', borderRadius: 12,
                  background: 'var(--surf)', border: '1px solid var(--line)',
                }}>
                  <div style={{ fontSize: 10, color: 'var(--ink5)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {m.label}
                  </div>
                  <div style={{
                    fontSize: 14, fontWeight: 800, color: 'var(--ink)',
                    fontFamily: m.mono ? 'var(--font-mono)' : 'inherit',
                  }}>
                    {m.value}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Disclaimer */}
          <div style={{
            padding: '14px 18px', borderRadius: 12,
            background: 'rgba(245,200,75,0.06)', border: '1px solid rgba(245,200,75,0.18)',
            fontSize: 12, color: 'var(--ink4)', lineHeight: 1.7,
          }}>
            ⚠ {ar
              ? 'هذا التحليل مُولَّد بالذكاء الاصطناعي (Gemini AI) استناداً إلى بيانات السوق المتاحة. ليس نصيحة استثمارية.'
              : 'This analysis is AI-generated (Gemini AI) based on available market data. Not investment advice.'}
          </div>

        </div>
      )}
    </div>
  )
}
