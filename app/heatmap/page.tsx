'use client'

import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { companyName, fetchCompanyMeta } from '@/lib/market'
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
  { id: '1d',  label: 'يوم',    cap: 3  },
  { id: '1w',  label: 'أسبوع',  cap: 6  },
  { id: '1m',  label: 'شهر',    cap: 12 },
  { id: '3m',  label: '3 أشهر', cap: 20 },
  { id: 'ytd', label: 'العام',  cap: 40 },
  { id: '52w', label: 'سنة',    cap: 60 },
] as const
type PeriodId = typeof PERIODS[number]['id']

const SECTOR_AR: Record<string, string> = {
  Banks: 'المصارف', Industry: 'الصناعة', Services: 'الخدمات', Tourism: 'الفنادق والسياحة',
  Investment: 'الاستثمار المالي', Insurance: 'التأمين', Telecom: 'الاتصالات', Agriculture: 'الزراعة',
  'Money Transfer': 'التحويل المالي', Other: 'أخرى',
}

function pctFor(r: Row, p: PeriodId): number | null {
  const ref = ({ '1d': r.prev_close, '1w': r.close_1w, '1m': r.close_1m, '3m': r.close_3m, ytd: r.close_yend, '52w': r.close_52w } as const)[p]
  if (!ref) return null
  return ((r.last_close - ref) / ref) * 100
}

function fmtIQD(v: number): string {
  if (v >= 1e12) return (v / 1e12).toFixed(2) + 'T IQD'
  if (v >= 1e9) return (v / 1e9).toFixed(1) + 'B IQD'
  if (v >= 1e6) return (v / 1e6).toFixed(0) + 'M IQD'
  return Math.round(v).toLocaleString('en-US') + ' IQD'
}

// ── squarified treemap (Bruls et al.), laid out in a 0-100 unit box ──────────
// Percentages rather than pixels: the tiles then reflow with the card on their
// own, the way the design's own inline sizes do.
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

// A tile carries its intensity the way the design does: one tone per direction,
// mixed toward the base by how big the move is.
function tileStyle(box: { x: number; y: number; w: number; h: number }, pct: number | null, cap: number): CSSProperties {
  const mix = pct == null ? 0 : Math.max(12, Math.min(100, (Math.abs(pct) / cap) * 100))
  return {
    left: `${box.x}%`,
    insetBlockStart: `${box.y}%`,
    inlineSize: `${box.w}%`,
    blockSize: `${box.h}%`,
    ['--tile-mix' as string]: `${mix}%`,
    ['--tile-text' as string]: pct == null ? 'var(--text-primary)' : '#f2f5ee',
  } as CSSProperties
}

const tone = (pct: number | null) => (pct == null ? 'neutral' : pct > 0 ? 'positive' : pct < 0 ? 'negative' : 'neutral')
const pctText = (pct: number | null) => (pct == null ? '·' : `${pct > 0 ? '+' : ''}${pct.toFixed(pct === 0 ? 1 : 2)}%`)
const arrow = (pct: number | null) => (pct == null || pct === 0 ? '' : pct > 0 ? '↗' : '↘')

