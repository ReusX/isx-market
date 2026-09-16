'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocale } from '@/context/LocaleContext'
import { SiteShell } from './SiteShell'
import { DoorRail } from './DoorRail'
import {
  PERIODS, METRICS, SECTOR_LABELS, bucketize, grainFor, totalsFor, windowFor, normalizeSectors, bucketLabel, monthLabel,
  type MetricId, type PeriodId, type Bucket,
} from '@/lib/statistics'
import type { StatisticsInitial } from '@/lib/marketServer'
import { shortDate } from '@/lib/date'
import '@/styles/markets.css'
import '@/styles/statistics-page.css'

/**
 * /statistics · the hub. Four questions, top to bottom:
 *
 *   how much trades  — the activity chart: one bar per session / week /
 *                      month of the chosen measure, with the period's
 *                      totals and the change against the period before;
 *   where            — each sector's share of the month's traded value;
 *   who is buying    — net foreign trading, recent;
 *   who owns it      — Iraqi vs foreign share of deposited shares.
 *
 * The last three are doors to their own pages. Everything arrives from the
 * server; the data model (lib/statistics) is unchanged, including its
 * period rule — four cadences, never merged into one timestamp.
 */
const RAIL = [
  { key: 'market', route: '/' }, { key: 'board', route: '/market' }, { key: 'companies', route: '/companies' },
  { key: 'screener', route: '/screener' }, { key: 'heatmap', route: '/heatmap' }, { key: 'statistics', route: '/statistics' }, { key: 'pulse', route: '/pulse' },
] as const
const SUB = [
  { key: 'overview', route: '/statistics' }, { key: 'flow', route: '/statistics/foreign-flow' },
  { key: 'ownership', route: '/statistics/ownership' }, { key: 'holders', route: '/statistics/shareholders' },
] as const

const int = new Intl.NumberFormat('en-US')
type Units = { tn: string; bn: string; mn: string; k: string }
function compact(v: number | null | undefined, u: Units): string {
  if (v == null || !Number.isFinite(v)) return '—'
  const a = Math.abs(v), sign = v < 0 ? '−' : ''
  if (a >= 1e12) return `${sign}${(a / 1e12).toFixed(a >= 1e13 ? 0 : 1)} ${u.tn}`
  if (a >= 1e9) return `${sign}${(a / 1e9).toFixed(a >= 1e10 ? 0 : 1)} ${u.bn}`
  if (a >= 1e6) return `${sign}${(a / 1e6).toFixed(a >= 1e7 ? 0 : 1)} ${u.mn}`
  if (a >= 1e3) return `${sign}${(a / 1e3).toFixed(0)} ${u.k}`
  return `${sign}${int.format(a)}`
}

