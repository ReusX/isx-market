'use client'

import { type PointerEvent, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { fetchLive, fetchCompanyMeta, mergeCompanies, SECTORS } from '@/lib/market'
import { ForeignFlowGauge } from '@/components/design/ForeignFlowGauge'
import { Sparkline } from '@/components/design/Sparkline'
import { SectorPerformanceChipRow } from '@/components/design/SectorPerformanceChipRow'
import type { SectorDatum } from '@/components/design/magnitude'
import type { Company } from '@/types'

type SortKey = 'mcap' | 'price' | 'change' | 'volume' | 'value'
type ChartPoint = { x: number; y: number; value: string; time: string }

type IndexRow = {
  date: string
  isx60: number
  total_value: number | null
  total_volume: number | null
  total_trades: number | null
}

const nf = new Intl.NumberFormat('en-US')
const money = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 })
const priceFormat = new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

const SECTOR_AR = new Map(SECTORS.filter(s => s.id !== 'all').map(s => [s.id, s.ar]))

// Live market cap in IQD: close x shares when we know the share count, else the
// static fallback carried on the company meta (which is stored in millions).
const liveMcap = (c: Company) => (c.shares && c.close > 0 ? c.close * c.shares : (c.mcap || 0) * 1e6)

/**
 * Build the ISX60 path + area fill from the real index series.
 *
 * Deliberately a straight polyline, not a spline: an index chart has to show
 * the actual session-to-session steps. Bezier smoothing invents motion between
 * closes that never happened and reads as a decorative curve rather than a
 * market chart.
 */
function buildIndexPath(values: number[], w = 760, h = 260, pad = 18) {
  if (values.length < 2) return { line: '', area: '', points: [] as { x: number; y: number }[] }
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const pts = values.map((v, i) => ({
    x: (i / (values.length - 1)) * w,
    y: h - pad - ((v - min) / span) * (h - pad * 2),
  }))
  const line = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ')
  return { line, area: `${line} L${w},${h} L0,${h} Z`, points: pts }
}

function StatIcon({ type }: { type: string }) {
  return <span className={`stat-icon ${type}`} aria-hidden="true" />
}

