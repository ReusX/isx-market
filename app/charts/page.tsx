'use client'

import { useEffect, useState } from 'react'
import { useApp } from '@/context/AppContext'
import { fetchLive, fetchCompanyMeta, mergeCompanies } from '@/lib/market'
import type { Company } from '@/types'

const TF = ['1D','1W','1M','3M','1Y','5Y'] as const

function MiniChart({ pct, width = 120, height = 50 }: { pct: number; width?: number; height?: number }) {
  const up = pct >= 0
  const pts = Array.from({ length: 20 }, (_, i) => {
    const n = Math.sin(i * 0.8) * 10 + Math.sin(i * 1.7) * 5
    return height * 0.15 + (height * 0.7 / 20) * (up ? 20 - i : i) + n * 0.5
  })
  const clamp = pts.map(v => Math.max(2, Math.min(height - 2, v)))
  const poly = clamp.map((v, i) => `${(i / 19) * width},${v}`).join(' ')
  const fill = clamp.map((v, i) => `${(i / 19) * width},${v}`).concat([`${width},${height}`, `0,${height}`]).join(' ')

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ width: '100%', height }}>
      <defs>
        <linearGradient id={`g${up}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={up ? '#22C55E' : '#EF4444'} stopOpacity="0.25" />
          <stop offset="100%" stopColor={up ? '#22C55E' : '#EF4444'} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={fill} fill={`url(#g${up})`} />
      <polyline points={poly} fill="none" stroke={up ? '#22C55E' : '#EF4444'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function RsisxChart({ pct }: { pct: number }) {
  return (
    <div style={{ background: 'var(--surf3)', borderRadius: 12, overflow: 'hidden', height: 100 }}>
      <MiniChart pct={pct} width={800} height={100} />
    </div>
  )
}

export default function ChartsPage() {
  const { lang, watchlist } = useApp()
  const ar = lang === 'ar'
  const [companies, setCompanies] = useState<Company[]>([])
  const [rsisxPct, setRsisxPct] = useState(0)
  const [rsisxVal, setRsisxVal] = useState('—')
  const [loading, setLoading] = useState(true)
  const [tf, setTf] = useState<string>('1M')
  const [selected, setSelected] = useState<string | null>(null)
  const [view, setView] = useState<'grid' | 'watchlist'>('grid')

  useEffect(() => {
    Promise.all([fetchLive(), fetchCompanyMeta()])
      .then(([live, meta]) => {
        setCompanies(mergeCompanies(meta, live.stocks))
        if (live.rsisx) {
          setRsisxPct(Number(live.rsisx.pct))
          setRsisxVal(Number(live.rsisx.close).toFixed(2))
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const display = view === 'watchlist'
    ? companies.filter(c => watchlist.includes(c.sym))
    : companies.filter(c => c.close > 0).slice(0, 48)

  const selCo = selected ? companies.find(c => c.sym === selected) : null

  return (
    <div style={{ maxWidth: 1440, margin: '0 auto', padding: '24px' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 4px' }}>
          {ar ? 'المخططات' : 'Charts'}
        </h1>
      </div>

      {/* RSISX chart */}
      <div style={{ background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 20, padding: '20px 24px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--ink4)', fontWeight: 600, marginBottom: 2 }}>
              {ar ? 'مؤشر ربيع RSISX' : 'Rabee RSISX Index'}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 800 }}>{rsisxVal}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: rsisxPct >= 0 ? 'var(--up)' : 'var(--dn)' }}>
                {rsisxPct >= 0 ? '▲' : '▼'} {Math.abs(rsisxPct).toFixed(2)}%
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {TF.map(t => (
              <button key={t} onClick={() => setTf(t)} style={{
                padding: '4px 10px', borderRadius: 6,
                background: tf === t ? 'var(--brand)' : 'none',
                border: `1px solid ${tf === t ? 'var(--brand)' : 'var(--line)'}`,
                color: tf === t ? '#fff' : 'var(--ink3)',
                fontSize: 11, fontWeight: 700, fontFamily: 'inherit',
              }}>{t}</button>
            ))}
          </div>
        </div>
        {!loading && <RsisxChart pct={rsisxPct} />}
        {loading && <div className="skeleton" style={{ height: 100, borderRadius: 12 }} />}
      </div>

      {/* Selected company expanded chart */}
      {selCo && (
        <div style={{ background: 'var(--surf)', border: '1px solid var(--brand)', borderRadius: 20, padding: '20px 24px', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16 }}>{ar ? selCo.ar : selCo.en}</div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700 }}>{selCo.close.toFixed(3)}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: selCo.pct >= 0 ? 'var(--up)' : 'var(--dn)' }}>
                  {selCo.pct >= 0 ? '+' : ''}{selCo.pct.toFixed(2)}%
                </span>
              </div>
            </div>
            <button onClick={() => setSelected(null)}
              style={{ background: 'none', border: '1px solid var(--line)', borderRadius: 8, padding: '5px 12px', color: 'var(--ink3)', fontFamily: 'inherit', fontSize: 12 }}>
              {ar ? 'إغلاق' : 'Close'}
            </button>
          </div>
          <div style={{ height: 180, background: 'var(--surf3)', borderRadius: 12, overflow: 'hidden' }}>
            <MiniChart pct={selCo.pct} width={800} height={180} />
          </div>
        </div>
      )}

      {/* View toggle */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {(['grid', 'watchlist'] as const).map(v => (
          <button key={v} onClick={() => setView(v)} style={{
            padding: '5px 14px', borderRadius: 999, border: 'none',
            background: view === v ? 'var(--brand)' : 'var(--surf)',
            color: view === v ? '#fff' : 'var(--ink3)',
            fontSize: 11, fontWeight: 700, fontFamily: 'inherit',
          }}>
            {v === 'grid' ? (ar ? 'الكل' : 'All') : (ar ? 'قائمة المراقبة' : 'Watchlist')}
          </button>
        ))}
      </div>

      {/* Company chart grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 120, borderRadius: 14 }} />
          ))}
        </div>
      ) : display.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--ink4)', fontSize: 13 }}>
          {ar ? 'قائمة المراقبة فارغة — أضف شركات من صفحة السوق' : 'Watchlist empty — add companies from the Market page'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
          {display.map(co => {
            const up = co.pct >= 0
            const isSel = selected === co.sym
            return (
              <div key={co.sym}
                onClick={() => setSelected(isSel ? null : co.sym)}
                style={{
                  background: isSel ? 'var(--brand-soft)' : 'var(--surf)',
                  border: `1px solid ${isSel ? 'var(--brand)' : 'var(--line)'}`,
                  borderRadius: 14, overflow: 'hidden', cursor: 'pointer',
                  transition: 'border-color 0.15s',
                }}
              >
                <div style={{ padding: '10px 12px 4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink2)' }}>{co.sym}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: up ? 'var(--up)' : 'var(--dn)', fontWeight: 700 }}>
                      {up ? '+' : ''}{co.pct.toFixed(2)}%
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--ink4)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {ar ? co.ar : co.en}
                  </div>
                </div>
                <MiniChart pct={co.pct} />
                <div style={{ padding: '4px 12px 10px', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700 }}>
                  {co.close.toFixed(3)}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