export function StatisticsPage({ initial }: { initial: StatisticsInitial }) {
  const { t, locale, href: L } = useLocale()
  const st = t.statistics
  const pg = st.page
  const u = t.site.units
  const ar = locale === 'ar'
  const [period, setPeriod] = useState<PeriodId>('1Y')
  const [metric, setMetric] = useState<MetricId>('value')
  const [hover, setHover] = useState<number | null>(null)

  const grain = grainFor(period)
  const win = useMemo(() => windowFor(initial.sessions, period), [initial.sessions, period])
  const buckets = useMemo(() => bucketize(win, grain, metric), [win, grain, metric])
  const totals = useMemo(() => totalsFor(win, metric), [win, metric])
  /* The period before, same length, for the change line. */
  const prev = useMemo(() => {
    const n = win.length
    const all = initial.sessions
    const start = all.findIndex((s) => s.date === win[0]?.date)
    if (start <= 0 || n === 0) return null
    return totalsFor(all.slice(Math.max(0, start - n), start), metric)
  }, [initial.sessions, win, metric])
  const vsPrev = totals && prev && prev.sum > 0 ? ((totals.sum - prev.sum) / prev.sum) * 100 : null
  const best = useMemo(() => win.reduce<{ date: string; v: number } | null>((m, s) => { const v = s[metric]; return v != null && (!m || v > m.v) ? { date: s.date, v } : m }, null), [win, metric])
  const unit = ar ? METRICS.find((m) => m.id === metric)!.unitAr : METRICS.find((m) => m.id === metric)!.unitEn

  /* Chart geometry: drawn at the box's real size. */
  const boxRef = useRef<HTMLDivElement>(null)
  const [[W, H], setSize] = useState<[number, number]>([900, 280])
  useEffect(() => {
    const el = boxRef.current; if (!el) return
    const ro = new ResizeObserver(([e]) => { const w = Math.round(e.contentRect.width); if (w > 0) setSize([w, Math.max(220, Math.min(320, Math.round(w * 0.3)))]) })
    ro.observe(el); return () => ro.disconnect()
  }, [])
  const PT = 12, PB = 26, PL = 4, PR = 56
  const max = Math.max(1, ...buckets.map((b) => b[metric] ?? 0))
  const bw = (W - PL - PR) / Math.max(1, buckets.length)
  const y = (v: number) => PT + (1 - v / max) * (H - PT - PB)
  const ticks = [0.25, 0.5, 0.75, 1].map((f) => f * max)
  const labelEvery = Math.max(1, Math.ceil(buckets.length / 5))
  const shown: Bucket | null = hover != null ? buckets[hover] : null

  const sectors = useMemo(() => normalizeSectors(initial.sectorRows), [initial.sectorRows])
  const sectorTotal = sectors.sectors.reduce((a, s) => a + s.value, 0)
  const sectorMonth = initial.sectorRows.length ? `${initial.sectorRows[0].year}-${String(initial.sectorRows[0].month).padStart(2, '0')}` : null

  const flow = useMemo(() => {
    const dates = Array.from(new Set(initial.flow.map((r) => r.date))).sort().reverse().slice(0, 20)
    const keep = new Set(dates)
    let buy = 0, sell = 0
    for (const r of initial.flow) if (keep.has(r.date)) { if (r.side === 'buy') buy += r.value ?? 0; else if (r.side === 'sell') sell += r.value ?? 0 }
    return { n: dates.length, buy, sell, net: buy - sell }
  }, [initial.flow])
  const own = initial.ownership
  const ownTotal = own ? own.iraqi + own.foreign : 0

  return (
    <SiteShell>
      <main className="stx id-full iq-door">
        <DoorRail door="markets" items={RAIL.map((r) => ({ label: t.market.page.rail[r.key], route: r.route }))} />
        <div className="stx-body">
          <header className="stx-head">
            <p className="id-eyebrow">{pg.eyebrow}</p>
            <h1 className="id-h1">{st.title}</h1>
            <p className="id-lede">{pg.lede}</p>
            <nav className="id-pills stx-sub" aria-label={st.tabsLabel}>
              {SUB.map((s) => <Link key={s.key} href={L(s.route)} className="id-pill" aria-current={s.key === 'overview' ? 'page' : undefined}>{pg.sub[s.key]}</Link>)}
            </nav>
          </header>

          {/* ── How much trades ── */}
          <section className="stx-activity id-panel" aria-label={pg.activity}>
            <div className="stx-activity-head">
              <div>
                <h2 className="id-h3">{pg.activity}</h2>
                <p className="id-cap">{pg.activityNote(pg.grain[grain])}</p>
              </div>
              <div className="stx-pills">
                <div className="id-pills" role="group" aria-label={st.metricLabel}>
                  {METRICS.map((m) => <button key={m.id} type="button" className="id-pill is-sm" aria-pressed={metric === m.id} onClick={() => setMetric(m.id)}>{ar ? m.ar : m.en}</button>)}
                </div>
                <div className="id-pills" role="group" aria-label={st.periodLabel}>
                  {PERIODS.map((p) => <button key={p.id} type="button" className="id-pill is-sm" aria-pressed={period === p.id} onClick={() => { setPeriod(p.id); setHover(null) }}>{ar ? p.ar : p.en}</button>)}
                </div>
              </div>
            </div>

            <p className="stx-reading id-num">
              <strong>{shown ? compact(shown[metric], u) : totals ? compact(totals.sum, u) : '—'}</strong>
              <span className="id-cap">{unit} · {shown ? bucketLabel(shown, grain, locale) : totals ? `${shortDate(totals.from, locale)} – ${shortDate(totals.to, locale)}` : ''}</span>
            </p>

            <div ref={boxRef} className="stx-chart">
              <svg viewBox={`0 0 ${W} ${H}`} className="id-num" role="img" aria-label={pg.activity} onPointerLeave={() => setHover(null)}>
                {ticks.map((v) => (
                  <g key={v}><line x1={PL} x2={W - PR} y1={y(v)} y2={y(v)} className="stx-grid" /><text x={W - PR + 8} y={y(v)} className="stx-tick">{compact(v, u)}</text></g>
                ))}
                {buckets.map((b, i) => {
                  const v = b[metric]
                  const x = PL + i * bw
                  return (
                    <g key={b.key} onPointerEnter={() => setHover(i)}>
                      <rect x={x} y={PT} width={bw} height={H - PT - PB} fill="transparent" />
                      {v == null
                        ? <rect x={x + bw * 0.15} y={H - PB - 3} width={bw * 0.7} height={3} className="stx-gap" />
                        : <rect x={x + bw * 0.15} y={y(v)} width={Math.max(1, bw * 0.7)} height={H - PB - y(v)} rx={Math.min(3, bw * 0.2)} className={`stx-bar ${hover === i ? 'is-on' : ''}`.trim()} />}
                      {i % labelEvery === 0 ? <text x={x + bw / 2} y={H - 8} className="stx-x">{bucketLabel(b, grain, locale)}</text> : null}
                    </g>
                  )
                })}
                {totals ? <line x1={PL} x2={W - PR} y1={y(totals.mean * (grain === 'session' ? 1 : (win.length / Math.max(1, buckets.length))))} y2={y(totals.mean * (grain === 'session' ? 1 : (win.length / Math.max(1, buckets.length))))} className="stx-mean" /> : null}
              </svg>
            </div>

            {totals ? (
              <div className="stx-figures id-num">
                <div><small>{pg.total}</small><strong>{compact(totals.sum, u)}</strong><em>{vsPrev == null ? pg.noPrev : <bdi className={`iqm-pct ${vsPrev > 0 ? 'id-up' : vsPrev < 0 ? 'id-down' : ''}`.trim()}>{pg.vsPrev(`${vsPrev > 0 ? '+' : ''}${Math.round(vsPrev)}%`)}</bdi>}</em></div>
                <div><small>{pg.perSession}</small><strong>{compact(totals.mean, u)}</strong><em>{st.ofSessions(int.format(totals.coverage))}</em></div>
                <div><small>{pg.best}</small><strong>{best ? compact(best.v, u) : '—'}</strong><em>{best ? shortDate(best.date, locale) : ''}</em></div>
                <div><small>{pg.sessions}</small><strong>{int.format(totals.sessions)}</strong><em>{totals.meanTraded != null ? `${st.meanTraded} ${Math.round(totals.meanTraded)}` : ''}</em></div>
              </div>
            ) : null}
          </section>

          {/* ── Where · who is buying · who owns ── */}
          <div className="stx-grid">
            <section className="id-panel stx-sectors" aria-label={pg.sectors}>
              <h2 className="id-h3">{pg.sectors}</h2>
              <p className="id-cap">{sectorMonth ? pg.sectorsNote(monthLabel(sectorMonth, locale)) : st.noSectorData}</p>
              <ul className="stx-bars id-num">
                {sectors.sectors.slice().sort((a, b) => b.value - a.value).filter((s) => s.value > 0).map((s) => {
                  const share = sectorTotal ? (s.value / sectorTotal) * 100 : 0
                  return (
                    <li key={s.key}>
                      <span className="stx-bar-label">{SECTOR_LABELS[s.key]?.[locale] ?? s.label ?? s.key}</span>
                      <span className="stx-bar-track"><i style={{ width: `${share}%` }} /></span>
                      <span className="stx-bar-val">{share.toFixed(1)}%</span>
                    </li>
                  )
                })}
              </ul>
            </section>

            <div className="stx-stack">
              <section className="id-panel stx-door" aria-label={pg.foreign}>
                <h2 className="id-h3">{pg.foreign}</h2>
                <p className="id-cap">{pg.foreignNote(int.format(flow.n))}</p>
                <p className={`stx-big id-num ${flow.net > 0 ? 'id-up' : flow.net < 0 ? 'id-down' : ''}`.trim()}>
                  <bdi>{flow.net > 0 ? '+' : flow.net < 0 ? '−' : ''}{compact(Math.abs(flow.net), u)}</bdi> <span className="id-cap">{u.iqd} · {flow.net >= 0 ? pg.netBuy : pg.netSell}</span>
                </p>
                <span className="stx-split" aria-hidden="true"><i className="is-buy" style={{ flex: flow.buy || 1 }} /><i className="is-sell" style={{ flex: flow.sell || 1 }} /></span>
                <Link href={L('/statistics/foreign-flow')} className="id-btn is-sm">{pg.more} →</Link>
              </section>

              <section className="id-panel stx-door" aria-label={pg.ownership}>
                <h2 className="id-h3">{pg.ownership}</h2>
                <p className="id-cap">{own ? pg.ownershipNote(monthLabel(own.month, locale)) : st.noSectorData}</p>
                {own && ownTotal ? (
                  <>
                    <p className="stx-big id-num"><bdi>{((own.iraqi / ownTotal) * 100).toFixed(1)}%</bdi> <span className="id-cap">{pg.iraqis}</span> <span className="stx-sep">·</span> <bdi>{((own.foreign / ownTotal) * 100).toFixed(1)}%</bdi> <span className="id-cap">{pg.foreigners}</span></p>
                    <span className="stx-split" aria-hidden="true"><i className="is-iraqi" style={{ flex: own.iraqi }} /><i className="is-foreign" style={{ flex: own.foreign }} /></span>
                  </>
                ) : null}
                <Link href={L('/statistics/ownership')} className="id-btn is-sm">{pg.more} →</Link>
              </section>
            </div>
          </div>

          <section className="stx-about id-read" aria-label={pg.about.title}>
            <h2 className="id-h2">{pg.about.title}</h2>
            {pg.about.body.map((tx, i) => <p key={i} className="id-body">{tx}</p>)}
          </section>
        </div>
      </main>
    </SiteShell>
  )
}
