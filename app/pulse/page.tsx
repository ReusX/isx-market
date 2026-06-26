'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import Link from 'next/link'
import { fmtIQD, arDate, Seg, CoLogo } from '../statistics/_ui'
import { fetchCompanyMeta } from '@/lib/market'
import type { CompanyMeta } from '@/types'

// ── types ──────────────────────────────────────────────────────────────────
type Breadth = {
  date: string
  advancers: number; decliners: number; unchanged: number
  up_volume: number; down_volume: number
  new_highs: number; new_lows: number; traded: number
}
type Idx = {
  date: string; isx60: number | null
  total_volume: number | null; total_value: number | null; total_trades: number | null
  traded_companies: number | null; listed_companies: number | null
}
type Metric = {
  ticker: string; sector: string; name_en: string | null; name_ar: string | null
  last_close: number; prev_close: number | null
  high_52w: number | null; low_52w: number | null; days_since_trade: number | null
}
type Co = { ticker: string; name: string; logo?: string; price: number; pct: number | null }

// ── helpers ─────────────────────────────────────────────────────────────────
function fmtNum(v: number | null | undefined): string {
  if (v == null) return '·'
  if (Math.abs(v) >= 1e12) return (v / 1e12).toFixed(2) + 'T'
  if (Math.abs(v) >= 1e9)  return (v / 1e9).toFixed(2) + 'B'
  if (Math.abs(v) >= 1e6)  return (v / 1e6).toFixed(1) + 'M'
  if (Math.abs(v) >= 1e3)  return (v / 1e3).toFixed(0) + 'K'
  return String(v)
}
const fmtPct = (v: number | null) => v == null ? '·' : `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`

const TF = [
  { id: '1M', label: 'شهر',   n: 22 },
  { id: '3M', label: '٣ أشهر', n: 66 },
  { id: '6M', label: '٦ أشهر', n: 132 },
  { id: '1Y', label: 'سنة',   n: 260 },
] as const

