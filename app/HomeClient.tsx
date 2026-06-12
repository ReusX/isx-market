'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useApp } from '@/context/AppContext'
import {
  fetchLive, fetchCompanyMeta, mergeCompanies,
  fmtVol, fmtMcap, SECTORS,
} from '@/lib/market'
import type { Company } from '@/types'

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmtPrice(v: number) { return v.toFixed(3) }

// ── ISX60 compact chart ───────────────────────────────────────────────────────
function ISX60Chart() {
  const ref    = useRef<HTMLDivElement>(null)
  const [val, setVal] = useState<string>('—')
  const [pct, setPct] = useState<number>(0)

  useEffect(() => {
    if (!ref.current) return
    let chart: any = null
    let ro: ResizeObserver | null = null

    ;(async () => {
      const LC = await import('lightweight-charts')
      const { createClient } = await import('@/lib/supabase/client')

      const { data: rows } = await createClient()
        .from('daily_index')
        .select('date,isx60')
        .not('isx60', 'is', null)
        .order('date')
        .gte('date', new Date(Date.now() - 365 * 86400 * 1000).toISOString().slice(0, 10))

      const data = (rows ?? []).map(r => ({ time: r.date as any, value: r.isx60 as number }))
      if (!data.length || !ref.current) return

      const last = data[data.length - 1].value
      const prev = data.length > 1 ? data[data.length - 2].value : last
      const dp   = prev ? ((last - prev) / prev) * 100 : 0
      setVal(last.toFixed(2))
      setPct(dp)
      const up = last >= data[0].value
      const color = up ? '#22C55E' : '#EF4444'

      chart = LC.createChart(ref.current, {
        width:  ref.current.clientWidth,
        height: ref.current.clientHeight,
        layout: { background: { color: 'transparent' }, textColor: 'transparent' },
        grid:   { vertLines: { visible: false }, horzLines: { visible: false } },
        crosshair: { mode: LC.CrosshairMode.Hidden ?? 0 },
        rightPriceScale: { visible: false },
        leftPriceScale:  { visible: false },
        timeScale: { visible: false },
        handleScroll: false,
        handleScale:  false,
      })

      const area = chart.addAreaSeries({
        lineColor:   color,
        topColor:    color + '30',
        bottomColor: color + '00',
        lineWidth:   2,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      })
      area.setData(data)
      chart.timeScale().fitContent()

      ro = new ResizeObserver(() => {
        if (chart && ref.current)
          chart.applyOptions({ width: ref.current.clientWidth, height: ref.current.clientHeight })
      })
      ro.observe(ref.current)
    })()

    return () => { ro?.disconnect(); chart?.remove() }
  }, [])

  const up = pct >= 0

  return (
    <div style={{
      flex: 1, display: 'flex', alignItems: 'stretch', gap: 0,
      background: 'var(--surf2)', border: '1px solid var(--line)',
      borderRadius: 8, overflow: 'hidden', minWidth: 0,
    }}>
      {/* Left: label + value */}
      <div style={{
        padding: '8px 14px', display: 'flex', flexDirection: 'column',
        justifyContent: 'center', gap: 2, flexShrink: 0,
        borderInlineEnd: '1px solid var(--line)',
      }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--ink4)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          مؤشر ISX60
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 800, color: 'var(--ink)', lineHeight: 1 }}>
          {val}
        </div>
        <div style={{
          fontSize: 11, fontWeight: 700,
          color: up ? 'var(--up)' : 'var(--dn)',
          display: 'flex', alignItems: 'center', gap: 2,
        }}>
          <svg width="7" height="7" viewBox="0 0 8 8" fill="currentColor">
            {up ? <polygon points="4,1 7,6 1,6" /> : <polygon points="4,7 7,2 1,2" />}
          </svg>
          {Math.abs(pct).toFixed(2)}%
        </div>
      </div>

      {/* Right: chart canvas */}
      <div ref={ref} style={{ flex: 1, minWidth: 0, minHeight: 70 }} />
    </div>
  )
}

// ── Company logo ─────────────────────────────────────────────────────────────
function CoLogo({ sym, logo, size = 26 }: { sym: string; logo?: string; size?: number }) {
  const [err, setErr] = useState(false)
  const src = !err ? (logo || `https://isc.gov.iq/Uploads/Companies/${sym}.png`) : null
  if (src) {
    return (
      <Image src={src} alt={sym} width={size} height={size} loading="lazy"
        sizes={`${size * 2}px`}
        style={{ borderRadius: 4, objectFit: 'contain', background: '#fff', padding: 1, flexShrink: 0 }}
        onError={() => setErr(true)}
      />
    )
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: 4, flexShrink: 0,
      background: 'var(--surf3)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 8, fontWeight: 800, color: 'var(--ink3)',
    }}>
      {sym.slice(0, 3)}
    </div>
  )
}