export default function HeatmapPage() {
  const router = useRouter()
  const [rows, setRows]       = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod]   = useState<PeriodId>('1d')
  // null = every sector; otherwise the sector we drilled into.
  const [zoom, setZoom]       = useState<string | null>(null)
  const mapRef = useRef<HTMLDivElement>(null)
  const [size, setSize]       = useState({ w: 0, h: 0 })

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
          return { ...m, name: companyName({ ...m, ar: mt?.ar, en: mt?.en }, m.ticker), mcap }
        }).filter(r => r.mcap > 0 && (r.days_since_trade ?? 0) <= STALE_DAYS)
        setRows(merged)
      } finally { setLoading(false) }
    })()
  }, [])

  // Pixel size drives nothing but the compact/full tile choice — the tiles
  // themselves are laid out in percentages.
  useEffect(() => {
    const el = mapRef.current
    if (!el) return
    const ro = new ResizeObserver(es => setSize({ w: es[0].contentRect.width, h: es[0].contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [loading, zoom])

  const cap = PERIODS.find(p => p.id === period)!.cap

  const sectors = useMemo(() => {
    const bySector = new Map<string, Row[]>()
    for (const r of rows) (bySector.get(r.sector) ?? bySector.set(r.sector, []).get(r.sector)!).push(r)
    return Array.from(bySector.entries()).map(([key, list]) => {
      // Cap-weighted sector move, over the names that actually have a reading.
      let wsum = 0, w = 0
      for (const r of list) {
        const p = pctFor(r, period)
        if (p == null) continue
        wsum += p * r.mcap; w += r.mcap
      }
      return {
        key,
        label: SECTOR_AR[key] ?? key,
        list,
        mcap: list.reduce((s, r) => s + r.mcap, 0),
        pct: w ? wsum / w : null,
      }
    })
  }, [rows, period])

  const zoomed = zoom ? sectors.find(s => s.key === zoom) ?? null : null

  const sectorBoxes = useMemo(
    () => squarify(sectors.map(s => ({ item: s, value: s.mcap })), 0, 0, 100, 100),
    [sectors],
  )
  const companyBoxes = useMemo(
    () => (zoomed ? squarify(zoomed.list.map(r => ({ item: r, value: r.mcap })), 0, 0, 100, 100) : []),
    [zoomed],
  )

  // A tile is "compact" when it has no room for the full title/change/value
  // set — the display face alone runs to 2rem, so the bar is high.
  const isCompact = (box: { w: number; h: number }) =>
    (box.w / 100) * size.w < 168 || (box.h / 100) * size.h < 124

  // Below this even the compact face is taller than its tile, and the text
  // renders half-cut. Those tiles carry their colour and their tooltip only.
  const isMicro = (box: { w: number; h: number }) =>
    (box.w / 100) * size.w < 62 || (box.h / 100) * size.h < 46

  return (
    <main className="terminal-shell app-page heatmap-page">
      <header className="full-heatmap-heading">
        <div>
          <h1>خريطة السوق</h1>
          <p>
            حجم المربع = القيمة السوقية · اللون = التغيّر
            {zoomed
              ? <> · شركات {zoomed.label} (<bdi>{zoomed.list.length}</bdi>)</>
              : <> · اختر قطاعاً لعرض الشركات المكوّنة له · <bdi>{rows.length || '…'}</bdi> شركة</>}
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
          <div className="heatmap-context-row">
            <nav className="heatmap-breadcrumb" aria-label="مسار الخريطة">
              {zoomed ? (
                <>
                  <button type="button" onClick={() => setZoom(null)}>كل القطاعات</button>
                  <span aria-hidden="true">›</span>
                  <strong>{zoomed.label}</strong>
                </>
              ) : (
                <strong>كل القطاعات</strong>
              )}
            </nav>
            <div className="heatmap-legend" aria-label="دليل شدة الحركة">
              <span><bdi>{`−${cap}%`}</bdi></span>
              <i aria-hidden="true" />
              <span><bdi>{`+${cap}%`}</bdi></span>
            </div>
          </div>

          <div className="full-market-heatmap" ref={mapRef} aria-label={zoomed ? `شركات ${zoomed.label}` : 'كل قطاعات السوق'}>
            {zoomed
              ? companyBoxes.map(box => {
                  const r = box.item
                  const pct = pctFor(r, period)
                  return (
                    <button
                      key={r.ticker}
                      type="button"
                      className={`heatmap-tile ${tone(pct)}${isCompact(box) ? ' compact' : ''}`}
                      style={tileStyle(box, pct, cap)}
                      title={`${r.name} (${r.ticker}) · ${pctText(pct)} · ${fmtIQD(r.mcap)}`}
                      onClick={() => router.push(`/c/${r.ticker}`)}
                    >
                      {isMicro(box) ? null : (
                        <>
                          <span className="heatmap-tile-title">
                            <strong>{r.ticker}</strong>
                            <bdi>{r.name}</bdi>
                          </span>
                          <span className="heatmap-tile-change">
                            {arrow(pct) ? <i aria-hidden="true">{arrow(pct)}</i> : null}
                            <bdi>{pctText(pct)}</bdi>
                          </span>
                          <small><bdi>{fmtIQD(r.mcap)}</bdi></small>
                        </>
                      )}
                    </button>
                  )
                })
              : sectorBoxes.map(box => {
                  const s = box.item
                  return (
                    <button
                      key={s.key}
                      type="button"
                      className={`heatmap-tile ${tone(s.pct)}${isCompact(box) ? ' compact' : ''}`}
                      style={tileStyle(box, s.pct, cap)}
                      title={`${s.label} · ${pctText(s.pct)} · ${fmtIQD(s.mcap)}`}
                      onClick={() => setZoom(s.key)}
                    >
                      {isMicro(box) ? null : (
                        <>
                          <span className="heatmap-tile-title">
                            <strong>{s.label}</strong>
                            <bdi>{s.list.length} شركة</bdi>
                          </span>
                          <span className="heatmap-tile-change">
                            {arrow(s.pct) ? <i aria-hidden="true">{arrow(s.pct)}</i> : null}
                            <bdi>{pctText(s.pct)}</bdi>
                          </span>
                          <small><bdi>{fmtIQD(s.mcap)}</bdi></small>
                        </>
                      )}
                    </button>
                  )
                })}
          </div>
        </section>
      )}

      <p className="page-footnote">
        {zoomed
          ? 'انقر أي مربع لفتح صفحة الشركة · تغيّر القطاع محسوب بوزن القيمة السوقية'
          : 'انقر أي قطاع لعرض شركاته · تغيّر القطاع محسوب بوزن القيمة السوقية'}
        {' · '}البيانات من نشرات التداول الرسمية، تُحدَّث يومياً
      </p>
    </main>
  )
}