export default function HomeClient() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [series, setSeries] = useState<IndexRow[]>([])
  const [flow, setFlow] = useState<{ buy: number; sell: number; date: string } | null>(null)
  const [sparks, setSparks] = useState<Record<string, number[]>>({})
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('mcap') // company listings default to market cap, desc
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [activePoint, setActivePoint] = useState<ChartPoint | null>(null)

  // ── prices + company meta ────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([fetchLive(), fetchCompanyMeta()])
      .then(([live, meta]) => setCompanies(mergeCompanies(meta, live.stocks)))
      .catch(() => setFailed(true))
      .finally(() => setLoading(false))
  }, [])

  // ── index series, foreign flow, 7-session sparklines ─────────────────────
  useEffect(() => {
    ;(async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const sb = createClient()
        const since = new Date(Date.now() - 90 * 86400_000).toISOString().slice(0, 10)

        const [{ data: idx }, { data: ff }] = await Promise.all([
          sb.from('daily_index')
            .select('date,isx60,total_value,total_volume,total_trades')
            .not('isx60', 'is', null).gte('date', since).order('date'),
          sb.from('foreign_flow_company_daily')
            .select('date,side,value').order('date', { ascending: false }).limit(400),
        ])

        const rows = (idx ?? []) as IndexRow[]
        if (rows.length) setSeries(rows)

        if (ff?.length) {
          const latest = (ff as { date: string }[])[0].date
          const today = (ff as { date: string; side: string; value: number }[]).filter(r => r.date === latest)
          setFlow({
            buy: today.filter(r => r.side === 'buy').reduce((s, r) => s + (r.value ?? 0), 0),
            sell: today.filter(r => r.side === 'sell').reduce((s, r) => s + (r.value ?? 0), 0),
            date: latest,
          })
        }

        // 7-session close history per ticker for the table's 7D column.
        const sparkSince = new Date(Date.now() - 21 * 86400_000).toISOString().slice(0, 10)
        const { data: hist } = await sb.from('daily_prices')
          .select('ticker,date,close').gte('date', sparkSince).order('date')
        if (hist?.length) {
          const by: Record<string, number[]> = {}
          for (const r of hist as { ticker: string; close: number }[]) {
            if (r.close == null) continue
            ;(by[r.ticker] ??= []).push(r.close)
          }
          for (const k of Object.keys(by)) by[k] = by[k].slice(-7)
          setSparks(by)
        }
      } catch {
        /* index/flow are enhancements — the page still works without them */
      }
    })()
  }, [])

  const latest = series.length ? series[series.length - 1] : null
  const prev = series.length > 1 ? series[series.length - 2] : null
  const isxChange = latest && prev ? latest.isx60 - prev.isx60 : 0
  const isxPct = latest && prev && prev.isx60 ? (isxChange / prev.isx60) * 100 : 0
  const hasTradingData = Boolean(latest)

  // Use every session in the window · a real index line should show each step,
  // not a decimated, smoothed sample of them.
  const chart = useMemo(() => buildIndexPath(series.map(r => r.isx60)), [series])
  const chartRows = series

  // Only companies that actually traded in the latest session drive "today" widgets.
  const active = useMemo(() => companies.filter(c => c.close > 0), [companies])
  const traded = useMemo(() => active.filter(c => !c.stale), [active])

  const stats = useMemo(() => {
    if (!latest) return []
    const trend = (key: keyof IndexRow) =>
      series.slice(-7).map(r => Number(r[key] ?? 0)).filter(n => Number.isFinite(n))
    const pct = (key: keyof IndexRow) => {
      const now = Number(latest[key] ?? 0), before = Number(prev?.[key] ?? 0)
      return before ? ((now - before) / before) * 100 : 0
    }
    const fmtPct = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`
    return [
      { label: 'قيمة التداول', value: money.format(latest.total_value ?? 0), unit: 'IQD', change: fmtPct(pct('total_value')), icon: 'coin', trend: trend('total_value') },
      { label: 'حجم التداول', value: money.format(latest.total_volume ?? 0), unit: 'سهم', change: fmtPct(pct('total_volume')), icon: 'bars', trend: trend('total_volume') },
      { label: 'الصفقات', value: nf.format(latest.total_trades ?? 0), unit: 'صفقة', change: fmtPct(pct('total_trades')), icon: 'swap', trend: trend('total_trades') },
    ]
  }, [latest, prev, series])

  // Sector performance: value-weighted average change across today's traded names.
  const sectorData = useMemo<SectorDatum[]>(() => {
    const acc = new Map<string, { wsum: number; w: number; value: number }>()
    for (const c of traded) {
      const ar = SECTOR_AR.get(c.sec)
      if (!ar) continue
      const weight = liveMcap(c) || 1
      const e = acc.get(ar) ?? { wsum: 0, w: 0, value: 0 }
      e.wsum += c.pct * weight
      e.w += weight
      e.value += (c.vol ?? 0)
      acc.set(ar, e)
    }
    return Array.from(acc.entries())
      .map(([name, e]) => ({ name, change: e.w ? e.wsum / e.w : 0, value: e.value }))
      .filter(s => Number.isFinite(s.change))
  }, [traded])

  const topMovers = useMemo(() => ([
    { title: 'أعلى الرابحين', items: [...traded].filter(c => c.pct > 0).sort((a, b) => b.pct - a.pct).slice(0, 3), metric: 'change' as const },
    { title: 'أعلى الخاسرين', items: [...traded].filter(c => c.pct < 0).sort((a, b) => a.pct - b.pct).slice(0, 3), metric: 'change' as const },
    { title: 'الأنشط', items: [...traded].sort((a, b) => (b.vol ?? 0) - (a.vol ?? 0)).slice(0, 3), metric: 'volume' as const },
  ]), [traded])

  const sortedCompanies = useMemo(() => {
    const val = (c: Company) =>
      sortKey === 'price' ? c.close
      : sortKey === 'change' ? c.pct
      : sortKey === 'volume' ? (c.vol ?? 0)
      : sortKey === 'value' ? (c.vol ?? 0)
      : liveMcap(c)
    return [...active].sort((a, b) => (sortDir === 'asc' ? val(a) - val(b) : val(b) - val(a))).slice(0, 25)
  }, [active, sortKey, sortDir])

  function sortBy(key: SortKey) {
    if (key === sortKey) { setSortDir(d => (d === 'asc' ? 'desc' : 'asc')); return }
    setSortKey(key); setSortDir('desc')
  }

  function updateChartPoint(event: PointerEvent<HTMLDivElement>) {
    if (!chart.points.length) return
    const rect = event.currentTarget.getBoundingClientRect()
    // SVG content does not mirror under dir="rtl" — the path is drawn oldest at
    // x=0 (visual left) through newest at x=760, so map the pointer straight.
    const ratio = (event.clientX - rect.left) / rect.width
    const chartX = Math.max(0, Math.min(760, ratio * 760))
    let bestIdx = 0
    chart.points.forEach((p, i) => {
      if (Math.abs(p.x - chartX) < Math.abs(chart.points[bestIdx].x - chartX)) bestIdx = i
    })
    const row = chartRows[bestIdx]
    if (!row) return
    setActivePoint({
      x: chart.points[bestIdx].x,
      y: chart.points[bestIdx].y,
      value: row.isx60.toFixed(2),
      time: row.date,
    })
  }

  const dayLow = chartRows.length ? Math.min(...chartRows.map(r => r.isx60)) : 0
  const dayHigh = chartRows.length ? Math.max(...chartRows.map(r => r.isx60)) : 0
  const rangePos = dayHigh > dayLow && latest ? ((latest.isx60 - dayLow) / (dayHigh - dayLow)) * 100 : 50

  return (
    <main className="terminal-shell">
      {/* ── Hero: ISX60 + foreign flow ───────────────────────────────────── */}
      <section className="hero-grid" aria-labelledby="isx60-title">
        <div className="index-panel">
          <div className="section-kicker">مؤشر السوق العراقي</div>
          <div className="index-head">
            <div>
              <h1 id="isx60-title">
                <bdi>ISX60</bdi>
                <span>مؤشر السوق العراقي</span>
              </h1>
              <p>مؤشر بورصة العراق للأوراق المالية بحسب نشرات التداول اليومية الرسمية.</p>
            </div>
            {loading && !hasTradingData ? (
              <div className="index-value skeleton-block" aria-label="جاري تحميل المؤشر" />
            ) : failed ? (
              <div className="empty-state">
                <strong>تعذّر تحميل البيانات</strong>
                <span>يرجى تحديث الصفحة.</span>
              </div>
            ) : hasTradingData ? (
              <div className="index-value">
                <bdi className="num-roll">{latest!.isx60.toFixed(2)}</bdi>
                <span className={isxChange >= 0 ? 'gain' : 'loss'} dir="ltr">
                  <bdi className="num-roll">{isxChange >= 0 ? '+' : ''}{isxChange.toFixed(2)}</bdi>
                  {' / '}
                  <bdi className="num-roll">{isxPct >= 0 ? '+' : ''}{isxPct.toFixed(2)}%</bdi>
                </span>
              </div>
            ) : (
              <div className="empty-state">
                <strong>لم يبدأ التداول اليوم</strong>
                <span>سيظهر مؤشر <bdi>ISX60</bdi> عند افتتاح الجلسة.</span>
              </div>
            )}
          </div>

          {/* Whole chart drills through to the full index/statistics page. */}
          <Link href="/charts" aria-label="عرض الرسم البياني الكامل للمؤشر" className="index-chart-link">
            <div
              className={loading && !hasTradingData ? 'chart-wrap chart-loading' : 'chart-wrap'}
              aria-label="رسم مؤشر ISX60"
              onPointerDown={updateChartPoint}
              onPointerMove={updateChartPoint}
              onPointerLeave={() => setActivePoint(null)}
            >
              <svg className="index-chart" viewBox="0 0 760 260" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="indexFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.24" />
                    <stop offset="60%" stopColor="var(--accent)" stopOpacity="0.1" />
                    <stop offset="100%" stopColor="var(--surface)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[42, 70, 98, 126, 154, 182, 210].map(y => (
                  <line className="grid-line" key={y} x1="0" x2="760" y1={y} y2={y} />
                ))}
                {[95, 190, 285, 380, 475, 570, 665].map(x => (
                  <line className="grid-line vertical" key={x} x1={x} x2={x} y1="0" y2="260" />
                ))}
                {chart.line ? <path className="index-area" d={chart.area} /> : null}
                {chart.line ? <path className="index-shadowline" d={chart.line} /> : null}
                {chart.line && hasTradingData ? <path className="index-line" d={chart.line} /> : null}
                {chart.points.length ? (
                  <circle
                    className="current-marker"
                    cx={chart.points[chart.points.length - 1].x}
                    cy={chart.points[chart.points.length - 1].y}
                    r="7"
                  />
                ) : null}
                {activePoint ? (
                  <g className="crosshair-layer">
                    <line className="crosshair-line" x1={activePoint.x} x2={activePoint.x} y1="0" y2="260" />
                    <circle className="crosshair-dot" cx={activePoint.x} cy={activePoint.y} r="4" />
                  </g>
                ) : null}
              </svg>
              {activePoint ? (
                <div
                  className="chart-tooltip"
                  style={{
                    // Physical left/right rather than logical insets: the SVG
                    // is not mirrored by RTL, so the tooltip must not be either.
                    left: `${Math.min(86, Math.max(4, (activePoint.x / 760) * 100))}%`,
                    right: 'auto',
                    top: `${Math.min(76, Math.max(6, (activePoint.y / 260) * 100))}%`,
                  }}
                >
                  <bdi>{activePoint.value}</bdi>
                  <span>{activePoint.time}</span>
                </div>
              ) : null}
            </div>
          </Link>

          {hasTradingData ? (
            <div className="range">
              <span>أدنى الفترة <bdi>{dayLow.toFixed(2)}</bdi></span>
              <div className="range-track"><span style={{ insetInlineStart: `${rangePos}%` }} /></div>
              <span>أعلى الفترة <bdi>{dayHigh.toFixed(2)}</bdi></span>
            </div>
          ) : null}
        </div>

        {/* Gauge drills through to the foreign-flow detail page. */}
        <Link href="/statistics/foreign-flow" aria-label="تفاصيل حركة المستثمرين الأجانب" className="flow-gauge-link">
          <ForeignFlowGauge
            foreignBuy={flow?.buy ?? 0}
            foreignSell={flow?.sell ?? 0}
            netFlow={(flow?.buy ?? 0) - (flow?.sell ?? 0)}
            insightText={
              flow
                ? `صافي ${((flow.buy - flow.sell) >= 0 ? 'شراء' : 'بيع')} أجنبي في جلسة ${flow.date}.`
                : 'لا تتوفر بيانات تدفق أجنبي للجلسة الأخيرة.'
            }
            sessionDate={flow?.date ?? ''}
            isLoading={loading && !flow}
          />
        </Link>
      </section>

      {/* ── Session activity ─────────────────────────────────────────────── */}
      <section className="stats-strip" aria-labelledby="market-activity">
        <div className="stats-title">
          <div className="section-kicker">جلسة اليوم</div>
          <h2 id="market-activity">نشاط السوق اليوم</h2>
        </div>
        {stats.length ? stats.map(({ label, value, unit, change, icon, trend }) => (
          <article key={label} className="stat-card">
            <span className="stat-label"><StatIcon type={icon} />{label}</span>
            <strong><bdi className="num-roll">{value}</bdi> <span>{unit}</span></strong>
            <em className={change.startsWith('-') ? 'loss' : 'gain'}><bdi className="num-roll">{change}</bdi></em>
            {trend.length > 1 ? <Sparkline values={trend} positive={!change.startsWith('-')} compact /> : null}
          </article>
        )) : (
          <div className="empty-state">
            <strong>لا توجد بيانات جلسة</strong>
            <span>تظهر أرقام النشاط بعد نشر نشرة التداول.</span>
          </div>
        )}
      </section>

      <SectorPerformanceChipRow sectors={sectorData} />

      {/* ── Companies ────────────────────────────────────────────────────── */}
      <section className="companies-section" aria-labelledby="companies-title">
        <div className="section-heading">
          <div>
            <div className="section-kicker">لوحة الشركات</div>
            <h2 id="companies-title">الشركات المدرجة</h2>
          </div>
          <Link className="text-link" href="/market">عرض كل الشركات ←</Link>
        </div>

        <div className="movers-widget" aria-label="الأكثر حركة">
          <div className="section-kicker">الأكثر حركة</div>
          <div className="movers-grid">
            {topMovers.map(group => (
              <article key={group.title}>
                <h3>{group.title}</h3>
                {group.items.length ? group.items.map(company => (
                  <Link className="mover-row" href={`/c/${company.sym}`} key={`${group.title}-${company.sym}`}>
                    <span>
                      {company.ar || company.en || company.sym}
                      <small><bdi>{company.sym}</bdi></small>
                    </span>
                    <bdi className={`${company.pct >= 0 ? 'gain' : 'loss'} num-roll`}>
                      {group.metric === 'volume'
                        ? compact.format(company.vol ?? 0)
                        : `${company.pct > 0 ? '+' : ''}${company.pct.toFixed(2)}%`}
                    </bdi>
                  </Link>
                )) : <p className="mover-empty">لا توجد حركة في الجلسة.</p>}
              </article>
            ))}
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th><button type="button" onClick={() => sortBy('mcap')}>#</button></th>
                <th>الشركة</th>
                <th><button type="button" onClick={() => sortBy('price')}>آخر سعر</button></th>
                <th><button type="button" onClick={() => sortBy('change')}>التغير</button></th>
                <th><button type="button" onClick={() => sortBy('volume')}>الحجم</button></th>
                <th><button type="button" onClick={() => sortBy('mcap')}>القيمة السوقية</button></th>
                <th><bdi>7D</bdi></th>
              </tr>
            </thead>
            <tbody>
              {sortedCompanies.map((company, i) => (
                <tr key={company.sym} className="row-link">
                  <td data-label="#"><bdi className="num-roll">{i + 1}</bdi></td>
                  <td data-label="الشركة">
                    <Link className="company-cell" href={`/c/${company.sym}`}>
                      <span className="logo-chip">{company.sym.slice(0, 1)}</span>
                      <span>
                        <strong>{company.ar || company.en || company.sym}</strong>
                        <small>{SECTOR_AR.get(company.sec) ?? company.sec} · <bdi>{company.sym}</bdi></small>
                      </span>
                    </Link>
                  </td>
                  <td data-label="آخر سعر"><bdi className="num-roll">{priceFormat.format(company.close)} IQD</bdi></td>
                  <td data-label="التغير" className={company.pct >= 0 ? 'gain' : 'loss'}>
                    <bdi className="num-roll">{company.pct > 0 ? '+' : ''}{company.pct.toFixed(2)}%</bdi>
                  </td>
                  <td data-label="الحجم"><bdi className="num-roll">{compact.format(company.vol ?? 0)}</bdi></td>
                  <td data-label="القيمة السوقية"><bdi className="num-roll">{compact.format(liveMcap(company))} IQD</bdi></td>
                  <td data-label="7D">
                    {sparks[company.sym]?.length > 1
                      ? <Sparkline values={sparks[company.sym]} positive={company.pct >= 0} />
                      : <span className="spark-empty" aria-label="لا يوجد سجل كافٍ">·</span>}
                  </td>
                </tr>
              ))}
              {!sortedCompanies.length && !loading ? (
                <tr><td colSpan={7}>
                  <div className="empty-state">
                    <strong>لا توجد شركات لعرضها</strong>
                    <span>تظهر الشركات بعد توفر أسعار الجلسة.</span>
                  </div>
                </td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

    </main>
  )
}
