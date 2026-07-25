'use client'

import { useMemo, useState } from 'react'
import { BarTrack } from '@/components/design/BarTrack'
import { arMonth, fmtIQD } from './_ui'

export type FlowRow = { year: number; month: number; side: 'buy' | 'sell'; value: number | null }
export type SectorRow = { year: number; month: number; sector: string; side: string; value: number | null }

const SECTOR_AR: Record<string, string> = {
  Banks: 'المصارف', Banking: 'المصارف', Industry: 'الصناعة', Services: 'الخدمات',
  Hotels: 'الفنادق', 'Hotels and Tourism': 'السياحة والفنادق', Telecommunication: 'الاتصالات',
  Agriculture: 'الزراعة', Insurance: 'التأمين', Investment: 'الاستثمار',
}
const KNOWN_SECTORS = new Set(Object.keys(SECTOR_AR))

const monthKey = (y: number, m: number) => `${y}-${String(m).padStart(2, '0')}`

/* ── Monthly net foreign flow ───────────────────────────────────────────────
 * The design card is a static strip. Here it keeps the design's shell but
 * stays interactive: hover a bar to read that month, and switch the window.
 */
export function MonthlyFlowCard({ rows }: { rows: FlowRow[] }) {
  const [range, setRange] = useState(12)
  const [hover, setHover] = useState<number | null>(null)

  const all = useMemo(() => {
    const byMonth = new Map<string, { buy: number; sell: number; y: number; m: number }>()
    for (const r of rows) {
      const k = monthKey(r.year, r.month)
      const e = byMonth.get(k) ?? { buy: 0, sell: 0, y: r.year, m: r.month }
      e[r.side] += r.value ?? 0
      byMonth.set(k, e)
    }
    return Array.from(byMonth.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, v]) => ({ k, buy: v.buy, sell: v.sell, net: v.buy - v.sell, y: v.y, m: v.m }))
  }, [rows])

  const series = range >= 999 ? all : all.slice(-range)
  const total = series.reduce((s, r) => s + r.net, 0)
  const maxAbs = Math.max(...series.map(r => Math.abs(r.net)), 1)
  const active = hover != null ? series[hover] : null
  const headline = active ? active.net : total
  const latest = series.length ? series[series.length - 1] : null

  if (!series.length) {
    return (
      <section className="app-card statistics-card statistics-secondary-card">
        <span className="app-badge">شهري</span>
        <h2>تدفق المستثمر الأجنبي</h2>
        <p>لا توجد بيانات تدفق شهرية بعد.</p>
      </section>
    )
  }

  return (
    <section className="app-card statistics-card statistics-secondary-card">
      <div className="stat-card-top">
        <span className="app-badge">شهري</span>
        <div className="seg-control" role="group" aria-label="نطاق الفترة">
          {([[12, 'سنة'], [24, 'سنتان'], [999, 'الكل']] as [number, string][]).map(([v, label]) => (
            <button
              key={v}
              type="button"
              className={range === v ? 'seg-btn is-active' : 'seg-btn'}
              aria-pressed={range === v}
              onClick={() => { setRange(v); setHover(null) }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <h2>تدفق المستثمر الأجنبي</h2>
      <p>
        {active
          ? `${arMonth[active.m]} ${active.y}`
          : `صافي شهرياً${latest ? ` · حتى ${arMonth[latest.m]} ${latest.y}` : ''}`}
      </p>

      <strong className={`statistics-headline ${headline >= 0 ? 'positive' : 'negative'}`}>
        <bdi>{fmtIQD(headline)} IQD</bdi>
      </strong>

      {/* Reserve the row so the card doesn't jump as the pointer moves. */}
      <small className="statistics-subline">
        {active ? <>شراء <bdi>{fmtIQD(active.buy)}</bdi> · بيع <bdi>{fmtIQD(active.sell)}</bdi></> : ' '}
      </small>

      <div
        className="monthly-flow-chart"
        aria-label="صافي تدفق المستثمر الأجنبي شهرياً"
        onPointerLeave={() => setHover(null)}
      >
        <span className="monthly-baseline" />
        {series.map((row, i) => (
          <span
            className={hover === i ? 'monthly-bar-column is-active' : 'monthly-bar-column'}
            key={row.k}
            onPointerEnter={() => setHover(i)}
            title={`${arMonth[row.m]} ${row.y} · ${fmtIQD(row.net)}`}
          >
            <i
              className={row.net >= 0 ? 'positive' : 'negative'}
              style={{
                blockSize: `${Math.max(5, (Math.abs(row.net) / maxAbs) * 34)}px`,
                insetBlockEnd: row.net >= 0 ? '50%' : 'auto',
                insetBlockStart: row.net < 0 ? '50%' : 'auto',
              }}
            />
          </span>
        ))}
      </div>

      <div className="monthly-chart-labels">
        <bdi>{series[series.length - 1].m}/{String(series[series.length - 1].y).slice(2)}</bdi>
        <bdi>{series[Math.floor(series.length / 2)].m}/{String(series[Math.floor(series.length / 2)].y).slice(2)}</bdi>
        <bdi>{series[0].m}/{String(series[0].y).slice(2)}</bdi>
      </div>
    </section>
  )
}

/* ── Sector rotation ────────────────────────────────────────────────────────
 * Design shell, plus the buy/sell switch and month stepper the old panel had.
 */
export function SectorRotationCard({ rows }: { rows: SectorRow[] }) {
  const [side, setSide] = useState<'buy' | 'sell'>('buy')
  const [monthIdx, setMonthIdx] = useState<string | null>(null)
  const [hover, setHover] = useState<string | null>(null)

  const byMonth = useMemo(() => {
    const map = new Map<string, Map<string, number>>()
    for (const r of rows) {
      if (r.side !== side || !KNOWN_SECTORS.has(r.sector)) continue
      const k = monthKey(r.year, r.month)
      const sm = map.get(k) ?? new Map<string, number>()
      sm.set(r.sector, (sm.get(r.sector) ?? 0) + (r.value ?? 0))
      map.set(k, sm)
    }
    return map
  }, [rows, side])

  const months = useMemo(() => Array.from(byMonth.keys()).sort(), [byMonth])

  if (!months.length) {
    return (
      <section className="app-card statistics-card statistics-secondary-card">
        <span className="app-badge">شهري</span>
        <h2>دوران القطاعات</h2>
        <p>لا توجد بيانات قطاعية بعد.</p>
      </section>
    )
  }

  const cur = monthIdx && byMonth.has(monthIdx) ? monthIdx : months[months.length - 1]
  const idx = months.indexOf(cur)
  const [y, m] = cur.split('-').map(Number)
  const data = Array.from(byMonth.get(cur)!.entries()).sort((a, b) => b[1] - a[1])
  const total = data.reduce((s, d) => s + d[1], 0)
  const step = (d: number) => {
    const n = idx + d
    if (n >= 0 && n < months.length) setMonthIdx(months[n])
  }

  return (
    <section className="app-card statistics-card statistics-secondary-card">
      <div className="stat-card-top">
        <span className="app-badge">شهري</span>
        <div className="seg-control" role="group" aria-label="جانب التداول">
          {([['buy', 'شراء'], ['sell', 'بيع']] as ['buy' | 'sell', string][]).map(([v, label]) => (
            <button
              key={v}
              type="button"
              className={side === v ? 'seg-btn is-active' : 'seg-btn'}
              aria-pressed={side === v}
              onClick={() => { setSide(v); setMonthIdx(null) }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <h2>دوران القطاعات</h2>
      <div className="month-stepper">
        <p>أين يتدفق المال الأجنبي</p>
        <div>
          {/* RTL: › steps back in time, ‹ steps forward. */}
          <button type="button" onClick={() => step(-1)} disabled={idx <= 0} aria-label="الشهر السابق">›</button>
          <span>{arMonth[m]} {y}</span>
          <button type="button" onClick={() => step(1)} disabled={idx >= months.length - 1} aria-label="الشهر التالي">‹</button>
        </div>
      </div>

      <strong className={`statistics-headline ${side === 'buy' ? 'positive' : 'negative'}`}>
        <bdi>{fmtIQD(total)} IQD</bdi> {side === 'buy' ? 'شراء' : 'بيع'}
      </strong>

      <div className="rotation-list" onPointerLeave={() => setHover(null)}>
        {data.slice(0, 5).map(([sec, val]) => {
          const name = SECTOR_AR[sec] ?? sec
          return (
            <div
              className={hover === sec ? 'rotation-row is-active' : 'rotation-row'}
              key={sec}
              onPointerEnter={() => setHover(sec)}
            >
              <span>
                <strong>{name}</strong>
                {/* Hovering swaps the absolute figure for its share of the month. */}
                <bdi>{hover === sec && total ? `${((val / total) * 100).toFixed(1)}%` : fmtIQD(val)}</bdi>
              </span>
              <BarTrack value={val} max={data[0][1]} tone={side === 'buy' ? 'positive' : 'negative'} />
            </div>
          )
        })}
      </div>
    </section>
  )
}
