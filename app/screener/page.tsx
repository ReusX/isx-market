'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchCompanyMeta, fmtMcap } from '@/lib/market'
import type { CompanyMeta } from '@/types'

// ── types ────────────────────────────────────────────────────────────────────
type Metric = {
  ticker: string; sector: string; name_en: string | null; name_ar: string | null
  last_date: string | null
  last_close: number; prev_close: number | null
  close_1w: number | null; close_1m: number | null; close_3m: number | null
  close_yend: number | null; close_52w: number | null
  high_52w: number | null; low_52w: number | null
  avg_value_20d: number | null; days_since_trade: number | null; ff_net_30d: number | null
}
type Row = Metric & { name: string; logo?: string; color?: string; mcap?: number; pe?: number | null }

// A quote older than this (no trades) is treated as suspended/delisted and
// hidden by default · its "price" and period % would be misleading otherwise.
const STALE_DAYS = 60

// ── period config: which "as-of" close drives the % column ──────────────────
const PERIODS = [
  { id: '1d',  label: 'يوم',    key: 'prev_close'  },
  { id: '1w',  label: 'أسبوع',  key: 'close_1w'    },
  { id: '1m',  label: 'شهر',    key: 'close_1m'    },
  { id: '3m',  label: '٣ أشهر', key: 'close_3m'    },
  { id: 'ytd', label: 'العام',  key: 'close_yend'  },
  { id: '52w', label: 'سنة',    key: 'close_52w'   },
] as const
type PeriodId = typeof PERIODS[number]['id']

const SECTOR_AR: Record<string, string> = {
  Banks: 'بنوك', Industry: 'صناعة', Services: 'خدمات', Tourism: 'سياحة وفنادق',
  Investment: 'استثمار', Insurance: 'تأمين', Telecom: 'اتصالات', Agriculture: 'زراعة',
  'Money Transfer': 'تحويل مالي', Other: 'أخرى',
}

const PRESETS = [
  { id: 'all',     label: 'الكل' },
  { id: 'gainers', label: 'الرابحون' },
  { id: 'losers',  label: 'الخاسرون' },
  { id: 'liquid',  label: 'الأكثر سيولة' },
  { id: 'cheap',   label: 'الأرخص (مكرر)' },
  { id: 'fbuy',    label: 'شراء أجنبي' },
  { id: 'fsell',   label: 'بيع أجنبي' },
  { id: 'nearhi',  label: 'قرب القمة' },
] as const
type PresetId = typeof PRESETS[number]['id']

// ── helpers ──────────────────────────────────────────────────────────────────
function pctFor(r: Row, p: PeriodId): number | null {
  const ref = ({ '1d': r.prev_close, '1w': r.close_1w, '1m': r.close_1m, '3m': r.close_3m, ytd: r.close_yend, '52w': r.close_52w } as const)[p]
  if (!ref) return null
  return ((r.last_close - ref) / ref) * 100
}
const fmtPct = (v: number | null) => v == null ? '·' : `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`
const toneColor = (v: number | null) => v == null ? 'var(--ink4)' : v > 0 ? 'var(--up)' : v < 0 ? 'var(--dn)' : 'var(--ink3)'

// ── logo ──────────────────────────────────────────────────────────────────────
function Logo({ sym, logo, color }: { sym: string; logo?: string; color?: string }) {
  const [err, setErr] = useState(false)
  if (logo && !err) return <img src={logo} alt={sym} width={24} height={24} onError={() => setErr(true)}
    style={{ borderRadius: 6, objectFit: 'contain', background: '#fff', padding: 2, flexShrink: 0 }} />
  return <div style={{ width: 24, height: 24, borderRadius: 6, flexShrink: 0, background: color || 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8.5, fontWeight: 800, color: '#fff' }}>{sym.slice(0, 3)}</div>
}

type SortKey = 'mcap' | 'pct' | 'price' | 'liq' | 'foreign' | 'pos52' | 'pe'

