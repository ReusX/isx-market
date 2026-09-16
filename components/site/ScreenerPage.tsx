'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { CompanyLogo } from '@/components/CompanyLogo'
import { useLocale } from '@/context/LocaleContext'
import { SiteShell } from './SiteShell'
import { DoorRail } from './DoorRail'
import {
  METRICS, PERIODS, PRESETS, STALE_DAYS,
  activePreset, inRange, metricDef, metricValue, periodChange, presetRanges, rangeInvalid, rangeIsSet, sectorLabel, toRow,
  type MetricId, type PeriodId, type PresetId, type Range, type Ranges, type ScreenerRow,
} from '@/lib/screener'
import type { ScreenerInitial } from '@/lib/marketServer'
import { shortDate } from '@/lib/date'
import '@/styles/markets.css'
import '@/styles/screener-page.css'

/**
 * /screener · find the stocks that match conditions.
 *
 * Presets first: eight big pills, each of which WRITES a visible condition
 * (press «الأقل مكرراً» and «مكرر الربحية ≤ 10» appears as a chip you can
 * edit, remove or add to). The range builder is behind a disclosure. The
 * results are the board, with the measures you filtered on as sortable
 * columns, so a row shows why it matched. Every screen lives in the URL
 * (?preset= · ?pe=0.1-10 · ?period=1m …), so it can be shared, and the
 * preset URLs carry their own titles.
 *
 * The logic — measures, presets, ranges, the null policy — is lib/screener,
 * unchanged. Rows come from the server so the default screen is in the HTML.
 */
const RAIL = [
  { key: 'market', route: '/' }, { key: 'board', route: '/market' }, { key: 'companies', route: '/companies' },
  { key: 'screener', route: '/screener' }, { key: 'heatmap', route: '/heatmap' }, { key: 'statistics', route: '/statistics' }, { key: 'pulse', route: '/pulse' },
] as const

const price = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const int = new Intl.NumberFormat('en-US')
const COLS: MetricId[] = ['change', 'liquidity', 'mcap', 'foreign', 'pe', 'band']

function fmtMetric(id: MetricId, v: number | null, u: { tn: string; bn: string; mn: string; k: string }): string {
  if (v == null) return '—'
  switch (id) {
    case 'price': return price.format(v)
    case 'change': return `${v > 0 ? '+' : ''}${v.toFixed(2)}%`
    case 'band': return `${Math.round(v)}%`
    case 'pe': return v.toFixed(1)
    default: {
      const a = Math.abs(v), sign = v < 0 ? '−' : ''
      if (a >= 1e12) return `${sign}${(a / 1e12).toFixed(a >= 1e13 ? 0 : 1)} ${u.tn}`
      if (a >= 1e9) return `${sign}${(a / 1e9).toFixed(a >= 1e10 ? 0 : 1)} ${u.bn}`
      if (a >= 1e6) return `${sign}${(a / 1e6).toFixed(a >= 1e7 ? 0 : 1)} ${u.mn}`
      if (a >= 1e3) return `${sign}${(a / 1e3).toFixed(0)} ${u.k}`
      return `${sign}${int.format(a)}`
    }
  }
}

