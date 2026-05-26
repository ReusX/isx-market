'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useApp } from '@/context/AppContext'
import { useQuestTrack } from '@/lib/useQuestTrack'
import { fetchLive, fetchCompanyMeta, mergeCompanies, filterSort, fmtVol, fmtMcap, SECTORS, SORT_OPTIONS } from '@/lib/market'
import type { Company } from '@/types'

function CoLogo({ sym, logo, color }: { sym: string; logo?: string; color?: string }) {
  const [err, setErr] = useState(false)
  if (logo && !err) return (
    <img src={logo} alt={sym}
      width={28} height={28}
      style={{ borderRadius: 6, objectFit: 'contain', background: '#fff', padding: 2 }}
      onError={() => setErr(true)} />
  )
  return (
    <div style={{
      width: 28, height: 28, borderRadius: 6, flexShrink: 0,
      background: color || 'var(--brand)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 9, fontWeight: 800, color: '#fff',
    }}>{sym.slice(0, 3)}</div>
  )
}

export default function MarketPage() {
  const { lang, watchlist, toggleWatchlist } = useApp()
  useQuestTrack('market_visit')
  const ar = lang === 'ar'
  const router = useRouter()

  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading]     = useState(true)
  const [sector, setSector]       = useState('all')
  const [sort, setSort]           = useState('default')
  const [query, setQuery]         = useState('')

  useEffect(() => {
    Promise.all([fetchLive(), fetchCompanyMeta()])
      .then(([live, meta]) => setCompanies(mergeCompanies(meta, live.stocks)))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    let list = filterSort(companies, sector, sort, watchlist)
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter(c =>
        c.sym.toLowerCase().includes(q) ||
        c.en.toLowerCase().includes(q) ||
        c.ar.includes(q)
      )
    }
    return list
  }, [companies, sector, sort, watchlist, query])

  const colHdr: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, color: 'var(--ink4)',
    textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0 6px',
  }
  const grid = '28px 1fr 90px 80px 70px 80px 80px 80px'

  return (
    <div style={{ maxWidth: 1440, margin: '0 auto', padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 4px' }}>
          {ar ? 'السوق' : 'Market'}
        </h1>
        <p style={{ fontSize: 13, color: 'var(--ink3)', margin: 0 }}>
          {ar ? 'بورصة العراق للأوراق المالية — جميع الأسهم المدرجة' : 'Iraq Stock Exchange — all listed companies'}
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text" value={query} onChange={e => setQuery(e.target.value)}
            placeholder={ar ? 'بحث...' : 'Search...'}
            style={{
              padding: '7px 12px', borderRadius: 8, border: '1px solid var(--line)',
              background: 'var(--surf)', color: 'var(--ink)', fontSize: 13,
              fontFamily: 'inherit', outline: 'none', width: 200,
            }}
          />
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {SECTORS.map(s => (
              <button key={s.id} onClick={() => setSector(s.id)} style={{
                padding: '5px 11px', borderRadius: 999, border: 'none',
                background: sector === s.id ? 'var(--brand)' : 'var(--surf)',
                color: sector === s.id ? '#fff' : 'var(--ink3)',
                fontSize: 11, fontWeight: 700, fontFamily: 'inherit',
              }}>
                {ar ? s.ar : s.en}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 5 }}>
          {SORT_OPTIONS.map(s => (
            <button key={s.id} onClick={() => setSort(s.id)} style={{
              padding: '4px 10px', borderRadius: 999,
              border: `1px solid ${sort === s.id ? 'var(--brand)' : 'var(--line)'}`,
              background: 'none',
              color: sort === s.id ? 'var(--brand)' : 'var(--ink4)',
              fontSize: 11, fontWeight: 600, fontFamily: 'inherit',
            }}>
              {ar ? s.ar : s.en}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: grid, padding: '10px 16px', borderBottom: '1px solid var(--line)', alignItems: 'center' }}>
          <span style={colHdr}>#</span>
          <span style={colHdr}>{ar ? 'الشركة' : 'Company'}</span>
          <span style={{ ...colHdr, textAlign: 'end' }}>{ar ? 'السعر' : 'Price'}</span>
          <span style={{ ...colHdr, textAlign: 'end' }}>{ar ? 'التغيير' : 'Chg%'}</span>
          <span style={{ ...colHdr, textAlign: 'end' }}>{ar ? 'فتح' : 'Open'}</span>
          <span style={{ ...colHdr, textAlign: 'end' }}>{ar ? 'الحجم' : 'Volume'}</span>
          <span style={{ ...colHdr, textAlign: 'end' }}>{ar ? 'القيمة السوقية' : 'Mkt Cap'}</span>
          <span style={{ ...colHdr, textAlign: 'end' }}>{ar ? 'القطاع' : 'Sector'}</span>
        </div>

        {loading && Array.from({ length: 12 }).map((_, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: grid, padding: '12px 16px', borderBottom: '1px solid var(--line)', alignItems: 'center', gap: 8 }}>
            <div className="skeleton" style={{ height: 10, width: 14, borderRadius: 4 }} />
            <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
              <div className="skeleton" style={{ width: 28, height: 28, borderRadius: 6 }} />
              <div className="skeleton" style={{ height: 10, width: 100 }} />
            </div>
            {[80, 70, 60, 60, 70, 60].map((w, j) => (
              <div key={j} className="skeleton" style={{ height: 10, width: w, borderRadius: 4, justifySelf: 'end' }} />
            ))}
          </div>
        ))}

        {!loading && filtered.map((co, i) => {
          const up = co.pct >= 0
          const inWL = watchlist.includes(co.sym)
          return (
            <div key={co.sym}
              style={{ display: 'grid', gridTemplateColumns: grid, padding: '10px 16px', borderBottom: '1px solid var(--line)', alignItems: 'center', cursor: 'pointer', transition: 'background 0.12s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surf2)')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}
              onClick={() => router.push(`/c/${co.sym}`)}
            >
              <span style={{ fontSize: 10, color: 'var(--ink4)', fontFamily: 'var(--font-mono)' }}>{i + 1}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <CoLogo sym={co.sym} logo={co.logo} color={co.color} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{ar ? co.ar : co.en}</div>
                  <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                    <span style={{ fontSize: 10, color: 'var(--ink4)', fontFamily: 'var(--font-mono)' }}>{co.sym}</span>
                    <button onClick={e => { e.stopPropagation(); toggleWatchlist(co.sym) }}
                      style={{ background: 'none', border: 'none', padding: 0, fontSize: 9, color: inWL ? 'var(--gold)' : 'var(--ink4)', cursor: 'pointer' }}>★</button>
                  </div>
                </div>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, textAlign: 'end' }}>{co.close.toFixed(3)}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: up ? 'var(--up)' : 'var(--dn)', textAlign: 'end' }}>
                {up ? '+' : ''}{co.pct.toFixed(2)}%
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink3)', textAlign: 'end' }}>{co.open.toFixed(3)}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink3)', textAlign: 'end' }}>{fmtVol(co.vol)}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink3)', textAlign: 'end' }}>{fmtMcap(co.mcap)}</span>
              <span style={{ fontSize: 10, color: 'var(--ink4)', textAlign: 'end' }}>{co.sec}</span>
            </div>
          )
        })}

        {!loading && filtered.length === 0 && (
          <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--ink4)', fontSize: 13 }}>
            {ar ? 'لا توجد نتائج' : 'No results'}
          </div>
        )}
      </div>

      <p style={{ fontSize: 11, color: 'var(--ink4)', marginTop: 12, textAlign: 'center' }}>
        {ar ? 'البيانات مُحدَّثة كل 30 دقيقة خلال ساعات التداول' : 'Data updated every 30 min during trading hours'}
      </p>
    </div>
  )
}