export default function ScreenerPage() {
  const router = useRouter()
  const [rows, setRows]       = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ]             = useState('')
  const [sector, setSector]   = useState('all')
  const [period, setPeriod]   = useState<PeriodId>('1m')
  const [preset, setPreset]   = useState<PresetId>('all')
  const [sortKey, setSortKey] = useState<SortKey>('mcap')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [showStale, setShowStale] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const sb = createClient()
        const [{ data }, meta] = await Promise.all([
          sb.from('company_metrics').select('*'),
          fetchCompanyMeta().catch(() => [] as CompanyMeta[]),
        ])
        const metaBy = new Map(meta.map(m => [m.sym, m]))
        const merged: Row[] = ((data ?? []) as Metric[]).map(m => {
          const meta = metaBy.get(m.ticker)
          // Market cap consistent with the displayed price: price × shares.
          // Falls back to the static figure only when share count is unknown.
          const mcap = (m.last_close > 0 && meta?.shares)
            ? (m.last_close * meta.shares) / 1_000_000
            : meta?.mcap
          return {
            ...m,
            name: meta?.ar || m.name_ar || m.name_en || m.ticker,
            logo: meta?.logo, color: meta?.color, mcap,
          }
        })
        setRows(merged)

        // TTM P/E (Yahoo-style) for every ticker that has enough financials.
        try {
          const { fetchTtmPe } = await import('@/lib/fundamentals')
          const prices: Record<string, number> = {}
          for (const r of merged) if (r.last_close > 0) prices[r.ticker] = r.last_close
          const pe = await fetchTtmPe(sb, prices)
          setRows(prev => prev.map(r => ({ ...r, pe: pe[r.ticker]?.pe ?? null })))
        } catch { /* P/E is best-effort; screener still works without it */ }
      } finally { setLoading(false) }
    })()
  }, [])

  const sectors = useMemo(() => {
    const s = Array.from(new Set(rows.map(r => r.sector))).sort()
    return ['all', ...s]
  }, [rows])

  // count of suspended rows (hidden by default) for the toggle label
  const staleCount = useMemo(
    () => rows.filter(r => (r.days_since_trade ?? 0) > STALE_DAYS).length,
    [rows],
  )
  const activeCount = rows.length ? rows.length - staleCount : 0

  const view = useMemo(() => {
    let list = rows.slice()
    // hide suspended / long-untraded quotes unless explicitly shown
    if (!showStale) list = list.filter(r => (r.days_since_trade ?? 0) <= STALE_DAYS)
    // search
    if (q.trim()) {
      const k = q.trim().toLowerCase()
      list = list.filter(r => r.ticker.toLowerCase().includes(k) || r.name.toLowerCase().includes(k) || (r.name_en ?? '').toLowerCase().includes(k))
    }
    // sector
    if (sector !== 'all') list = list.filter(r => r.sector === sector)
    // presets
    if (preset === 'gainers') list = list.filter(r => (pctFor(r, period) ?? 0) > 0)
    else if (preset === 'losers') list = list.filter(r => (pctFor(r, period) ?? 0) < 0)
    else if (preset === 'liquid') list = list.filter(r => (r.avg_value_20d ?? 0) > 0)
    else if (preset === 'cheap')  list = list.filter(r => r.pe != null && r.pe > 0)
    else if (preset === 'fbuy')   list = list.filter(r => (r.ff_net_30d ?? 0) > 0)
    else if (preset === 'fsell')  list = list.filter(r => (r.ff_net_30d ?? 0) < 0)
    else if (preset === 'nearhi') list = list.filter(r => r.high_52w && (r.high_52w - r.last_close) / r.high_52w <= 0.05)

    // implicit sort for some presets
    let sk = sortKey, sd = sortDir
    if (preset === 'liquid') { sk = 'liq'; sd = 'desc' }
    else if (preset === 'cheap') { sk = 'pe'; sd = 'asc' }

    const val = (r: Row): number => {
      switch (sk) {
        case 'pct':     return pctFor(r, period) ?? -Infinity
        case 'price':   return r.last_close
        case 'liq':     return r.avg_value_20d ?? -Infinity
        case 'foreign': return r.ff_net_30d ?? 0
        case 'pos52':   return r.high_52w && r.low_52w && r.high_52w !== r.low_52w ? (r.last_close - r.low_52w) / (r.high_52w - r.low_52w) : -Infinity
        case 'pe':      return r.pe != null && r.pe > 0 ? r.pe : (sd === 'asc' ? Infinity : -Infinity)
        default:        return r.mcap ?? -Infinity
      }
    }
    list.sort((a, b) => sd === 'asc' ? val(a) - val(b) : val(b) - val(a))
    return list
  }, [rows, q, sector, preset, period, sortKey, sortDir, showStale])

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(k); setSortDir(k === 'price' || k === 'pos52' ? 'asc' : 'desc') }
  }

  const periodLabel = PERIODS.find(p => p.id === period)!.label

  return (
    <div style={{ padding: '20px 24px 80px', maxWidth: 1180, margin: '0 auto' }}>
      {/* header */}
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: 'var(--ink)', letterSpacing: '-0.01em' }}>فارز الأسهم</h2>
        <p style={{ fontSize: 12.5, color: 'var(--ink4)', margin: '6px 0 0' }}>
          فلترة وترتيب أسهم السوق حسب الأداء والسيولة والمكرر وتدفق الأجانب
          {activeCount ? <> · {activeCount} شركة نشطة</> : null}
        </p>
      </div>

      {/* ── filter bar ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
        {/* presets + search */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="chip-scroll" style={{ display: 'flex', gap: 6, overflowX: 'auto', flex: 1, minWidth: 0 }}>
            {PRESETS.map(p => (
              <button key={p.id} onClick={() => setPreset(p.id)} style={chip(preset === p.id)}>{p.label}</button>
            ))}
          </div>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <span style={{ position: 'absolute', insetInlineStart: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink4)', pointerEvents: 'none', display: 'flex' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
            </span>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="بحث باسم أو رمز…"
              style={{ width: 190, height: 34, borderRadius: 9, background: 'var(--surf2)', border: '1px solid var(--line)', color: 'var(--ink)', fontSize: 13, padding: '0 12px 0 32px', outline: 'none', fontFamily: 'inherit', direction: 'rtl' }} />
          </div>
        </div>
        {/* sector + period */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="chip-scroll" style={{ display: 'flex', gap: 6, overflowX: 'auto', flex: 1, minWidth: 0 }}>
            {sectors.map(s => (
              <button key={s} onClick={() => setSector(s)} style={chip(sector === s, true)}>
                {s === 'all' ? 'كل القطاعات' : (SECTOR_AR[s] ?? s)}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
            <span style={{ fontSize: 11, color: 'var(--ink4)', fontWeight: 600 }}>التغيّر</span>
            <div style={{ display: 'inline-flex', background: 'var(--surf2)', borderRadius: 8, padding: 2, gap: 2, border: '1px solid var(--line)' }}>
              {PERIODS.map(p => (
                <button key={p.id} onClick={() => setPeriod(p.id)} style={{
                  border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  background: period === p.id ? 'var(--surf3)' : 'transparent', color: period === p.id ? 'var(--ink)' : 'var(--ink4)',
                }}>{p.label}</button>
              ))}
            </div>
          </div>
        </div>
        {/* suspended toggle */}
        {staleCount > 0 && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: 'var(--ink4)', cursor: 'pointer', userSelect: 'none' }}>
            <input type="checkbox" checked={showStale} onChange={e => setShowStale(e.target.checked)}
              style={{ accentColor: 'var(--brand)', width: 14, height: 14, cursor: 'pointer' }} />
            عرض الأسهم المتوقفة عن التداول ({staleCount}) · آخر تداول لها قبل أكثر من {STALE_DAYS} يوماً
          </label>
        )}
      </div>

      {/* table */}
      {loading ? (
        <div className="skeleton" style={{ height: 480, borderRadius: 12 }} />
      ) : (
        <div style={{ border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden', background: 'var(--surf)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 880 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line)' }}>
                  <Th label={`الشركة · ${view.length}`} align="start" />
                  <Th label="السعر" onClick={() => toggleSort('price')} active={sortKey === 'price'} dir={sortDir} />
                  <Th label={`التغيّر · ${periodLabel}`} onClick={() => toggleSort('pct')} active={sortKey === 'pct'} dir={sortDir} />
                  <Th label="مكرر" onClick={() => toggleSort('pe')} active={sortKey === 'pe'} dir={sortDir} />
                  <Th label="٥٢ أسبوع" onClick={() => toggleSort('pos52')} active={sortKey === 'pos52'} dir={sortDir} />
                  <Th label="السيولة" onClick={() => toggleSort('liq')} active={sortKey === 'liq'} dir={sortDir} />
                  <Th label="أجانب (٣٠ي)" onClick={() => toggleSort('foreign')} active={sortKey === 'foreign'} dir={sortDir} />
                  <Th label="القيمة السوقية" onClick={() => toggleSort('mcap')} active={sortKey === 'mcap'} dir={sortDir} />
                  <Th label="القطاع" align="start" />
                </tr>
              </thead>
              <tbody>
                {view.map((r, i) => {
                  const p = pctFor(r, period)
                  const pos = r.high_52w && r.low_52w && r.high_52w !== r.low_52w
                    ? Math.max(0, Math.min(100, ((r.last_close - r.low_52w) / (r.high_52w - r.low_52w)) * 100)) : null
                  return (
                    <tr key={r.ticker} onClick={() => router.push(`/c/${r.ticker}`)}
                      style={{ borderBottom: i === view.length - 1 ? 'none' : '1px solid var(--line)', cursor: 'pointer', transition: 'background .1s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surf2)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      {/* company · logo + symbol badge + name */}
                      <td style={{ padding: '9px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                          <Logo sym={r.ticker} logo={r.logo} color={r.color} />
                          <span style={{ fontSize: 10.5, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--ink3)', background: 'var(--surf3)', borderRadius: 5, padding: '2px 6px', flexShrink: 0 }}>{r.ticker}</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 210 }}>{r.name}</span>
                        </div>
                      </td>
                      {/* price (+ last-trade date when not from the latest session) */}
                      <td style={tdNum}>
                        <div style={{ color: 'var(--ink)' }}>{r.last_close.toLocaleString('en-US', { maximumFractionDigits: 3 })}</div>
                        {(r.days_since_trade ?? 0) > 5 && r.last_date && (
                          <div style={{ fontSize: 9, color: 'var(--ink5)', fontWeight: 600 }}>
                            {`آخر تداول ${fmtDate(r.last_date)}`}
                          </div>
                        )}
                      </td>
                      {/* change · plain colored text, TradingView style */}
                      <td style={{ ...tdNum, color: toneColor(p), fontWeight: 700 }}>{fmtPct(p)}</td>
                      {/* P/E (TTM) */}
                      <td style={tdNum}>
                        {r.pe != null && r.pe > 0
                          ? (r.pe >= 100 ? Math.round(r.pe) : r.pe.toFixed(1))
                          : <span style={{ color: 'var(--ink5)' }}>·</span>}
                      </td>
                      {/* 52w position · neutral track + marker */}
                      <td style={{ padding: '9px 12px', minWidth: 120 }}>
                        {pos == null ? <span style={{ color: 'var(--ink5)' }}>·</span> : (
                          <div>
                            <div style={{ position: 'relative', height: 4, borderRadius: 2, background: 'var(--surf3)' }}>
                              <div style={{ position: 'absolute', insetInlineStart: 0, top: 0, bottom: 0, width: `${pos}%`, background: 'var(--brand-mute)', borderRadius: 2, opacity: 0.5 }} />
                              <div style={{ position: 'absolute', insetInlineStart: `calc(${pos}% - 2px)`, top: -2, width: 4, height: 8, borderRadius: 1, background: 'var(--ink2)' }} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--ink5)', fontFamily: 'var(--font-mono)', marginTop: 3 }}>
                              <span>{r.low_52w}</span><span>{r.high_52w}</span>
                            </div>
                          </div>
                        )}
                      </td>
                      {/* liquidity */}
                      <td style={tdNum}>{r.avg_value_20d ? fmtIQDc(r.avg_value_20d) : <span style={{ color: 'var(--ink5)' }}>·</span>}</td>
                      {/* foreign */}
                      <td style={{ ...tdNum, color: toneColor(r.ff_net_30d ?? null), fontWeight: 600 }}>
                        {r.ff_net_30d ? `${r.ff_net_30d > 0 ? '+' : '−'}${fmtIQDc(Math.abs(r.ff_net_30d))}` : <span style={{ color: 'var(--ink5)' }}>·</span>}
                      </td>
                      {/* mcap */}
                      <td style={{ ...tdNum, color: 'var(--ink)' }}>{fmtMcap(r.mcap)}</td>
                      {/* sector */}
                      <td style={{ padding: '9px 12px', fontSize: 11.5, color: 'var(--ink4)', whiteSpace: 'nowrap' }}>{SECTOR_AR[r.sector] ?? r.sector}</td>
                    </tr>
                  )
                })}
                {view.length === 0 && (
                  <tr><td colSpan={9} style={{ padding: 48, textAlign: 'center', color: 'var(--ink4)', fontSize: 13 }}>لا توجد نتائج مطابقة · جرّب تعديل الفلاتر.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <p style={{ fontSize: 11, color: 'var(--ink5)', marginTop: 12, lineHeight: 1.7 }}>
        الأسعار من آخر نشرة تداول رسمية لكل سهم · القيمة السوقية = السعر × الأسهم المصدرة · المكرر (P/E) محسوب على آخر ١٢ شهراً (TTM) ويظهر فقط للشركات التي توفّرت بياناتها المالية
      </p>
    </div>
  )
}

// ── atoms ──────────────────────────────────────────────────────────────────
function Th({ label, onClick, active, dir, align }: { label: string; onClick?: () => void; active?: boolean; dir?: 'asc' | 'desc'; align?: 'start' }) {
  return (
    <th onClick={onClick} style={{
      padding: '10px 12px', textAlign: align ?? 'end', fontSize: 11, fontWeight: 600,
      color: active ? 'var(--ink)' : 'var(--ink4)', whiteSpace: 'nowrap',
      cursor: onClick ? 'pointer' : 'default', userSelect: 'none', transition: 'color .1s',
    }}>
      {active && (dir === 'asc' ? '↑ ' : '↓ ')}{label}
    </th>
  )
}
// Neutral filter chip · single brand accent on active, no per-item colours.
function chip(on: boolean, soft = false): React.CSSProperties {
  return {
    padding: '6px 13px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0, cursor: 'pointer',
    border: `1px solid ${on ? 'var(--brand)' : 'var(--line)'}`,
    background: on ? (soft ? 'var(--brand-soft)' : 'var(--brand)') : 'transparent',
    color: on ? (soft ? 'var(--brand)' : '#fff') : 'var(--ink3)',
    fontFamily: 'inherit', transition: 'background .1s, border-color .1s, color .1s',
  }
}
const tdNum: React.CSSProperties = { padding: '9px 12px', textAlign: 'end', fontSize: 12.5, fontFamily: 'var(--font-mono)', color: 'var(--ink2)', whiteSpace: 'nowrap' }
// compact IQD for the value columns (millions/billions)
function fmtIQDc(v: number): string {
  if (v >= 1e9) return (v / 1e9).toFixed(2) + ' مليار'
  if (v >= 1e6) return (v / 1e6).toFixed(1) + ' مليون'
  if (v >= 1e3) return (v / 1e3).toFixed(0) + ' ألف'
  return Math.round(v).toString()
}
// YYYY-MM-DD → DD/MM/YYYY (last-trade hint)
function fmtDate(d: string): string {
  const [y, m, day] = d.split('-')
  return day && m && y ? `${day}/${m}/${y}` : d
}
