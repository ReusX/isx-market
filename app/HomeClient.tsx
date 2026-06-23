'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useApp } from '@/context/AppContext'
import { fetchLive, fetchCompanyMeta, mergeCompanies, SECTORS } from '@/lib/market'
import { usePortfolio, aggregate, totals, fmtIQD } from '@/lib/portfolio'
import type { Company } from '@/types'

type News = { slug: string; title: string; date: string }
type IndexRow = { date: string; isx60: number; total_value: number | null; total_volume: number | null; total_trades: number | null; traded_companies: number | null; listed_companies: number | null }
type Breadth = { advancers: number; decliners: number; unchanged: number }
type Flow = { ticker: string; side: 'buy' | 'sell'; value: number }

// ── format helpers ────────────────────────────────────────────────────────────
const fmtBig = (v: number | null | undefined) => {
  if (v == null) return '—'
  const a = Math.abs(v)
  if (a >= 1e9) return (v / 1e9).toFixed(2) + ' مليار'
  if (a >= 1e6) return (v / 1e6).toFixed(1) + ' مليون'
  if (a >= 1e3) return Math.round(v).toLocaleString('en')
  return String(Math.round(v))
}
const fmtPct = (v: number) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(2)}%`
const tone = (v: number) => (v > 0 ? 'var(--up)' : v < 0 ? 'var(--dn)' : 'var(--ink3)')
const sectorAr = (id: string) => SECTORS.find(s => s.id === id)?.ar ?? id

// ── ISX60 sparkline (lightweight-charts area) ─────────────────────────────────
function Sparkline({ data, up }: { data: { time: string; value: number }[]; up: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current || data.length < 2) return
    let chart: any = null, ro: ResizeObserver | null = null
    ;(async () => {
      const LC = await import('lightweight-charts')
      if (!ref.current) return
      const color = up ? '#22C55E' : '#EF5350'
      chart = LC.createChart(ref.current, {
        width: ref.current.clientWidth, height: ref.current.clientHeight,
        layout: { background: { color: 'transparent' }, textColor: 'transparent' },
        grid: { vertLines: { visible: false }, horzLines: { visible: false } },
        crosshair: { mode: LC.CrosshairMode?.Hidden ?? 0 },
        rightPriceScale: { visible: false }, leftPriceScale: { visible: false },
        timeScale: { visible: false }, handleScroll: false, handleScale: false,
      })
      const area = chart.addAreaSeries({
        lineColor: color, topColor: color + '33', bottomColor: color + '00',
        lineWidth: 2, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
      })
      area.setData(data)
      chart.timeScale().fitContent()
      ro = new ResizeObserver(() => chart && ref.current && chart.applyOptions({ width: ref.current.clientWidth, height: ref.current.clientHeight }))
      ro.observe(ref.current)
    })()
    return () => { ro?.disconnect(); chart?.remove() }
  }, [data, up])
  return <div ref={ref} style={{ width: '100%', height: 60 }} />
}

// ── small atoms ───────────────────────────────────────────────────────────────
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: 16, ...style }}>{children}</div>
}
function SectionTitle({ title, href, action }: { title: string; href?: string; action?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
      <h2 style={{ fontSize: 14, fontWeight: 800, margin: 0, color: 'var(--ink)' }}>{title}</h2>
      {href && <Link href={href} style={{ fontSize: 11.5, color: 'var(--brand)', fontWeight: 600 }}>{action ?? 'عرض الكل'} ←</Link>}
    </div>
  )
}
function MiniLogo({ sym, logo, size = 24 }: { sym: string; logo?: string; size?: number }) {
  const [err, setErr] = useState(false)
  const src = !err ? (logo || `https://isc.gov.iq/Uploads/Companies/${sym}.png`) : null
  if (src) return <img src={src} alt="" width={size} height={size} loading="lazy" onError={() => setErr(true)} style={{ borderRadius: 5, objectFit: 'contain', background: '#fff', padding: 1, flexShrink: 0 }} />
  return <div style={{ width: size, height: size, borderRadius: 5, flexShrink: 0, background: 'var(--surf3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 800, color: 'var(--ink3)' }}>{sym.slice(0, 3)}</div>
}
function CoRow({ co, right }: { co: Company; right: React.ReactNode }) {
  return (
    <Link href={`/c/${co.sym}`} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 0', borderBottom: '1px solid var(--line)', textDecoration: 'none' }}>
      <MiniLogo sym={co.sym} logo={co.logo} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{co.ar || co.en || co.sym}</div>
        <div style={{ fontSize: 10.5, color: 'var(--ink4)', fontFamily: 'var(--font-mono)' }}>{co.sym}</div>
      </div>
      {right}
    </Link>
  )
}

// ── main ──────────────────────────────────────────────────────────────────────
export default function HomeClient({ news }: { news: News[] }) {
  const { user, openAuth } = useApp()
  const { lots } = usePortfolio()

  const [companies, setCompanies] = useState<Company[]>([])
  const [series, setSeries]   = useState<{ time: string; value: number }[]>([])
  const [index, setIndex]     = useState<IndexRow | null>(null)
  const [prevIsx, setPrevIsx] = useState<number | null>(null)
  const [breadth, setBreadth] = useState<Breadth | null>(null)
  const [peMap, setPeMap]     = useState<Record<string, number>>({})
  const [flow, setFlow]       = useState<Flow[]>([])
  const [moversTab, setMoversTab] = useState<'gainers' | 'losers' | 'active'>('gainers')

  // prices + companies
  useEffect(() => {
    Promise.all([fetchLive(), fetchCompanyMeta()])
      .then(([live, meta]) => setCompanies(mergeCompanies(meta, live.stocks)))
      .catch(() => {})
  }, [])

  // index series + breadth + foreign flow
  useEffect(() => {
    ;(async () => {
      const { createClient } = await import('@/lib/supabase/client')
      const sb = createClient()
      const since = new Date(Date.now() - 180 * 86400_000).toISOString().slice(0, 10)
      const [{ data: idx }, { data: br }, { data: ff }] = await Promise.all([
        sb.from('daily_index').select('date,isx60,total_value,total_volume,total_trades,traded_companies,listed_companies').not('isx60', 'is', null).gte('date', since).order('date'),
        sb.from('breadth_daily').select('advancers,decliners,unchanged').order('date', { ascending: false }).limit(1),
        sb.from('foreign_flow_company_daily').select('date,ticker,side,value').order('date', { ascending: false }).limit(40),
      ])
      const rows = (idx ?? []) as IndexRow[]
      if (rows.length) {
        setSeries(rows.map(r => ({ time: r.date, value: r.isx60 })))
        setIndex(rows[rows.length - 1])
        setPrevIsx(rows.length > 1 ? rows[rows.length - 2].isx60 : rows[rows.length - 1].isx60)
      }
      if (br?.[0]) setBreadth(br[0] as Breadth)
      if (ff?.length) {
        const latest = (ff as any[])[0].date
        setFlow((ff as any[]).filter(r => r.date === latest).map(r => ({ ticker: r.ticker, side: r.side, value: r.value })))
      }
    })()
  }, [])

  // TTM P/E
  useEffect(() => {
    if (!companies.length) return
    ;(async () => {
      const { createClient } = await import('@/lib/supabase/client')
      const { fetchTtmPe } = await import('@/lib/fundamentals')
      const prices: Record<string, number> = {}
      for (const c of companies) if (c.close > 0) prices[c.sym] = c.close
      if (!Object.keys(prices).length) return
      const res = await fetchTtmPe(createClient(), prices)
      const m: Record<string, number> = {}
      for (const [s, r] of Object.entries(res)) m[s] = r.pe
      setPeMap(m)
    })()
  }, [companies])

  const active = useMemo(() => companies.filter(c => c.close > 0), [companies])
  const coBy   = useMemo(() => new Map(active.map(c => [c.sym, c])), [active])

  const isxChange = index && prevIsx ? ((index.isx60 - prevIsx) / prevIsx) * 100 : 0
  const isxUp = isxChange >= 0

  const movers = useMemo(() => {
    if (moversTab === 'gainers') return [...active].filter(c => c.pct > 0).sort((a, b) => b.pct - a.pct).slice(0, 6)
    if (moversTab === 'losers')  return [...active].filter(c => c.pct < 0).sort((a, b) => a.pct - b.pct).slice(0, 6)
    return [...active].sort((a, b) => (b.vol ?? 0) - (a.vol ?? 0)).slice(0, 6)
  }, [active, moversTab])

  const tape = useMemo(() => [...active].sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct)).slice(0, 14), [active])

  const cheap = useMemo(() => {
    return Object.entries(peMap).filter(([, pe]) => pe > 0).sort((a, b) => a[1] - b[1]).slice(0, 5)
      .map(([sym, pe]) => ({ co: coBy.get(sym), pe })).filter(x => x.co) as { co: Company; pe: number }[]
  }, [peMap, coBy])

  const foreign = useMemo(() => {
    const net = new Map<string, number>()
    for (const f of flow) net.set(f.ticker, (net.get(f.ticker) ?? 0) + (f.side === 'buy' ? f.value : -f.value))
    return Array.from(net.entries()).map(([ticker, v]) => ({ ticker, v })).sort((a, b) => Math.abs(b.v) - Math.abs(a.v)).slice(0, 5)
  }, [flow])

  const sectorPerf = useMemo(() => {
    const m = new Map<string, { sum: number; n: number }>()
    for (const c of active) { const e = m.get(c.sec) ?? { sum: 0, n: 0 }; e.sum += c.pct; e.n++; m.set(c.sec, e) }
    return Array.from(m.entries()).map(([sec, e]) => ({ sec, avg: e.sum / e.n })).filter(x => x.sec).sort((a, b) => b.avg - a.avg)
  }, [active])

  // portfolio snapshot (today's move)
  const port = useMemo(() => {
    if (!lots.length) return null
    const prices: Record<string, number> = {}
    for (const c of active) prices[c.sym] = c.close
    const holdings = aggregate(lots, prices)
    if (!holdings.length) return null
    const t = totals(holdings)
    let today = 0
    for (const h of holdings) { const c = coBy.get(h.sym); if (c) today += h.qty * (c.change ?? 0) }
    const todayPct = t.value - today > 0 ? (today / (t.value - today)) * 100 : 0
    return { value: t.value, pl: t.pl, plPct: t.plPct, today, todayPct, n: holdings.length }
  }, [lots, active, coBy])

  const updated = index?.date ? index.date.split('-').reverse().join('/') : '—'

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '16px 16px 80px' }}>

      {/* ── Ticker tape ── */}
      {tape.length > 0 && (
        <div className="ticker-mask" style={{ overflow: 'hidden', borderBottom: '1px solid var(--line)', margin: '-16px -16px 16px', padding: '8px 16px', background: 'var(--surf)' }}>
          <div className="ticker-track">
            {[...tape, ...tape].map((c, i) => (
              <Link key={i} href={`/c/${c.sym}`} style={{ fontSize: 12, color: 'var(--ink3)', textDecoration: 'none' }}>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink2)', fontWeight: 700 }}>{c.sym}</span>{' '}
                {c.close.toFixed(2)} <span style={{ color: tone(c.pct), fontWeight: 700 }}>{c.pct >= 0 ? '▲' : '▼'}{Math.abs(c.pct).toFixed(1)}%</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Hero: index + breadth + totals ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,1fr)', gap: 14, marginBottom: 14 }} className="home-hero">
        <Card style={{ padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: 12, color: 'var(--ink3)', fontWeight: 700 }}>مؤشر السوق العام ISX60</span>
            <span style={{ fontSize: 11, color: 'var(--ink4)' }}>آخر تحديث {updated}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, marginTop: 6 }}>
            <span style={{ fontSize: 30, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--ink)', lineHeight: 1 }}>{index ? index.isx60.toFixed(2) : '—'}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: tone(isxChange) }}>{isxUp ? '▲' : '▼'} {fmtPct(isxChange)}</span>
          </div>
          {series.length > 1 && <Sparkline data={series} up={isxUp} />}
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Card style={{ padding: 14 }}>
            <div style={{ fontSize: 11.5, color: 'var(--ink3)', fontWeight: 700, marginBottom: 8 }}>نشاط السوق اليوم</div>
            {breadth ? (
              <>
                <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ flex: Math.max(breadth.advancers, 1), background: 'var(--up)' }} />
                  <div style={{ flex: Math.max(breadth.unchanged, 1), background: 'var(--surf3)' }} />
                  <div style={{ flex: Math.max(breadth.decliners, 1), background: 'var(--dn)' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginTop: 6, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                  <span style={{ color: 'var(--up)' }}>{breadth.advancers} ▲</span>
                  <span style={{ color: 'var(--ink4)' }}>{breadth.unchanged} —</span>
                  <span style={{ color: 'var(--dn)' }}>{breadth.decliners} ▼</span>
                </div>
              </>
            ) : <div className="skeleton" style={{ height: 28 }} />}
          </Card>
          <div style={{ display: 'flex', gap: 10 }}>
            {[
              { l: 'قيمة التداول', v: fmtBig(index?.total_value) },
              { l: 'حجم التداول', v: fmtBig(index?.total_volume) },
              { l: 'الصفقات', v: index?.total_trades ? Math.round(index.total_trades).toLocaleString('en') : '—' },
            ].map(s => (
              <Card key={s.l} style={{ padding: '10px 12px', flex: 1 }}>
                <div style={{ fontSize: 10, color: 'var(--ink4)', fontWeight: 600 }}>{s.l}</div>
                <div style={{ fontSize: 14, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--ink)', marginTop: 3 }}>{s.v}</div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* ── Portfolio band ── */}
      {port ? (
        <Link href="/portfolio" style={{ textDecoration: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, background: 'var(--brand-soft)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: '12px 16px', marginBottom: 14 }}>
            <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
              <div><div style={{ fontSize: 10.5, color: 'var(--ink4)', fontWeight: 600 }}>قيمة محفظتي</div><div style={{ fontSize: 16, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>{fmtIQD(port.value)} د.ع</div></div>
              <div><div style={{ fontSize: 10.5, color: 'var(--ink4)', fontWeight: 600 }}>تغيّر اليوم</div><div style={{ fontSize: 16, fontWeight: 800, fontFamily: 'var(--font-mono)', color: tone(port.today) }}>{port.today >= 0 ? '+' : '−'}{fmtIQD(Math.abs(port.today))}</div></div>
              <div><div style={{ fontSize: 10.5, color: 'var(--ink4)', fontWeight: 600 }}>إجمالي العائد</div><div style={{ fontSize: 16, fontWeight: 800, fontFamily: 'var(--font-mono)', color: tone(port.pl) }}>{fmtPct(port.plPct)}</div></div>
            </div>
            <span style={{ fontSize: 12, color: 'var(--brand)', fontWeight: 700 }}>إدارة المحفظة ←</span>
          </div>
        </Link>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, background: 'var(--brand-soft)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: '12px 16px', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>سوِّ حساب وتابع استثماراتك بدقة</div>
            <div style={{ fontSize: 11.5, color: 'var(--ink3)' }}>كل شي تحتاجه كمستثمر بالسوق العراقي بمكان واحد</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href="/portfolio" style={{ fontSize: 12.5, fontWeight: 700, background: 'var(--brand)', color: '#fff', padding: '8px 14px', borderRadius: 'var(--r-md)', textDecoration: 'none' }}>أنشئ محفظتك</Link>
            {!user && <button onClick={() => openAuth('signin')} style={{ fontSize: 12.5, fontWeight: 700, background: 'transparent', color: 'var(--brand)', border: '1px solid var(--brand)', padding: '8px 14px', borderRadius: 'var(--r-md)', cursor: 'pointer', fontFamily: 'inherit' }}>دخول</button>}
          </div>
        </div>
      )}

      {/* ── Movers + Foreign flow ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,1fr)', gap: 14, marginBottom: 14 }} className="home-2col">
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <h2 style={{ fontSize: 14, fontWeight: 800, margin: 0, color: 'var(--ink)' }}>الأكثر حركة</h2>
            <div style={{ display: 'flex', gap: 4 }}>
              {([['gainers', 'أعلى الرابحين', '▲'], ['losers', 'أعلى الخاسرين', '▼'], ['active', 'الأنشط', '']] as const).map(([id, lbl, arrow]) => (
                <button key={id} onClick={() => setMoversTab(id)} style={{ fontSize: 11.5, fontWeight: 700, padding: '4px 10px', borderRadius: 'var(--r-sm)', border: 'none', cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 4, background: moversTab === id ? 'var(--brand)' : 'transparent', color: moversTab === id ? '#fff' : 'var(--ink3)' }}>
                  {arrow && <span style={{ fontSize: 8 }}>{arrow}</span>}{lbl}
                </button>
              ))}
            </div>
          </div>
          {active.length ? movers.map(co => (
            <CoRow key={co.sym} co={co} right={
              <div style={{ textAlign: 'end' }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>{co.close.toFixed(2)}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: tone(co.pct) }}>{moversTab === 'active' ? fmtBig(co.vol) : fmtPct(co.pct)}</div>
              </div>
            } />
          )) : <div className="skeleton" style={{ height: 200, marginTop: 8 }} />}
        </Card>

        <Card>
          <SectionTitle title="حركة المستثمرين الأجانب" href="/statistics/foreign-flow" action="التفاصيل" />
          {foreign.length ? foreign.map(f => {
            const co = coBy.get(f.ticker)
            return (
              <Link key={f.ticker} href={`/c/${f.ticker}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--line)', textDecoration: 'none' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MiniLogo sym={f.ticker} logo={co?.logo} size={22} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>{co?.ar || f.ticker}</span>
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: tone(f.v) }}>{f.v >= 0 ? '+' : '−'}{fmtBig(Math.abs(f.v))}</span>
              </Link>
            )
          }) : <div style={{ fontSize: 12, color: 'var(--ink4)', padding: '20px 0', textAlign: 'center' }}>لا توجد بيانات لليوم</div>}
        </Card>
      </div>

      {/* ── Sectors + Value (P/E) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 14, marginBottom: 14 }} className="home-2col">
        <Card>
          <SectionTitle title="أداء القطاعات" href="/heatmap" action="الخريطة الحرارية" />
          {sectorPerf.length ? sectorPerf.slice(0, 6).map(s => (
            <div key={s.sec} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
              <span style={{ fontSize: 12, color: 'var(--ink2)', width: 90, flexShrink: 0 }}>{sectorAr(s.sec)}</span>
              <div style={{ flex: 1, height: 6, background: 'var(--surf3)', borderRadius: 3, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', insetInlineStart: '50%', top: 0, bottom: 0, width: `${Math.min(Math.abs(s.avg) * 8, 50)}%`, transform: s.avg >= 0 ? 'none' : 'translateX(-100%)', background: tone(s.avg) }} />
              </div>
              <span style={{ fontSize: 11.5, fontWeight: 700, fontFamily: 'var(--font-mono)', color: tone(s.avg), width: 52, textAlign: 'end' }}>{fmtPct(s.avg)}</span>
            </div>
          )) : <div className="skeleton" style={{ height: 180 }} />}
        </Card>

        <Card>
          <SectionTitle title="الأرخص تقييماً" href="/screener" action="الفارز" />
          <div style={{ fontSize: 10.5, color: 'var(--ink4)', marginTop: -6, marginBottom: 4 }}>مكرر الربحية (TTM)</div>
          {cheap.length ? cheap.map(({ co, pe }) => (
            <CoRow key={co.sym} co={co} right={<span style={{ fontSize: 13, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>{pe >= 100 ? Math.round(pe) : pe.toFixed(1)}×</span>} />
          )) : <div className="skeleton" style={{ height: 180 }} />}
        </Card>
      </div>

      {/* ── News ── */}
      {news.length > 0 && (
        <Card>
          <SectionTitle title="أخبار السوق" href="/news" />
          {news.map(n => (
            <Link key={n.slug} href={`/news/${n.slug}`} style={{ display: 'flex', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--line)', textDecoration: 'none' }}>
              <span style={{ fontSize: 11, color: 'var(--ink4)', fontFamily: 'var(--font-mono)', flexShrink: 0, width: 64 }}>{n.date.slice(0, 10).split('-').reverse().slice(0, 2).join('/')}</span>
              <span style={{ fontSize: 12.5, color: 'var(--ink2)', lineHeight: 1.5 }}>{n.title}</span>
            </Link>
          ))}
        </Card>
      )}

      <p style={{ fontSize: 11, color: 'var(--ink5)', marginTop: 16, textAlign: 'center' }}>
        البيانات من نشرات التداول الرسمية لبورصة العراق، تُحدَّث يومياً · القيمة السوقية والمكرر تقريبية
      </p>
    </div>
  )
}