/* URL ⇄ state. Ranges are `id=min-max` with an empty side for an open bound. */
function parseUrl(): { ranges: Ranges; period: PeriodId; sector: string; q: string; suspended: boolean } {
  const sp = new URLSearchParams(window.location.search)
  let ranges: Ranges = {}
  const preset = sp.get('preset') as PresetId | null
  if (preset && PRESETS.some((p) => p.id === preset)) ranges = presetRanges(preset) ?? {}
  for (const m of METRICS) {
    const raw = sp.get(m.id)
    if (raw == null) continue
    const [lo, hi] = raw.split('-').map((x) => (x === '' ? null : Number(x)))
    ranges[m.id] = { min: lo != null && Number.isFinite(lo) ? lo * m.scale : null, max: hi != null && Number.isFinite(hi) ? hi * m.scale : null }
  }
  const period = (PERIODS.some((p) => p.id === sp.get('period')) ? sp.get('period') : '1d') as PeriodId
  return { ranges, period, sector: sp.get('sector') ?? 'ALL', q: sp.get('q') ?? '', suspended: sp.get('suspended') === '1' }
}
function writeUrl(s: { ranges: Ranges; period: PeriodId; sector: string; q: string; suspended: boolean }) {
  const sp = new URLSearchParams()
  const preset = activePreset(s.ranges)
  if (preset && preset !== 'all') sp.set('preset', preset)
  else for (const [id, r] of Object.entries(s.ranges) as [MetricId, Range][]) {
    if (!rangeIsSet(r)) continue
    const m = metricDef(id)
    sp.set(id, `${r.min == null ? '' : +(r.min / m.scale).toFixed(4)}-${r.max == null ? '' : +(r.max / m.scale).toFixed(4)}`)
  }
  if (s.period !== '1d') sp.set('period', s.period)
  if (s.sector !== 'ALL') sp.set('sector', s.sector)
  if (s.q) sp.set('q', s.q)
  if (s.suspended) sp.set('suspended', '1')
  const qs = sp.toString()
  window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`)
}

export function ScreenerPage({ initial, marketSession }: { initial: ScreenerInitial; marketSession: string | null }) {
  const { t, locale, href: L } = useLocale()
  const s = t.screener
  const pg = s.page
  const u = t.site.units
  const ar = locale === 'ar'

  const [ranges, setRanges] = useState<Ranges>({})
  const [period, setPeriod] = useState<PeriodId>('1d')
  const [sector, setSector] = useState('ALL')
  const [q, setQ] = useState('')
  const [suspended, setSuspended] = useState(false)
  const [sortKey, setSortKey] = useState<MetricId | 'name'>('liquidity')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [builder, setBuilder] = useState(false)
  const [copied, setCopied] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => { const st = parseUrl(); setRanges(st.ranges); setPeriod(st.period); setSector(st.sector); setQ(st.q); setSuspended(st.suspended); setReady(true) }, [])
  useEffect(() => { if (ready) writeUrl({ ranges, period, sector, q, suspended }) }, [ranges, period, sector, q, suspended, ready])

  const metaBySym = useMemo(() => new Map(initial.meta.map((m) => [m.sym, m])), [initial.meta])
  const all = useMemo<ScreenerRow[]>(() => initial.metrics.map((m) => {
    const r = toRow(m, metaBySym.get(m.ticker), ar)
    const pe = initial.pe[m.ticker]
    return { ...r, pe: pe != null && pe > 0 ? pe : null }
  }), [initial, metaBySym, ar])
  const peCount = useMemo(() => all.filter((r) => r.pe != null).length, [all])
  /* The session the measures were computed on: the newest last_date in the
     view. If the board has a newer session, the view is lagging and the
     page says so rather than letting a stale figure pass as current. */
  const metricsDate = useMemo(() => all.reduce<string | null>((m, r) => (r.last_date && (!m || r.last_date > m) ? r.last_date : m), null), [all])
  const lagging = Boolean(metricsDate && marketSession && marketSession > metricsDate)
  const sectors = useMemo(() => Array.from(new Set(all.map((r) => r.sector))).sort(), [all])

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    let list = all.filter((r) => suspended ? true : !r.suspended)
    if (sector !== 'ALL') list = list.filter((r) => r.sector === sector)
    if (needle) list = list.filter((r) => r.ticker.toLowerCase().includes(needle) || r.name.toLowerCase().includes(needle) || (r.name_ar ?? '').includes(q.trim()))
    for (const [id, range] of Object.entries(ranges) as [MetricId, Range][]) {
      if (!rangeIsSet(range)) continue
      list = list.filter((r) => inRange(metricValue(r, id, period), range))
    }
    const dir = sortDir === 'asc' ? 1 : -1
    return list.sort((a, b) => {
      if (sortKey === 'name') return a.name.localeCompare(b.name, locale) * dir
      const av = metricValue(a, sortKey, period), bv = metricValue(b, sortKey, period)
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      return (av - bv) * dir
    })
  }, [all, q, sector, suspended, ranges, period, sortKey, sortDir, locale])

  const preset = activePreset(ranges)
  const activeIds = (Object.keys(ranges) as MetricId[]).filter((id) => rangeIsSet(ranges[id]))
  const invalid = activeIds.filter((id) => rangeInvalid(ranges[id]))
  const applyPreset = (id: PresetId) => { setRanges(presetRanges(id) ?? {}); if (id === 'gainers' || id === 'losers') setSortKey('change'); if (id === 'liquid') setSortKey('liquidity'); if (id === 'cheap') { setSortKey('pe'); setSortDir('asc') } if (id === 'fbuy' || id === 'fsell') setSortKey('foreign'); if (id === 'nearhigh') setSortKey('band'); if (id === 'nearlow') { setSortKey('band'); setSortDir('asc') } if (id === 'largest') setSortKey('mcap'); if (id === 'monthup') { setPeriod('1m'); setSortKey('change') } }
  const setBound = (id: MetricId, side: 'min' | 'max', raw: string) => {
    const m = metricDef(id)
    const v = raw === '' ? null : Number(raw) * m.scale
    setRanges((r) => ({ ...r, [id]: { min: r[id]?.min ?? null, max: r[id]?.max ?? null, [side]: v } }))
  }
  const clear = (id: MetricId) => setRanges((r) => { const n = { ...r }; delete n[id]; return n })
  const rangeText = (id: MetricId) => {
    const r = ranges[id]!, m = metricDef(id), unit = ar ? m.unitAr : m.unitEn
    const f = (v: number) => `${+(v / m.scale).toFixed(2)}${unit ? ` ${unit}` : ''}`
    return r.min != null && r.max != null ? `${f(r.min)} – ${f(r.max)}` : r.min != null ? `≥ ${f(r.min)}` : `≤ ${f(r.max!)}`
  }
  const sortBy = (key: MetricId | 'name') => { if (sortKey === key) setSortDir((d) => d === 'desc' ? 'asc' : 'desc'); else { setSortKey(key); setSortDir(key === 'name' || key === 'pe' ? 'asc' : 'desc') } }
  const share = async () => { try { await navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch {} }
  const exportCsv = () => {
    const head = [s.colCompany, 'Symbol', s.colPrice, ...COLS.map((id) => (ar ? metricDef(id).ar : metricDef(id).en))]
    const cell = (v: string | number | null | undefined) => v == null ? '' : `"${String(v).replace(/"/g, '""')}"`
    const lines = rows.map((r) => [r.name, r.ticker, r.last_close, ...COLS.map((id) => metricValue(r, id, period) ?? '')].map(cell).join(','))
    const blob = new Blob(['﻿' + [head.map(cell).join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `iraqsm-screener${preset && preset !== 'all' ? `-${preset}` : ''}.csv`; a.click(); URL.revokeObjectURL(a.href)
  }

  return (
    <SiteShell>
      <main className="scr id-full iq-door">
        <DoorRail door="markets" items={RAIL.map((r) => ({ label: t.market.page.rail[r.key], route: r.route }))} />
        <div className="scr-body">
          <header className="scr-head">
            <p className="id-eyebrow">{pg.eyebrow}</p>
            <h1 className="id-h1">{s.title}</h1>
            <p className="id-lede">{pg.lede}</p>
          </header>

          {/* Presets: each writes a condition. The hint under the row says what the active one means. */}
          <section className="scr-presets" aria-label={pg.presets}>
            <div className="id-pills">
              {PRESETS.map((p) => (
                <button key={p.id} type="button" className="id-pill" aria-pressed={preset === p.id} onClick={() => applyPreset(p.id)}>{ar ? p.ar : p.en}</button>
              ))}
            </div>
            <p className="id-cap scr-hint id-num">
              {preset ? (ar ? PRESETS.find((p) => p.id === preset)!.hintAr : PRESETS.find((p) => p.id === preset)!.hintEn) : s.filters}
              {' · '}{pg.coverage(int.format(peCount), int.format(all.length))}
            </p>
            {metricsDate ? (
              <p className={`id-cap scr-asof ${lagging ? 'is-lagging' : ''}`.trim()}>
                {lagging ? pg.lagging(shortDate(metricsDate, locale), shortDate(marketSession!, locale)) : pg.asOf(shortDate(metricsDate, locale))}
              </p>
            ) : null}
          </section>

          {/* Active conditions, as chips you can remove; the builder edits them. */}
          <div className="scr-conditions">
            {activeIds.map((id) => (
              <span key={id} className={`scr-chip ${rangeInvalid(ranges[id]) ? 'is-invalid' : ''}`.trim()}>
                <b>{ar ? metricDef(id).ar : metricDef(id).en}</b> <bdi>{rangeText(id)}</bdi>
                <button type="button" aria-label={s.removeFilterOf(ar ? metricDef(id).ar : metricDef(id).en)} onClick={() => clear(id)}>×</button>
              </span>
            ))}
            {activeIds.some((id) => id === 'change') || preset === 'gainers' || preset === 'losers' ? (
              <span className="id-pills scr-period" role="group" aria-label={s.periodLabel}>
                {PERIODS.map((p) => <button key={p.id} type="button" className="id-pill is-sm" aria-pressed={period === p.id} onClick={() => setPeriod(p.id)}>{ar ? p.ar : p.en}</button>)}
              </span>
            ) : null}
            <button type="button" className="id-pill is-sm" aria-expanded={builder} onClick={() => setBuilder((v) => !v)}>{s.advanced} {builder ? '▴' : '▾'}</button>
          </div>
          {invalid.length ? <p className="id-note">{s.invalidRange(invalid.map((id) => (ar ? metricDef(id).ar : metricDef(id).en)).join(s.listSeparator))}</p> : null}

          {builder ? (
            <section className="scr-builder id-panel" aria-label={s.filters}>
              {METRICS.map((m) => {
                const r = ranges[m.id]
                const unit = ar ? m.unitAr : m.unitEn
                return (
                  <div key={m.id} className="scr-row id-num">
                    <span className="scr-row-label">{ar ? m.ar : m.en}{unit ? <span className="id-cap"> · {unit}</span> : null}</span>
                    <input type="number" step={m.step} className="id-input" placeholder={s.min} aria-label={s.minOf(ar ? m.ar : m.en)}
                      value={r?.min == null ? '' : +(r.min / m.scale).toFixed(4)} onChange={(e) => setBound(m.id, 'min', e.target.value)} />
                    <span className="id-cap">–</span>
                    <input type="number" step={m.step} className="id-input" placeholder={s.max} aria-label={s.maxOf(ar ? m.ar : m.en)}
                      value={r?.max == null ? '' : +(r.max / m.scale).toFixed(4)} onChange={(e) => setBound(m.id, 'max', e.target.value)} />
                    {rangeIsSet(r) ? <button type="button" className="id-pill is-sm" onClick={() => clear(m.id)}>{s.clearFilterOf('')}</button> : <span />}
                  </div>
                )
              })}
              <p className="id-cap">{s.filtersCompose}</p>
            </section>
          ) : null}

          <div className="scr-controls">
            <input id="scr-q" type="search" className="id-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={s.searchPlaceholder} aria-label={s.searchLabel} />
            <div className="id-pills" role="group" aria-label={s.sectorLabel}>
              <button type="button" className="id-pill is-sm" aria-pressed={sector === 'ALL'} onClick={() => setSector('ALL')}>{s.allSectors}</button>
              {sectors.map((k) => <button key={k} type="button" className="id-pill is-sm" aria-pressed={sector === k} onClick={() => setSector(k)}>{sectorLabel(k, locale)}</button>)}
            </div>
            <label className="scr-toggle id-cap"><input type="checkbox" checked={suspended} onChange={(e) => setSuspended(e.target.checked)} /> {pg.showSuspended}</label>
            <span className="scr-actions">
              <button type="button" className="id-pill is-sm" onClick={share}>{copied ? pg.copied : pg.share}</button>
              <button type="button" className="id-pill is-sm" onClick={exportCsv}>{pg.csv}</button>
            </span>
          </div>

          <section className="scr-results" aria-label={s.resultsLabel}>
            <div className="id-table-scroll">
              <table className="id-table id-num iqm-table scr-table">
                <colgroup><col /><col className="iqm-c-price" />{COLS.map((id) => <col key={id} className={`iqm-c-chg ${id === 'band' || id === 'pe' ? 'iqm-hide-sm' : ''}`.trim()} />)}</colgroup>
                <thead>
                  <tr>
                    {([['name', s.colCompany, ''], ['price', s.colPrice, 'is-end'], ...COLS.map((id) => [id, ar ? metricDef(id).ar : metricDef(id).en, `is-end ${id === 'band' || id === 'pe' ? 'iqm-hide-sm' : ''}`])] as [MetricId | 'name', string, string][]).map(([key, label, cls]) => {
                      const on = sortKey === key
                      return (
                        <th key={key} className={cls.trim()} aria-sort={on ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                          <button type="button" className={`iqm-sort ${on ? 'is-on' : ''}`.trim()} onClick={() => sortBy(key)}>
                            {key === 'change' ? `${label} · ${ar ? PERIODS.find((p) => p.id === period)!.ar : PERIODS.find((p) => p.id === period)!.en}` : label}
                            <span className="iqm-sort-arrow" aria-hidden="true">{on ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>
                          </button>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.ticker} className={r.suspended ? 'is-untraded' : undefined}>
                      <td>
                        <Link href={L(`/c/${r.ticker}`)} className="iqm-co">
                          <CompanyLogo sym={r.ticker} logo={r.logo} color={r.color} className="iqm-logo" />
                          <span className="iqm-co-text">
                            <span className="id-name">{r.name}</span>
                            <span className="id-sub">{r.ticker} · {sectorLabel(r.sector, locale)}{r.suspended && r.last_date ? ` · ${s.suspended} · ${shortDate(r.last_date, locale)}` : ''}</span>
                          </span>
                        </Link>
                      </td>
                      <td className="is-end iqm-price">{price.format(r.last_close)}</td>
                      {COLS.map((id) => {
                        const v = metricValue(r, id, period)
                        const cls = id === 'change' || id === 'foreign' ? (v == null ? '' : v > 0 ? 'id-up' : v < 0 ? 'id-down' : '') : ''
                        return <td key={id} className={`is-end ${id === 'band' || id === 'pe' ? 'iqm-hide-sm' : ''}`.trim()}><bdi className={`iqm-pct ${cls}`.trim()}>{fmtMetric(id, v, u)}</bdi></td>
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!rows.length ? (
              <div className="iqm-empty"><p className="id-h3">{s.emptyTitle}</p><p className="id-cap">{s.emptyNote}</p>
                <button type="button" className="id-btn is-sm" onClick={() => { setRanges({}); setSector('ALL'); setQ('') }}>{s.emptyReset}</button></div>
            ) : <p className="id-cap iqm-count">{int.format(rows.length)} {s.matchingOf} {int.format(all.filter((r) => suspended || !r.suspended).length)}{initial.peFailed ? ` · ${s.peFailed}` : ''}</p>}
          </section>

          <section className="scr-about id-read" aria-label={pg.about.title}>
            <h2 className="id-h2">{pg.about.title}</h2>
            {pg.about.body.map((tx, i) => <p key={i} className="id-body">{tx}</p>)}
            <p className="id-cap">{s.footnote}</p>
          </section>
        </div>
      </main>
    </SiteShell>
  )
}
