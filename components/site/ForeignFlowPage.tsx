'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useLocale } from '@/context/LocaleContext'
import { SiteShell } from './SiteShell'
import { DoorRail } from './DoorRail'
import { PageTitle } from './PageTitle'
import type { FlowInitial } from '@/lib/marketServer'
import { monthLabel } from '@/lib/statistics'
import { shortDate, localeDate } from '@/lib/date'
import companiesData from '@/public/data/companies.json'
import type { CompanyMeta } from '@/types'
import '@/styles/markets.css'
import '@/styles/statistics-page.css'
import '@/styles/flow-page.css'

/**
 * /statistics/foreign-flow · two tabs, one question each.
 *
 *   من يتداول — Iraqis vs foreigners as a share of the market's buying (or
 *   selling) for a session, a month, a year or everything we hold: a ring,
 *   a buy/sell switch, then the net flow session by session with the
 *   cumulative line, and the companies foreigners bought and sold most.
 *
 *   من يدخل السوق — accounts at the depository by investor type and
 *   nationality: held at month end where the report gives it, opened in the
 *   month where it gives that, and the series month by month. Account
 *   counts, never trading — the page says so, because the exchange does not
 *   publish trading by investor type.
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
const R = 74, SW = 16, C = 2 * Math.PI * R

export function ForeignFlowPage({ initial }: { initial: FlowInitial }) {
  const { t, locale, href: L } = useLocale()
  const f = t.flow
  const pg = f.page
  const u = t.site.units
  const ar = locale === 'ar'
  const [tab, setTab] = useState<'trading' | 'accounts'>('trading')
  const [side, setSide] = useState<'buy' | 'sell'>('buy')
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year' | 'all'>('month')
  const [ringSide, setRingSide] = useState<'iraqi' | 'foreign' | null>(null)
  const [drawn, setDrawn] = useState(false)
  const [hover, setHover] = useState<number | null>(null)

  /* Sessions with both a foreign figure and a market total. */
  const sessions = useMemo(() => {
    const total = new Map(initial.sessionValue.map((r) => [r.date, r.value]))
    const by = new Map<string, { date: string; buy: number; sell: number; trades: number; total: number | null }>()
    for (const r of initial.daily) {
      const s = by.get(r.date) ?? { date: r.date, buy: 0, sell: 0, trades: 0, total: total.get(r.date) ?? null }
      if (r.side === 'buy') s.buy += r.value; else if (r.side === 'sell') s.sell += r.value
      s.trades += r.trades
      by.set(r.date, s)
    }
    return Array.from(by.values()).sort((a, b) => a.date.localeCompare(b.date))
  }, [initial])
  const last = sessions[sessions.length - 1]
  const win = useMemo(() => {
    if (!last) return []
    if (period === 'all') return sessions
    const days = period === 'month' ? 31 : period === 'quarter' ? 92 : 366
    const since = new Date(new Date(last.date).getTime() - days * 86400_000).toISOString().slice(0, 10)
    return sessions.filter((s) => s.date >= since)
  }, [sessions, last, period])
  const sum = useMemo(() => {
    const withTotal = win.filter((s) => s.total != null)
    return {
      buy: win.reduce((a, s) => a + s.buy, 0), sell: win.reduce((a, s) => a + s.sell, 0),
      total: withTotal.reduce((a, s) => a + (s.total ?? 0), 0), covered: withTotal.length,
      buyDays: win.filter((s) => s.buy - s.sell > 0).length,
    }
  }, [win])
  const foreignVal = side === 'buy' ? sum.buy : sum.sell
  const share = sum.total > 0 ? Math.min(1, foreignVal / sum.total) : null
  const gap = 0.01 * C
  const fLen = share == null || !drawn ? 0 : Math.max(0, share * C - gap)
  const iLen = share == null || !drawn ? 0 : Math.max(0, (1 - share) * C - gap)
  const periodLabel = pg.periods[period]
  useEffect(() => { setDrawn(false); const id = requestAnimationFrame(() => requestAnimationFrame(() => setDrawn(true))); return () => cancelAnimationFrame(id) }, [period, side, sum.total])
  const rangeText = win.length ? (win.length === 1 ? localeDate(win[0].date, locale) : `${shortDate(win[0].date, locale)} – ${shortDate(win[win.length - 1].date, locale)}`) : ''

  /* Net flow bars + cumulative line, drawn to scale. */
  /* Bars on a signed square-root scale (a 10k day and a 12bn day both stay
     visible, the big one still biggest); the cumulative line on its own
     linear scale at the right. Hover reads exact figures. */
  const W = 900, H = 300, PT = 14, PB = 24, PR = 64
  const nets = win.map((s) => s.buy - s.sell)
  const cum = nets.reduce<number[]>((acc, v) => { acc.push((acc[acc.length - 1] ?? 0) + v); return acc }, [])
  const maxAbs = Math.max(1, ...nets.map(Math.abs))
  const cumMax = Math.max(1, ...cum.map(Math.abs))
  const bw = (W - PR) / Math.max(1, win.length)
  const y0 = PT + (H - PT - PB) / 2
  const half = (H - PT - PB) / 2
  const y = (v: number) => y0 - Math.sign(v) * Math.sqrt(Math.abs(v) / maxAbs) * half
  const yc = (v: number) => y0 - (v / cumMax) * half
  const cumPath = cum.map((v, i) => `${i ? 'L' : 'M'}${(i + 0.5) * bw},${yc(v)}`).join(' ')
  const shown = hover != null ? win[hover] : null

  /* Most bought / sold by net over the last N sessions of company rows. */
  const meta = useMemo(() => new Map((companiesData as CompanyMeta[]).map((m) => [m.sym, m])), [])
  const top = useMemo(() => {
    const dates = Array.from(new Set(initial.companies.map((r) => r.date))).sort().reverse().slice(0, 40)
    const keep = new Set(dates)
    const net = new Map<string, number>()
    for (const r of initial.companies) if (keep.has(r.date)) net.set(r.ticker, (net.get(r.ticker) ?? 0) + (r.side === 'buy' ? r.value : -r.value))
    const list = Array.from(net.entries()).map(([sym, v]) => ({ sym, v }))
    return { n: dates.length, bought: list.filter((x) => x.v > 0).sort((a, b) => b.v - a.v).slice(0, 5), sold: list.filter((x) => x.v < 0).sort((a, b) => a.v - b.v).slice(0, 5) }
  }, [initial.companies])
  const nameOf = (sym: string) => { const m = meta.get(sym); return m ? (ar ? m.ar : m.en || m.ar) : sym }

  /* Accounts. */
  const acc = initial.accounts
  const latestHeld = [...acc].reverse().find((m) => m.total)
  const latestNew = [...acc].reverse().find((m) => m.new)
  const held = latestHeld?.total ?? null
  const heldRows = held ? (['natural', 'company', 'government', 'fund'] as const).map((k) => ({ k, iraqi: held[`${k}_iraqi`] ?? 0, foreign: held[`${k}_foreign`] ?? 0 })).filter((r) => r.iraqi + r.foreign > 0) : []
  const heldTotal = heldRows.reduce((a, r) => a + r.iraqi + r.foreign, 0)
  const heldNatural = heldRows.find((r) => r.k === 'natural'); const natSum = heldNatural ? heldNatural.iraqi + heldNatural.foreign : 0
  const series = acc.filter((m) => m.new).slice(-24)
  const seriesMax = Math.max(1, ...series.map((m) => (m.new!.natural_iraqi + m.new!.natural_foreign + m.new!.legal_iraqi + m.new!.legal_foreign)))

  return (
    <SiteShell>
      <main className="ffl id-full iq-door">
        <DoorRail door="markets" items={RAIL.map((r) => ({ label: t.market.page.rail[r.key], route: r.route }))} />
        <div className="ffl-body">
          <header className="stx-head">
            <p className="id-eyebrow">{pg.eyebrow}</p>
            <PageTitle title={pg.title} note={pg.lede} />
            <nav className="id-pills stx-sub" aria-label={t.statistics.tabsLabel}>
              {SUB.map((s) => <Link key={s.key} href={L(s.route)} className="id-pill" aria-current={s.key === 'flow' ? 'page' : undefined}>{t.statistics.page.sub[s.key]}</Link>)}
            </nav>
          </header>

          <div className="ffl-tabs" role="tablist">
            {(['trading', 'accounts'] as const).map((k) => (
              <button key={k} type="button" role="tab" className={`ffl-tab ${tab === k ? 'is-on' : ''}`.trim()} aria-selected={tab === k} onClick={() => setTab(k)}>{pg.tabs[k]}</button>
            ))}
          </div>

          {/* ⚠ BOTH panels render, always. Toggling with `hidden` keeps the
              inactive tab in the server-rendered HTML; the `tab === …`
              conditional this replaces kept the whole accounts tab out of the
              page a crawler sees. */}
          <div role="tabpanel" aria-label={pg.tabs.trading} hidden={tab !== 'trading'}>
              {/* 1 · Net flow, session by session, with the timeframe on the chart. */}
              <section className="id-panel ffl-net" aria-label={pg.netTitle}>
                <div className="ffl-net-head">
                  <div><h2 className="id-h3">{pg.netTitle}</h2><p className="id-cap">{pg.netNote}</p></div>
                  <div className="id-pills" role="group" aria-label={f.periodGroup}>
                    {(['month', 'quarter', 'year', 'all'] as const).map((p) => <button key={p} type="button" className="id-pill is-sm" aria-pressed={period === p} onClick={() => { setPeriod(p); setHover(null) }}>{pg.periods[p]}</button>)}
                  </div>
                </div>
                <p className="stx-reading id-num">
                  <strong className={shown ? (shown.buy - shown.sell > 0 ? 'id-up' : shown.buy - shown.sell < 0 ? 'id-down' : '') : (cum[cum.length - 1] > 0 ? 'id-up' : cum[cum.length - 1] < 0 ? 'id-down' : '')}>
                    <bdi>{shown ? `${shown.buy - shown.sell > 0 ? '+' : ''}${compact(shown.buy - shown.sell, u)}` : `${cum[cum.length - 1] > 0 ? '+' : ''}${compact(cum[cum.length - 1] ?? 0, u)}`}</bdi>
                  </strong>
                  <span className="id-cap">{shown ? `${localeDate(shown.date, locale)} · ${pg.figures.buy} ${compact(shown.buy, u)} · ${pg.figures.sell} ${compact(shown.sell, u)}` : `${pg.cumulative} · ${rangeText}`}</span>
                </p>
                {win.length > 1 ? (
                  <svg viewBox={`0 0 ${W} ${H}`} className="ffl-svg id-num" onPointerLeave={() => setHover(null)} role="img" aria-label={pg.netTitle}>
                    <line x1={0} x2={W - PR} y1={y0} y2={y0} className="ffl-zero" />
                    <text x={W - PR + 8} y={PT + 4} className="stx-tick">{compact(cumMax, u)}</text>
                    <text x={W - PR + 8} y={H - PB - 4} className="stx-tick">{compact(-cumMax, u)}</text>
                    {win.map((s, i) => { const v = s.buy - s.sell; return (
                      <g key={s.date} onPointerEnter={() => setHover(i)}>
                        <rect x={i * bw} y={PT} width={bw} height={H - PT - PB} fill="transparent" />
                        {hover === i ? <rect x={i * bw} y={PT} width={bw} height={H - PT - PB} className="ffl-hl" /> : null}
                        <rect x={i * bw + bw * 0.18} y={Math.min(y0, y(v))} width={Math.max(1.5, bw * 0.64)} height={Math.max(1.5, Math.abs(y(v) - y0))} rx={Math.min(3, bw * 0.25)} className={`ffl-bar ${v >= 0 ? 'is-buy' : 'is-sell'} ${hover === i ? 'is-on' : ''}`.trim()} />
                      </g>) })}
                    <path d={cumPath} className="ffl-cum" />
                    {hover != null ? <circle cx={(hover + 0.5) * bw} cy={yc(cum[hover])} r="4" className="ffl-cum-dot" /> : null}
                  </svg>
                ) : null}
                <div className="ffl-figs id-num ffl-figs-row">
                  <div><small>{pg.figures.buy}</small><b>{compact(sum.buy, u)}</b></div>
                  <div><small>{pg.figures.sell}</small><b>{compact(sum.sell, u)}</b></div>
                  <div><small>{pg.figures.net}</small><b className={sum.buy - sum.sell > 0 ? 'id-up' : sum.buy - sum.sell < 0 ? 'id-down' : ''}><bdi>{sum.buy - sum.sell > 0 ? '+' : ''}{compact(sum.buy - sum.sell, u)}</bdi></b></div>
                  <div><small>{pg.figures.buyDays}</small><b>{int.format(sum.buyDays)} <span className="id-cap">/ {int.format(win.length)}</span></b></div>
                </div>
              </section>

              {/* 2 · Side by side: who foreigners bought and sold · Iraqis vs foreigners as a ring. */}
              <div className="ffl-row">
                <section className="id-panel ffl-top" aria-label={pg.top}>
                  <h2 className="id-h3">{pg.top}</h2>
                  <p className="id-cap">{pg.topNote(int.format(top.n))}</p>
                  <div className="ffl-top-grid">
                    {([['bought', top.bought], ['sold', top.sold]] as const).map(([k, list]) => (
                      <div key={k}>
                        <p className={`ffl-top-h ${k === 'bought' ? 'id-up' : 'id-down'}`}>{k === 'bought' ? pg.bought : pg.sold}</p>
                        <ol className="ffl-top-list id-num">
                          {list.map((x) => (
                            <li key={x.sym}><Link href={L(`/c/${x.sym}`)}><span className="id-name">{nameOf(x.sym)}</span><span className="id-sub">{x.sym}</span></Link><bdi className={k === 'bought' ? 'id-up' : 'id-down'}>{k === 'bought' ? '+' : ''}{compact(x.v, u)}</bdi></li>
                          ))}
                          {!list.length ? <li className="id-cap">—</li> : null}
                        </ol>
                      </div>
                    ))}
                  </div>
                </section>

                <section className={`id-panel ffl-ring-panel ${ringSide ? `is-${ringSide}` : ''}`.trim()} aria-label={pg.shareOf(pg.side[side])}>
                  <div className="ffl-ring-head">
                    <div><h2 className="id-h3">{pg.iraqis} · {pg.foreigners}</h2><p className="id-cap">{pg.shareOf(pg.side[side])} · {periodLabel}</p></div>
                    <div className="id-pills" role="group">
                      {(['buy', 'sell'] as const).map((sd) => <button key={sd} type="button" className="id-pill is-sm" aria-pressed={side === sd} onClick={() => setSide(sd)}>{pg.side[sd]}</button>)}
                    </div>
                  </div>
                  <div className="ffl-ring-body">
                    <svg className="ffl-ring" viewBox="0 0 180 180" role="img" aria-label={pg.shareOf(pg.side[side])}>
                      <circle cx="90" cy="90" r={R} className="ffl-track" strokeWidth={SW} />
                      <circle cx="90" cy="90" r={R} className="ffl-iraqi" strokeWidth={SW} strokeDasharray={`${iLen} ${C - iLen}`} strokeDashoffset={C / 4 - gap / 2}
                        onPointerEnter={() => setRingSide('iraqi')} onPointerLeave={() => setRingSide(null)} />
                      <circle cx="90" cy="90" r={R} className="ffl-foreign" strokeWidth={SW} strokeDasharray={`${fLen} ${C - fLen}`} strokeDashoffset={C / 4 - gap / 2 - (share == null || !drawn ? 0 : (1 - share) * C)}
                        onPointerEnter={() => setRingSide('foreign')} onPointerLeave={() => setRingSide(null)} />
                      <text x="90" y="84" className="ffl-center id-num">{share == null ? '—' : `${(share * 100).toFixed(1)}%`}</text>
                      <text x="90" y="104" className="ffl-center-label">{pg.foreigners}</text>
                    </svg>
                    <dl className="ffl-legend id-num">
                      <div className="is-iraqi" onPointerEnter={() => setRingSide('iraqi')} onPointerLeave={() => setRingSide(null)}><dt><i />{pg.iraqis}</dt><dd>{share == null ? '—' : `${((1 - share) * 100).toFixed(1)}%`}<span className="id-cap">{compact(sum.total - foreignVal, u)}</span></dd></div>
                      <div className="is-foreign" onPointerEnter={() => setRingSide('foreign')} onPointerLeave={() => setRingSide(null)}><dt><i />{pg.foreigners}</dt><dd>{share == null ? '—' : `${(share * 100).toFixed(1)}%`}<span className="id-cap">{compact(foreignVal, u)}</span></dd></div>
                    </dl>
                  </div>
                  {share == null ? <p className="id-cap">{pg.noTotals}</p> : null}
                </section>
              </div>
          </div>
          <div role="tabpanel" aria-label={pg.tabs.accounts} hidden={tab !== 'accounts'}>
              {held && heldTotal ? (
                <section className="ffl-ring-panel id-panel" aria-label={pg.accounts.held}>
                  <div className="ffl-ring-head"><div><h2 className="id-h3">{pg.accounts.held}</h2><p className="id-cap">{pg.accounts.heldNote(monthLabel(latestHeld!.ym, locale))}</p></div></div>
                  <div className="ffl-ring-body">
                    <svg className="ffl-ring" viewBox="0 0 180 180" role="img" aria-label={pg.accounts.held}>
                      <circle cx="90" cy="90" r={R} className="ffl-track" strokeWidth={SW} />
                      <circle cx="90" cy="90" r={R} className="ffl-iraqi" strokeWidth={SW} strokeDasharray={`${Math.max(0, (natSum / heldTotal) * C - gap)} ${C}`} strokeDashoffset={C / 4 - gap / 2} />
                      <circle cx="90" cy="90" r={R} className="ffl-foreign" strokeWidth={SW} strokeDasharray={`${Math.max(0, (1 - natSum / heldTotal) * C - gap)} ${C}`} strokeDashoffset={C / 4 - gap / 2 - (natSum / heldTotal) * C} />
                      <text x="90" y="84" className="ffl-center id-num">{((natSum / heldTotal) * 100).toFixed(1)}%</text>
                      <text x="90" y="104" className="ffl-center-label">{pg.accounts.natural}</text>
                    </svg>
                    <div className="ffl-legend id-num">
                      <dl className="ffl-held">
                        {heldRows.map((r) => (
                          <div key={r.k}><dt>{pg.accounts.kinds[r.k]}</dt><dd>{int.format(r.iraqi + r.foreign)} <span className="id-cap">{pg.iraqis} {int.format(r.iraqi)} · {pg.foreigners} {int.format(r.foreign)}</span></dd></div>
                        ))}
                        <div className="is-total"><dt>{pg.accounts.total.replace(pg.accounts.total, ar ? 'الإجمالي' : 'Total')}</dt><dd>{int.format(heldTotal)}</dd></div>
                      </dl>
                    </div>
                  </div>
                </section>
              ) : null}

              {latestNew ? (
                <section className="id-panel ffl-new" aria-label={pg.accounts.newTitle}>
                  <h2 className="id-h3">{pg.accounts.newTitle}</h2>
                  <p className="id-cap">{pg.accounts.note(monthLabel(latestNew.ym, locale))}</p>
                  <div className="ffl-figs id-num">
                    <div><small>{pg.accounts.natural} · {pg.iraqis}</small><b>{int.format(latestNew.new!.natural_iraqi)}</b></div>
                    <div><small>{pg.accounts.natural} · {pg.foreigners}</small><b>{int.format(latestNew.new!.natural_foreign)}</b></div>
                    <div><small>{pg.accounts.legal} · {pg.iraqis}</small><b>{int.format(latestNew.new!.legal_iraqi)}</b></div>
                    <div><small>{pg.accounts.legal} · {pg.foreigners}</small><b>{int.format(latestNew.new!.legal_foreign)}</b></div>
                  </div>
                  {series.length > 1 ? (
                    <>
                      <p className="id-cap ffl-series-note">{pg.accounts.series} · {pg.accounts.seriesNote}</p>
                      <div className="ffl-series" role="img" aria-label={pg.accounts.series}>
                        {series.map((m) => { const n = m.new!; const nat = n.natural_iraqi + n.natural_foreign, leg = n.legal_iraqi + n.legal_foreign; return (
                          <div key={m.ym} className="ffl-col" title={`${monthLabel(m.ym, locale)} · ${int.format(nat)} / ${int.format(leg)}`}>
                            <span className="ffl-stack"><i className="is-legal" style={{ height: `${(leg / seriesMax) * 100}%` }} /><i className="is-natural" style={{ height: `${(nat / seriesMax) * 100}%` }} /></span>
                            <span className="id-cap">{m.ym.slice(5)}</span>
                          </div>) })}
                      </div>
                    </>
                  ) : null}
                </section>
              ) : null}
              {!held && !latestNew ? <p className="id-note">{pg.accounts.empty}</p> : null}
              <p className="id-cap ffl-caveat">{pg.accounts.caveat}</p>
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