// ── Change badge ─────────────────────────────────────────────────────────────
function ChangeBadge({ val }: { val: number }) {
  const up = val >= 0
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 2,
      fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)',
      color: up ? 'var(--up)' : 'var(--dn)',
    }}>
      <svg width="7" height="7" viewBox="0 0 8 8" fill="currentColor">
        {up ? <polygon points="4,1 7,6 1,6" /> : <polygon points="4,7 7,2 1,2" />}
      </svg>
      {Math.abs(val).toFixed(2)}%
    </span>
  )
}

// ── Sortable column header ────────────────────────────────────────────────────
type SortKey = 'close' | 'pct' | 'mcap' | 'vol'

function SortTh({ label, col, sort, dir, onSort }: {
  label: string; col: SortKey; sort: SortKey | null; dir: 'asc' | 'desc';
  onSort: (col: SortKey) => void;
}) {
  const active = sort === col
  return (
    <th onClick={() => onSort(col)} style={{
      padding: '0 14px', height: 36, textAlign: 'end',
      fontSize: 11, fontWeight: 600,
      color: active ? 'var(--ink)' : 'var(--ink4)',
      cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap',
      background: 'var(--surf2)', borderBottom: '1px solid var(--line)',
      position: 'sticky', top: 0, zIndex: 1, transition: 'color 0.15s',
    }}>
      {label}
      {active && <span style={{ marginInlineStart: 3, fontSize: 9 }}>{dir === 'asc' ? '▲' : '▼'}</span>}
    </th>
  )
}


