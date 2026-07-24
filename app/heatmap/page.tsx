'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchCompanyMeta } from '@/lib/market'
import type { CompanyMeta } from '@/types'

// ── types ────────────────────────────────────────────────────────────────────
type Metric = {
  ticker: string; sector: string; name_en: string | null; name_ar: string | null
  last_close: number; prev_close: number | null
  close_1w: number | null; close_1m: number | null; close_3m: number | null
  close_yend: number | null; close_52w: number | null
  days_since_trade: number | null
}
type Row = Metric & { name: string; mcap: number }

// Hide stocks that haven't traded in this many days · suspended/delisted names
// would otherwise fill the map with dead, neutral 0% tiles.
const STALE_DAYS = 60

// ── period config ─────────────────────────────────────────────────────────────
const PERIODS = [
  { id: '1d',  label: 'يوم',    key: 'prev_close', cap: 3  },
  { id: '1w',  label: 'أسبوع',  key: 'close_1w',   cap: 6  },
  { id: '1m',  label: 'شهر',    key: 'close_1m',   cap: 12 },
  { id: '3m',  label: '٣ أشهر', key: 'close_3m',   cap: 20 },
  { id: 'ytd', label: 'العام',  key: 'close_yend', cap: 40 },
  { id: '52w', label: 'سنة',    key: 'close_52w',  cap: 60 },
] as const
type PeriodId = typeof PERIODS[number]['id']

const SECTOR_AR: Record<string, string> = {
  Banks: 'بنوك', Industry: 'صناعة', Services: 'خدمات', Tourism: 'سياحة وفنادق',
  Investment: 'استثمار', Insurance: 'تأمين', Telecom: 'اتصالات', Agriculture: 'زراعة',
  'Money Transfer': 'تحويل مالي', Other: 'أخرى',
}

function pctFor(r: Row, p: PeriodId): number | null {
  const ref = ({ '1d': r.prev_close, '1w': r.close_1w, '1m': r.close_1m, '3m': r.close_3m, ytd: r.close_yend, '52w': r.close_52w } as const)[p]
  if (!ref) return null
  return ((r.last_close - ref) / ref) * 100
}

// ── diverging color scale: red → neutral → green, clamped at the period cap ──
function tileColor(pct: number | null, cap: number): string {
  if (pct == null) return 'rgb(72,77,88)'
  const t = Math.max(-1, Math.min(1, pct / cap))
  const NEU = [72, 77, 88], NEG = [201, 49, 49], POS = [34, 163, 89]
  const [a, b] = t < 0 ? [NEU, NEG] : [NEU, POS]
  const k = Math.abs(t)
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * k))
  return `rgb(${c[0]},${c[1]},${c[2]})`
}

// ── squarified treemap (Bruls et al.) ────────────────────────────────────────
type Wt<T> = { item: T; value: number }
type Box<T> = { item: T; x: number; y: number; w: number; h: number }
function squarify<T>(input: Wt<T>[], X: number, Y: number, W: number, H: number): Box<T>[] {
  const out: Box<T>[] = []
  const sorted = input.filter(i => i.value > 0).sort((a, b) => b.value - a.value)
  const sum = sorted.reduce((s, i) => s + i.value, 0)
  if (sum <= 0 || W <= 0 || H <= 0) return out
  const nodes = sorted.map(i => ({ item: i.item, area: (i.value / sum) * (W * H) }))

  let x = X, y = Y, w = W, h = H, i = 0
  const worst = (rs: number, mn: number, mx: number, side: number) => {
    const s2 = rs * rs, side2 = side * side
    return Math.max((side2 * mx) / s2, s2 / (side2 * mn))
  }
  while (i < nodes.length) {
    const side = Math.min(w, h)
    const row: typeof nodes = []
    let rSum = 0, rMin = Infinity, rMax = 0, k = i
    for (; k < nodes.length; k++) {
      const a = nodes[k].area
      const nMin = Math.min(rMin, a), nMax = Math.max(rMax, a), nSum = rSum + a
      const newW = worst(nSum, nMin, nMax, side)
      const oldW = row.length ? worst(rSum, rMin, rMax, side) : Infinity
      if (row.length === 0 || newW <= oldW) { row.push(nodes[k]); rSum = nSum; rMin = nMin; rMax = nMax }
      else break
    }
    if (w >= h) {
      const colW = rSum / h
      let cy = y
      for (const n of row) { const cellH = n.area / colW; out.push({ item: n.item, x, y: cy, w: colW, h: cellH }); cy += cellH }
      x += colW; w -= colW
    } else {
      const rowH = rSum / w
      let cx = x
      for (const n of row) { const cellW = n.area / rowH; out.push({ item: n.item, x: cx, y, w: cellW, h: rowH }); cx += cellW }
      y += rowH; h -= rowH
    }
    i = k
  }
  return out
}

