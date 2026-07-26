'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { useApp } from '@/context/AppContext'
import { SECTORS, fetchLive, fetchCompanyMeta, mergeCompanies, liveMcap, fmtMcap } from '@/lib/market'
import type { Company } from '@/types'

const SECTOR_COLORS: Record<string, string> = {
  BANK: '#3B82F6', IND: '#EF4444', SVC: '#22C55E',
  HTL: '#C8973D', TEL: '#EC4899', AGR: '#10B981',
  INS: '#F59E0B', INV: '#8B5CF6',
}

export default function AnalysisListPage() {
  const { lang } = useApp()
  const ar = lang === 'ar'

  const [companies, setCompanies] = useState<Company[]>([])
  const [search,    setSearch]    = useState('')
  const [sector,    setSector]    = useState('all')

  useEffect(() => {
    // Merged with live prices so the market cap here is close x shares, the
    // same figure every other page shows — the static one on the meta is a
    // frozen snapshot.
    Promise.all([fetchLive(), fetchCompanyMeta()])
      .then(([live, meta]) => {
        // only show companies with actual names
        setCompanies(mergeCompanies(meta, live.stocks).filter(c => c.en && c.ar))
      })
      .catch(() => setCompanies([]))
  }, [])

  const display = useMemo(() => {
    let out = companies
    if (sector !== 'all') out = out.filter(c => c.sec === sector)
    if (search.trim()) {
      const q = search.toLowerCase()
      out = out.filter(c =>
        c.sym.toLowerCase().includes(q) ||
        c.en.toLowerCase().includes(q) ||
        c.ar.includes(search),
      )
    }
    return out
  }, [companies, sector, search])

  return (
    <div className="terminal-shell app-page">

      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <h1 style={{ fontSize: 30, fontWeight: 900, margin: '0 0 10px', color: 'var(--ink)', lineHeight: 1.2 }}>
          {ar ? 'تحليل شركات البورصة' : 'ISX Company Analysis'}
        </h1>
        <p style={{ fontSize: 15, color: 'var(--ink3)', margin: 0, lineHeight: 1.6 }}>
          {ar
            ? 'تحليلات استثمارية بناءً على التقارير المالية الرسمية · الحالات الإيجابية والسلبية، محركات السوق، والتوقعات المستقبلية.'
            : 'Investment analysis based on official ISC filings · bull & bear cases, key themes, and forward outlook.'}
        </p>
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder={ar ? 'ابحث بالاسم أو الرمز...' : 'Search by name or ticker...'}
        style={{
          width: '100%', padding: '11px 16px', borderRadius: 10,
          background: 'var(--surf)', border: '1px solid var(--line)',
          color: 'var(--ink)', fontSize: 14, outline: 'none',
          marginBottom: 16, boxSizing: 'border-box',
          fontFamily: 'inherit',
        }}
      />

      {/* Sector filter */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 28 }}>
        {SECTORS.map(s => (
          <button key={s.id} onClick={() => setSector(s.id)} style={{
            padding: '5px 14px', borderRadius: 999,
            background: sector === s.id ? 'var(--brand)' : 'var(--surf)',
            border: `1px solid ${sector === s.id ? 'var(--brand)' : 'var(--line)'}`,
            color: sector === s.id ? '#fff' : 'var(--ink3)',
            fontSize: 12, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
          }}>
            {ar ? s.ar : s.en}
          </button>
        ))}
      </div>

      {/* Company list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {display.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--ink4)', fontSize: 13 }}>
            {ar ? 'لا نتائج' : 'No results'}
          </div>
        ) : display.map(co => {
          const secColor = SECTOR_COLORS[co.sec] ?? 'var(--ink4)'
          const secLabel = SECTORS.find(s => s.id === co.sec)

          return (
            <Link key={co.sym} href={`/analysis/${co.sym}`} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 16,
                padding: '14px 18px', borderRadius: 12,
                background: 'var(--surf)', border: '1px solid var(--line)',
                transition: 'border-color 0.15s, background 0.15s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--brand)'
                ;(e.currentTarget as HTMLDivElement).style.background = 'var(--surf2)'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--line)'
                ;(e.currentTarget as HTMLDivElement).style.background = 'var(--surf)'
              }}
              >
                {/* Ticker chip */}
                <div style={{
                  minWidth: 52, padding: '4px 8px', borderRadius: 7, textAlign: 'center',
                  background: secColor + '18', border: `1px solid ${secColor}33`,
                  fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 800, color: secColor,
                  flexShrink: 0,
                }}>
                  {co.sym}
                </div>

                {/* Name */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {ar ? co.ar : co.en}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink4)', marginTop: 2 }}>
                    {ar ? (secLabel?.ar ?? co.sec) : (secLabel?.en ?? co.sec)}
                  </div>
                </div>

                {/* Market cap */}
                <div style={{ fontSize: 12, color: 'var(--ink4)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                  {/* fmtMcap takes millions and picks its own M/B/T suffix —
                      the previous label said "م.د" for both millions and
                      billions. */}
                  <bdi>{fmtMcap(liveMcap(co) / 1e6)} IQD</bdi>
                </div>

                {/* Arrow */}
                <div style={{ color: 'var(--brand)', fontSize: 16, flexShrink: 0 }}>→</div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Count */}
      {display.length > 0 && (
        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--ink5)' }}>
          {ar ? `${display.length} شركة` : `${display.length} companies`}
        </div>
      )}
    </div>
  )
}