// ── small UI atoms ───────────────────────────────────────────────────────────
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 14, padding: 18, ...style }}>
      {children}
    </div>
  )
}
// KPI tile. When `onClick` is given it becomes an interactive button that reveals
// the underlying companies.
function Tile({ label, value, sub, tone, dir, onClick, active }: {
  label: string; value: string; sub?: string; tone?: 'up' | 'dn'; dir?: boolean
  onClick?: () => void; active?: boolean
}) {
  const clickable = !!onClick
  return (
    <Card style={{
      padding: 14, ...(clickable ? { cursor: 'pointer' } : {}),
      borderColor: active ? 'var(--brand)' : 'var(--line)',
      transition: 'border-color .12s, background .12s',
    }}>
      <div
        onClick={onClick}
        onMouseEnter={clickable ? (e => { if (!active) (e.currentTarget.parentElement as HTMLElement).style.borderColor = 'var(--line2)' }) : undefined}
        onMouseLeave={clickable ? (e => { if (!active) (e.currentTarget.parentElement as HTMLElement).style.borderColor = 'var(--line)' }) : undefined}
      >
        <div style={{ fontSize: 11, color: 'var(--ink4)', fontWeight: 600, marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {label}
          {clickable && (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--brand)' : 'currentColor'} strokeWidth="2.4" style={{ transform: 'scaleX(-1)', opacity: active ? 1 : 0.6 }}>
              <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
        <div dir={dir ? 'ltr' : undefined} style={{ fontFamily: 'var(--font-mono)', fontSize: 21, fontWeight: 800, color: tone === 'up' ? 'var(--up)' : tone === 'dn' ? 'var(--dn)' : 'var(--ink)', lineHeight: 1, textAlign: dir ? 'start' : undefined }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--ink4)', marginTop: 5 }}>{sub}</div>}
      </div>
    </Card>
  )
}

// Advance/Decline cumulative line (pure SVG)
function ADLine({ rows }: { rows: Breadth[] }) {
  const { path, area, up } = useMemo(() => {
    let cum = 0
    const series = rows.map(r => (cum += r.advancers - r.decliners))
    const min = Math.min(...series, 0), max = Math.max(...series, 0)
    const range = max - min || 1
    const W = 1000, H = 220, pad = 6
    const pts = series.map((v, i) => {
      const x = (i / Math.max(series.length - 1, 1)) * W
      const y = H - pad - ((v - min) / range) * (H - pad * 2)
      return [x, y] as [number, number]
    })
    const path = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
    const area = `${path} L${W},${H} L0,${H} Z`
    return { path, area, up: series[series.length - 1] >= 0 }
  }, [rows])
  const color = up ? 'var(--up)' : 'var(--dn)'
  return (
    <svg viewBox="0 0 1000 220" preserveAspectRatio="none" style={{ width: '100%', height: 200, display: 'block' }}>
      <defs>
        <linearGradient id="adgrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#adgrad)" />
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}

// Last-N sessions stacked breadth bars (advancers up / decliners down)
function BreadthBars({ rows }: { rows: Breadth[] }) {
  const last = rows.slice(-30)
  const maxN = Math.max(...last.map(r => Math.max(r.advancers, r.decliners)), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 120 }}>
      {last.map(r => {
        const upH = (r.advancers / maxN) * 55
        const dnH = (r.decliners / maxN) * 55
        return (
          <div key={r.date} title={`${arDate(r.date)} · ▲${r.advancers} ▼${r.decliners}`}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', gap: 1 }}>
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: 55 }}>
              <div style={{ height: upH, background: 'var(--up)', borderRadius: '2px 2px 0 0', opacity: 0.85 }} />
            </div>
            <div style={{ width: '100%', height: 55 }}>
              <div style={{ height: dnH, background: 'var(--dn)', borderRadius: '0 0 2px 2px', opacity: 0.85 }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Movers: tabbed, clickable company lists ──────────────────────────────────
type MoverTab = 'gainers' | 'losers' | 'highs' | 'lows'
const MOVER_TABS: { id: MoverTab; label: string }[] = [
  { id: 'gainers', label: 'الأكثر صعوداً' },
  { id: 'losers',  label: 'الأكثر هبوطاً' },
  { id: 'highs',   label: 'قمم ٥٢ أسبوع' },
  { id: 'lows',    label: 'قيعان ٥٢ أسبوع' },
]

function MoverList({ items }: { items: Co[] }) {
  if (!items.length) return <div style={{ padding: '28px 0', textAlign: 'center', color: 'var(--ink4)', fontSize: 12.5 }}>لا توجد أسهم في هذه القائمة اليوم.</div>
  return (
    <div>
      {items.map((c, i) => {
        const up = (c.pct ?? 0) >= 0
        return (
          <Link key={c.ticker} href={`/c/${c.ticker}`} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 6px', textDecoration: 'none',
            borderRadius: 8, borderBottom: i === items.length - 1 ? 'none' : '1px solid var(--line)',
          }}>
            <span style={{ width: 18, fontSize: 11, color: 'var(--ink5)', fontFamily: 'var(--font-mono)', textAlign: 'center', flexShrink: 0 }}>{i + 1}</span>
            <CoLogo sym={c.ticker} logo={c.logo} size={26} />
            <span style={{ fontSize: 10.5, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--ink3)', background: 'var(--surf3)', borderRadius: 5, padding: '2px 6px', flexShrink: 0 }}>{c.ticker}</span>
            <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
            <span style={{ fontSize: 12.5, fontFamily: 'var(--font-mono)', color: 'var(--ink2)', flexShrink: 0 }}>{c.price.toLocaleString('en-US', { maximumFractionDigits: 3 })}</span>
            <span style={{ width: 66, textAlign: 'end', fontSize: 12.5, fontWeight: 700, fontFamily: 'var(--font-mono)', color: c.pct == null ? 'var(--ink4)' : up ? 'var(--up)' : 'var(--dn)', flexShrink: 0 }}>{fmtPct(c.pct)}</span>
          </Link>
        )
      })}
    </div>
  )
}

// ── page ──────────────────────────────────────────────────────────────────
export default function PulsePage() {
  const [breadth, setBreadth] = useState<Breadth[]>([])
  const [index, setIndex]     = useState<Idx[]>([])
  const [metrics, setMetrics] = useState<Metric[]>([])
  const [metaMap, setMetaMap] = useState<Map<string, CompanyMeta>>(new Map())
  const [loading, setLoading] = useState(true)
  const [tf, setTf]           = useState<typeof TF[number]['id']>('3M')
  const [moverTab, setMoverTab] = useState<MoverTab>('gainers')
  const moversRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const sb = createClient()
        const [b, i, m, meta] = await Promise.all([
          sb.from('breadth_daily').select('*').order('date', { ascending: false }).limit(260),
          sb.from('daily_index').select('date,isx60,total_volume,total_value,total_trades,traded_companies,listed_companies').order('date', { ascending: false }).limit(260),
          sb.from('company_metrics').select('ticker,sector,name_en,name_ar,last_close,prev_close,high_52w,low_52w,days_since_trade'),
          fetchCompanyMeta().catch(() => [] as CompanyMeta[]),
        ])
        setBreadth(((b.data ?? []) as Breadth[]).slice().reverse())
        setIndex(((i.data ?? []) as Idx[]).slice().reverse())
        setMetrics((m.data ?? []) as Metric[])
        setMetaMap(new Map((meta as CompanyMeta[]).map(x => [x.sym, x])))
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const latest    = breadth[breadth.length - 1]
  const latestIdx = index[index.length - 1]
  const windowed  = useMemo(() => {
    const n = TF.find(t => t.id === tf)!.n
    return breadth.slice(-n)
  }, [breadth, tf])

  const idxChange = useMemo(() => {
    if (index.length < 2 || latestIdx?.isx60 == null) return null
    const prev = index[index.length - 2]?.isx60
    if (!prev) return null
    return ((latestIdx.isx60 - prev) / prev) * 100
  }, [index, latestIdx])

  // per-company derived lists (gainers / losers / 52w extremes)
  const lists = useMemo(() => {
    const pct1d = (m: Metric) => m.prev_close && m.prev_close > 0 ? ((m.last_close - m.prev_close) / m.prev_close) * 100 : null
    const recent = (m: Metric) => (m.days_since_trade ?? 99) <= 1 && m.last_close > 0
    const toCo = (m: Metric): Co => {
      const mt = metaMap.get(m.ticker)
      return { ticker: m.ticker, name: mt?.ar || m.name_ar || m.name_en || m.ticker, logo: mt?.logo, price: m.last_close, pct: pct1d(m) }
    }
    const live = metrics.filter(recent)
    const gainers = live.filter(m => (pct1d(m) ?? 0) > 0).sort((a, b) => (pct1d(b) ?? 0) - (pct1d(a) ?? 0)).map(toCo)
    const losers  = live.filter(m => (pct1d(m) ?? 0) < 0).sort((a, b) => (pct1d(a) ?? 0) - (pct1d(b) ?? 0)).map(toCo)
    const highs   = live.filter(m => m.high_52w && m.last_close >= m.high_52w * 0.999).sort((a, b) => (pct1d(b) ?? 0) - (pct1d(a) ?? 0)).map(toCo)
    const lows    = live.filter(m => m.low_52w && m.last_close <= m.low_52w * 1.001).sort((a, b) => (pct1d(a) ?? 0) - (pct1d(b) ?? 0)).map(toCo)
    return { gainers, losers, highs, lows }
  }, [metrics, metaMap])

  const openMovers = (tab: MoverTab) => {
    setMoverTab(tab)
    setTimeout(() => moversRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30)
  }

  if (loading) {
    return <div style={wrap}><div className="skeleton" style={{ height: 200, borderRadius: 14, marginBottom: 16 }} /><div className="skeleton" style={{ height: 320, borderRadius: 14 }} /></div>
  }
  if (!latest) {
    return <div style={wrap}><Card><div style={{ color: 'var(--ink4)', textAlign: 'center', padding: 40 }}>لا تتوفر بيانات بعد.</div></Card></div>
  }

  const total = latest.advancers + latest.decliners + latest.unchanged
  const advW = (latest.advancers / total) * 100
  const uncW = (latest.unchanged / total) * 100
  const decW = (latest.decliners / total) * 100
  const totVol = latest.up_volume + latest.down_volume
  const upVolW = totVol ? (latest.up_volume / totVol) * 100 : 50

  const moverItems = lists[moverTab]

  return (
    <div style={wrap}>
      {/* header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: 'var(--ink)' }}>نبض السوق</h2>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: 'var(--up)', background: 'var(--up-s)', border: '1px solid rgba(22,163,74,0.25)', borderRadius: 999, padding: '2px 8px' }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--up)' }} />مباشر
            </span>
          </div>
          <p style={{ fontSize: 12.5, color: 'var(--ink4)', margin: '6px 0 0' }}>
            اتساع السوق · الأسهم الصاعدة مقابل الهابطة · جلسة {arDate(latest.date)}
          </p>
        </div>
        <Link href="/market" style={{ fontSize: 12, color: 'var(--brand)', textDecoration: 'none', fontWeight: 600 }}>كل الأسهم ←</Link>
      </div>

      {/* hero: advancers vs decliners tug bar · sides are clickable */}
      <Card style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
          <button onClick={() => openMovers('gainers')} style={heroBtn('var(--up)')}>▲ {latest.advancers} صاعد</button>
          <span style={{ fontSize: 12, color: 'var(--ink4)' }}>{latest.unchanged} بلا تغيير · {latest.traded} متداول</span>
          <button onClick={() => openMovers('losers')} style={heroBtn('var(--dn)')}>{latest.decliners} هابط ▼</button>
        </div>
        <div style={{ display: 'flex', height: 16, borderRadius: 8, overflow: 'hidden', background: 'var(--surf3)' }}>
          <div style={{ width: `${advW}%`, background: 'var(--up)' }} />
          <div style={{ width: `${uncW}%`, background: 'var(--ink5)' }} />
          <div style={{ width: `${decW}%`, background: 'var(--dn)' }} />
        </div>
        {idxChange != null && (
          <div style={{ marginTop: 12, fontSize: 12.5, color: 'var(--ink3)' }}>
            مؤشر ISX60: <b style={{ fontFamily: 'var(--font-mono)' }}>{latestIdx?.isx60?.toFixed(2)}</b>{' '}
            <span style={{ color: idxChange >= 0 ? 'var(--up)' : 'var(--dn)', fontWeight: 700 }}>
              {idxChange >= 0 ? '▲' : '▼'} {Math.abs(idxChange).toFixed(2)}%
            </span>
          </div>
        )}
      </Card>

      {/* stat tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginBottom: 14 }}>
        <Tile label="القيمة المتداولة" value={fmtIQD(latestIdx?.total_value ?? 0)} />
        <Tile label="حجم التداول" value={fmtNum(latestIdx?.total_volume)} sub="سهم" />
        <Tile label="عدد الصفقات" value={latestIdx?.total_trades != null ? latestIdx.total_trades.toLocaleString('en-US') : '·'} />
        <Tile label="متداولة من المدرجة" value={`${latestIdx?.traded_companies ?? '·'} / ${latestIdx?.listed_companies ?? '·'}`} dir />
        <Tile label="قمم 52 أسبوع" value={String(latest.new_highs)} sub="اضغط لعرض الأسهم" tone={latest.new_highs ? 'up' : undefined}
          onClick={() => openMovers('highs')} active={moverTab === 'highs'} />
        <Tile label="قيعان 52 أسبوع" value={String(latest.new_lows)} sub="اضغط لعرض الأسهم" tone={latest.new_lows ? 'dn' : undefined}
          onClick={() => openMovers('lows')} active={moverTab === 'lows'} />
      </div>

      {/* ── movers: interactive, tabbed company lists ── */}
      <Card style={{ marginBottom: 14 }} >
        <div ref={moversRef} style={{ scrollMarginTop: 64 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink)' }}>أبرز تحركات الجلسة</div>
            <span style={{ fontSize: 11.5, color: 'var(--ink4)', fontWeight: 600 }}>{moverItems.length} سهم</span>
          </div>
          {/* tabs */}
          <div className="chip-scroll" style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 8 }}>
            {MOVER_TABS.map(t => {
              const on = moverTab === t.id
              return (
                <button key={t.id} onClick={() => setMoverTab(t.id)} style={{
                  padding: '6px 13px', borderRadius: 8, fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0, cursor: 'pointer',
                  border: `1px solid ${on ? 'var(--brand)' : 'var(--line)'}`,
                  background: on ? 'var(--brand)' : 'transparent', color: on ? '#fff' : 'var(--ink3)', fontFamily: 'inherit',
                }}>{t.label}</button>
              )
            })}
          </div>
          <MoverList items={moverItems.slice(0, 15)} />
          {moverItems.length > 15 && (
            <div style={{ fontSize: 11, color: 'var(--ink5)', textAlign: 'center', marginTop: 8 }}>
              عرض أعلى 15 من {moverItems.length} · للقائمة الكاملة استخدم <Link href="/screener" style={{ color: 'var(--brand)', textDecoration: 'none' }}>فارز الأسهم</Link>
            </div>
          )}
        </div>
      </Card>

      {/* up vs down volume */}
      <Card style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink3)', marginBottom: 10 }}>توزيع حجم التداول</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink4)', marginBottom: 6 }}>
          <span style={{ color: 'var(--up)' }}>صاعد {fmtNum(latest.up_volume)}</span>
          <span style={{ color: 'var(--dn)' }}>هابط {fmtNum(latest.down_volume)}</span>
        </div>
        <div style={{ display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', background: 'var(--dn)' }}>
          <div style={{ width: `${upVolW}%`, background: 'var(--up)' }} />
        </div>
      </Card>

      {/* advance/decline line */}
      <Card style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink)' }}>خط الصعود / الهبوط التراكمي</div>
            <div style={{ fontSize: 11, color: 'var(--ink4)', marginTop: 2 }}>مجموع (الصاعدة ناقص الهابطة) عبر الجلسات · اتجاه اتساع السوق</div>
          </div>
          <Seg value={tf} onChange={setTf} options={TF.map(t => [t.id, t.label] as [typeof t.id, string])} />
        </div>
        <ADLine rows={windowed} />
      </Card>

      {/* last-30 breadth bars */}
      <Card>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink)', marginBottom: 4 }}>اتساع آخر ٣٠ جلسة</div>
        <div style={{ fontSize: 11, color: 'var(--ink4)', marginBottom: 12 }}>الأخضر للأعلى = الأسهم الصاعدة · الأحمر للأسفل = الهابطة</div>
        <BreadthBars rows={breadth} />
      </Card>
    </div>
  )
}

const wrap: React.CSSProperties = { padding: '20px 24px 60px', maxWidth: 1000, margin: '0 auto' }
function heroBtn(color: string): React.CSSProperties {
  return {
    fontSize: 13, fontWeight: 700, color, background: 'transparent', border: 'none',
    cursor: 'pointer', padding: 0, fontFamily: 'inherit', textDecoration: 'underline',
    textUnderlineOffset: 3, textDecorationColor: 'color-mix(in srgb, currentColor 35%, transparent)',
  }
}