export default function HeatmapPage() {
  const router = useRouter()
  const [rows, setRows]       = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod]   = useState<PeriodId>('1d')
  const wrapRef = useRef<HTMLDivElement>(null)
  const [width, setWidth]     = useState(0)

  useEffect(() => {
    ;(async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const [{ data }, meta] = await Promise.all([
          createClient().from('company_metrics').select('ticker,sector,name_en,name_ar,last_close,prev_close,close_1w,close_1m,close_3m,close_yend,close_52w,days_since_trade'),
          fetchCompanyMeta().catch(() => [] as CompanyMeta[]),
        ])
        const metaBy = new Map(meta.map(m => [m.sym, m]))
        const merged: Row[] = ((data ?? []) as Metric[]).map(m => {
          const mt = metaBy.get(m.ticker)
          // Market cap consistent with the live price (price × shares), like the
          // screener · the static companies.json figure is stale. Fall back to it
          // only when the share count is unknown.
          const mcap = (m.last_close > 0 && mt?.shares)
            ? m.last_close * mt.shares
            : (mt?.mcap ?? 0)
          return { ...m, name: mt?.ar || m.name_ar || m.name_en || m.ticker, mcap }
        }).filter(r => r.mcap > 0 && (r.days_since_trade ?? 0) <= STALE_DAYS)
        setRows(merged)
      } finally { setLoading(false) }
    })()
  }, [])

  // responsive width
  useEffect(() => {
    if (!wrapRef.current) return
    const ro = new ResizeObserver(es => setWidth(es[0].contentRect.width))
    ro.observe(wrapRef.current)
    return () => ro.disconnect()
  }, [loading])

  const cap = PERIODS.find(p => p.id === period)!.cap
  const H = Math.max(440, Math.min(width * 0.58, 760))
  const HEADER = 17 // sector-label strip height

  // nested layout: sectors → companies
  const tiles = useMemo(() => {
    if (!width || !rows.length) return [] as { r: Row; pct: number | null; x: number; y: number; w: number; h: number }[]
    const bySector = new Map<string, Row[]>()
    for (const r of rows) (bySector.get(r.sector) ?? bySector.set(r.sector, []).get(r.sector)!).push(r)
    const sectors = Array.from(bySector.entries()).map(([sec, list]) => ({
      item: { sec, list }, value: list.reduce((s, r) => s + r.mcap, 0),
    }))
    const secBoxes = squarify(sectors, 1, 1, width - 2, H - 2)
    const result: { r: Row; pct: number | null; x: number; y: number; w: number; h: number }[] = []
    for (const sb of secBoxes) {
      const innerY = sb.y + (sb.h > 46 ? HEADER : 0)
      const innerH = sb.h - (sb.h > 46 ? HEADER : 0)
      const comp = sb.item.list.map(r => ({ item: r, value: r.mcap }))
      const cBoxes = squarify(comp, sb.x + 1, innerY + 1, sb.w - 2, innerH - 1)
      for (const cb of cBoxes) result.push({ r: cb.item, pct: pctFor(cb.item, period), ...cb })
    }
    return result
  }, [rows, width, period, H])

  // sector header boxes (for labels)
  const secHeaders = useMemo(() => {
    if (!width || !rows.length) return [] as { sec: string; x: number; y: number; w: number; h: number }[]
    const bySector = new Map<string, Row[]>()
    for (const r of rows) (bySector.get(r.sector) ?? bySector.set(r.sector, []).get(r.sector)!).push(r)
    const sectors = Array.from(bySector.entries()).map(([sec, list]) => ({
      item: { sec, list }, value: list.reduce((s, r) => s + r.mcap, 0),
    }))
    return squarify(sectors, 1, 1, width - 2, H - 2).map(b => ({
      sec: b.item.sec, x: b.x, y: b.y, w: b.w, h: b.h,
    }))
  }, [rows, width, H])

  return (
    <main className="terminal-shell app-page heatmap-page">
      <header className="full-heatmap-heading">
        <div>
          <h1>خريطة السوق الحرارية</h1>
          <p>
            حجم المربع = القيمة السوقية · اللون = التغيّر · مرتبة حسب القطاع · <bdi>{rows.length || '…'}</bdi> شركة
          </p>
        </div>
        <div className="heatmap-period">
          <span>التغيّر:</span>
          <div className="seg-control" role="group" aria-label="فترة التغيّر">
            {PERIODS.map(p => (
              <button
                key={p.id}
                type="button"
                className={period === p.id ? 'seg-btn is-active' : 'seg-btn'}
                aria-pressed={period === p.id}
                onClick={() => setPeriod(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {loading ? (
        <div className="skeleton" style={{ height: 520, borderRadius: 14 }} />
      ) : (
        <section className="app-card full-heatmap-card" aria-label="الخريطة الحرارية الكاملة">
          <div ref={wrapRef} className="heatmap-canvas" style={{ height: H }}>
            {/* sector frames + labels */}
            {secHeaders.map(s => (
              <div key={`f-${s.sec}`} style={{ position: 'absolute', left: s.x, top: s.y, width: s.w, height: s.h, pointerEvents: 'none', boxShadow: 'inset 0 0 0 1px var(--surf2)' }}>
                {s.h > 46 && (
                  <div style={{ height: 17, display: 'flex', alignItems: 'center', padding: '0 7px', fontSize: 10.5, fontWeight: 800, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {SECTOR_AR[s.sec] ?? s.sec}
                  </div>
                )}
              </div>
            ))}
            {/* company tiles */}
            {tiles.map(t => {
              const big = t.w > 54 && t.h > 30
              const med = t.w > 34 && t.h > 18
              const pctTxt = t.pct == null ? '' : `${t.pct >= 0 ? '+' : ''}${t.pct.toFixed(1)}%`
              return (
                <div key={t.r.ticker} title={`${t.r.name} (${t.r.ticker}) · ${pctTxt || '·'}`}
                  onClick={() => router.push(`/c/${t.r.ticker}`)}
                  style={{
                    position: 'absolute', left: t.x, top: t.y, width: t.w, height: t.h,
                    background: tileColor(t.pct, cap), cursor: 'pointer', overflow: 'hidden',
                    boxShadow: 'inset 0 0 0 0.5px rgba(0,0,0,.35)', display: 'flex',
                    flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,.45)', lineHeight: 1.1,
                    transition: 'filter .12s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.18)')}
                  onMouseLeave={e => (e.currentTarget.style.filter = 'none')}>
                  {med && <span dir="ltr" style={{ fontSize: big ? 13 : 10.5, fontWeight: 800, fontFamily: 'var(--font-mono)' }}>{t.r.ticker}</span>}
                  {big && <span dir="ltr" style={{ fontSize: 11, fontWeight: 700, opacity: .95, fontFamily: 'var(--font-mono)' }}>{pctTxt}</span>}
                </div>
              )
            })}
          </div>

          {/* legend */}
          <div className="heatmap-legend">
            <span>{`−${cap}%`}</span>
            <div className="heatmap-legend-scale">
              {[-1, -0.66, -0.33, 0, 0.33, 0.66, 1].map(t => (
                <div key={t} style={{ background: tileColor(t * cap, cap) }} />
              ))}
            </div>
            <span>{`+${cap}%`}</span>
          </div>
        </section>
      )}

      <p className="page-footnote">
        البيانات من نشرات التداول الرسمية، تُحدَّث يومياً · القيمة السوقية تقريبية · انقر أي مربع لفتح صفحة الشركة
      </p>
    </main>
  )
}