// ── Main ─────────────────────────────────────────────────────────────────────
export default function HomeClient() {
  const { watchlist, toggleWatchlist } = useApp()
  const router = useRouter()

  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [sector, setSector] = useState('all')
  const [query, setQuery] = useState('')
  const [sortCol, setSortCol] = useState<SortKey | null>('mcap')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  useEffect(() => {
    Promise.all([fetchLive(), fetchCompanyMeta()])
      .then(([live, meta]) => {
        setCompanies(mergeCompanies(meta, live.stocks))
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSort = (col: SortKey) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('desc') }
  }

  const rows = useMemo(() => {
    let list = companies.filter(c => c.close > 0)
    if (sector !== 'all') list = list.filter(c => c.sec === sector)
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      list = list.filter(c =>
        c.sym.toLowerCase().includes(q) ||
        (c.ar || '').includes(query.trim()) ||
        (c.en || '').toLowerCase().includes(q)
      )
    }
    if (sortCol) {
      list = [...list].sort((a, b) => {
        const av = ((a as any)[sortCol] ?? 0) as number
        const bv = ((b as any)[sortCol] ?? 0) as number
        return sortDir === 'asc' ? av - bv : bv - av
      })
    }
    return list
  }, [companies, sector, query, sortCol, sortDir])

  const stats = useMemo(() => {
    const active = companies.filter(c => c.close > 0)
    return {
      gainers: active.filter(c => c.pct > 0).length,
      losers:  active.filter(c => c.pct < 0).length,
      flat:    active.filter(c => c.pct === 0).length,
      totalMcap: active.reduce((s, c) => s + (c.mcap ?? 0), 0),
    }
  }, [companies])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100dvh - 52px)' }}>

      {/* ── Market summary strip ── */}
      <div style={{
        padding: '8px 16px', flexShrink: 0,
        borderBottom: '1px solid var(--line)',
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'var(--surf)',
      }}>
        {/* Gainers / Losers / Flat */}
        {[
          { label: 'رابح',   count: stats.gainers, color: 'var(--up)', bg: 'var(--up-s)', border: 'rgba(22,163,74,0.2)' },
          { label: 'خاسر',   count: stats.losers,  color: 'var(--dn)', bg: 'var(--dn-s)', border: 'rgba(220,38,38,0.2)' },
          { label: 'مستقر',  count: stats.flat,    color: 'var(--ink4)', bg: 'var(--surf2)', border: 'var(--line)' },
        ].map(s => (
          <div key={s.label} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', background: s.bg,
            border: `1px solid ${s.border}`, borderRadius: 7, flexShrink: 0,
          }}>
            <span style={{ fontSize: 11, color: s.color, fontWeight: 600 }}>{s.label}</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: s.color, fontFamily: 'var(--font-mono)' }}>
              {s.count}
            </span>
          </div>
        ))}

        {/* ISX60 chart fills remaining space */}
        <ISX60Chart />
      </div>

      {/* ── Toolbar ── */}
      <div style={{
        padding: '8px 20px', flexShrink: 0,
        borderBottom: '1px solid var(--line)',
        display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
        background: 'var(--bg)',
      }}>
        {SECTORS.map(s => (
          <button key={s.id} onClick={() => setSector(s.id)} style={{
            padding: '4px 11px', borderRadius: 7, fontSize: 12, fontWeight: 600,
            border: sector === s.id ? '1px solid var(--brand)' : '1px solid var(--line)',
            background: sector === s.id ? 'var(--brand-soft)' : 'transparent',
            color: sector === s.id ? 'var(--brand)' : 'var(--ink3)',
            cursor: 'pointer', transition: 'all 0.12s',
          }}>
            {s.ar}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="بحث..."
          style={{
            width: 150, height: 30, borderRadius: 7,
            background: 'var(--surf2)', border: '1px solid var(--line)',
            color: 'var(--ink)', fontSize: 12, padding: '0 10px',
            outline: 'none', fontFamily: 'inherit', direction: 'rtl',
          }}
          onFocus={e => e.currentTarget.style.borderColor = 'var(--brand)'}
          onBlur={e => e.currentTarget.style.borderColor = 'var(--line)'}
        />
        <span style={{ fontSize: 11, color: 'var(--ink4)', whiteSpace: 'nowrap' }}>
          {rows.length} شركة
        </span>
      </div>

      {/* ── Table ── */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {loading ? (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: 200, color: 'var(--ink4)', fontSize: 13,
          }}>
            جارٍ تحميل البيانات...
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {/* Star */}
                <th style={{
                  width: 34, padding: '0 8px', height: 36,
                  background: 'var(--surf2)', borderBottom: '1px solid var(--line)',
                  position: 'sticky', top: 0, zIndex: 1,
                }} />
                {/* Company */}
                <th style={{
                  padding: '0 14px', height: 36, textAlign: 'start',
                  fontSize: 11, fontWeight: 600, color: 'var(--ink4)',
                  background: 'var(--surf2)', borderBottom: '1px solid var(--line)',
                  position: 'sticky', top: 0, zIndex: 1, whiteSpace: 'nowrap',
                  minWidth: 180,
                }}>
                  الشركة
                </th>
                <SortTh label="السعر"           col="close" sort={sortCol} dir={sortDir} onSort={handleSort} />
                <SortTh label="التغيير%"        col="pct"   sort={sortCol} dir={sortDir} onSort={handleSort} />
                <SortTh label="القيمة السوقية"  col="mcap"  sort={sortCol} dir={sortDir} onSort={handleSort} />
                <SortTh label="الحجم"           col="vol"   sort={sortCol} dir={sortDir} onSort={handleSort} />
                {/* Sector */}
                <th style={{
                  padding: '0 14px', height: 36, textAlign: 'start',
                  fontSize: 11, fontWeight: 600, color: 'var(--ink4)',
                  background: 'var(--surf2)', borderBottom: '1px solid var(--line)',
                  position: 'sticky', top: 0, zIndex: 1, whiteSpace: 'nowrap',
                  minWidth: 80,
                }}>
                  القطاع
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((co, i) => {
                const inWl = watchlist.includes(co.sym)
                return (
                  <tr
                    key={co.sym}
                    onClick={() => router.push(`/c/${co.sym}`)}
                    style={{
                      cursor: 'pointer',
                      background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.013)',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surf2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.013)')}
                  >
                    <td style={{ width: 34, padding: '0 8px', textAlign: 'center' }}>
                      <button
                        onClick={e => { e.stopPropagation(); toggleWatchlist(co.sym) }}
                        style={{
                          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                          fontSize: 12, color: inWl ? 'var(--gold)' : 'var(--ink5)', lineHeight: 1,
                        }}
                      >
                        {inWl ? '★' : '☆'}
                      </button>
                    </td>

                    {/* Company cell */}
                    <td style={{ padding: '0 14px', minWidth: 180 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 42 }}>
                        <CoLogo sym={co.sym} logo={co.logo} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{
                            fontSize: 13, fontWeight: 700, color: 'var(--ink)',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {co.sym}
                          </div>
                          <div style={{
                            fontSize: 10, color: 'var(--ink4)',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {co.ar || co.en || ''}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td style={{
                      padding: '0 14px', textAlign: 'end',
                      fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--ink)',
                    }}>
                      {fmtPrice(co.close)}
                    </td>

                    <td style={{ padding: '0 14px', textAlign: 'end' }}>
                      <ChangeBadge val={co.pct} />
                    </td>

                    <td style={{
                      padding: '0 14px', textAlign: 'end',
                      fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink3)',
                    }}>
                      {fmtMcap(co.mcap)}
                    </td>

                    <td style={{
                      padding: '0 14px', textAlign: 'end',
                      fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink3)',
                    }}>
                      {fmtVol(co.vol)}
                    </td>

                    <td style={{ padding: '0 14px' }}>
                      <span style={{
                        fontSize: 10, fontWeight: 600, padding: '2px 6px',
                        background: 'var(--surf3)', borderRadius: 4,
                        color: 'var(--ink3)', whiteSpace: 'nowrap',
                      }}>
                        {SECTORS.find(s => s.id === co.sec)?.ar || co.sec || '—'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
