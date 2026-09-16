'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { useLocale } from '@/context/LocaleContext'
import { useApp } from '@/context/AppContext'
import { SiteShell } from './SiteShell'
import { DoorRail } from './DoorRail'
import { AboutSection } from './AboutSection'
import { PriceChart } from './PriceChart'
import type { CompanyInitial } from '@/lib/marketServer'
import { latestRatios, earningsSeries } from '@/lib/companyView'
import { sectorLabel } from '@/lib/screener'
import { localeDate } from '@/lib/date'
import '@/styles/company-page.css'

/**
 * /c/[sym] · one company.
 *
 * The price is the page: display weight at the top, the chart under it, then
 * the evidence — how it moved against the index, who trades it, what it
 * earns, who owns it.
 *
 * ── Everything here is SERVER-SEEDED ──────────────────────────────────────
 * This component fetches nothing. The old page queried Supabase from the
 * browser on every view, including `ownership_monthly` at limit 2000 and
 * `major_shareholders` at limit 4000 — six thousand rows pulled down to find
 * the handful belonging to one company, because those tables key on a
 * printed name rather than a ticker. `loadCompany` reads one period of each
 * instead and resolves the name server-side.
 *
 * ── A suspended share is not a current price ──────────────────────────────
 * Its last close can be years old. The page states the date of the last
 * actual trade next to the number rather than presenting a stale figure as
 * today's, and `noPrior` (no valid previous close) renders as "unknown"
 * rather than as a zero that would read as "no change".
 */
const RAIL = [
  { key: 'market', route: '/' }, { key: 'board', route: '/market' }, { key: 'companies', route: '/companies' },
  { key: 'screener', route: '/screener' }, { key: 'heatmap', route: '/heatmap' }, { key: 'statistics', route: '/statistics' }, { key: 'pulse', route: '/pulse' },
] as const

const int = new Intl.NumberFormat('en-US')
const price = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
type Units = { tn: string; bn: string; mn: string; k: string }
function compact(v: number | null | undefined, u: Units): string {
  if (v == null || !Number.isFinite(v)) return '—'
  const a = Math.abs(v), sign = v < 0 ? '−' : ''
  if (a >= 1e12) return `${sign}${(a / 1e12).toFixed(1)} ${u.tn}`
  if (a >= 1e9) return `${sign}${(a / 1e9).toFixed(1)} ${u.bn}`
  if (a >= 1e6) return `${sign}${(a / 1e6).toFixed(1)} ${u.mn}`
  if (a >= 1e3) return `${sign}${(a / 1e3).toFixed(0)} ${u.k}`
  return `${sign}${int.format(a)}`
}
const pctStr = (v: number | null) => (v == null ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(1)}%`)

export function CompanyPage({ initial }: { initial: CompanyInitial }) {
  const { t, locale, href: L } = useLocale()
  const C = t.company
  const P = C.page
  const u = t.site.units
  const { watchlist, toggleWatchlist } = useApp()
  const ar = locale === 'ar'
  const name = ar ? initial.ar : initial.en || initial.ar
  const watched = watchlist?.includes(initial.sym)

  const mcap = initial.last != null && initial.shares ? initial.last * initial.shares : null
  const ratios = useMemo(() => latestRatios(initial.ratios), [initial.ratios])
  const earnings = useMemo(() => earningsSeries(initial.facts, 'annual').slice(-5), [initial.facts])

  const flow = useMemo(() => {
    let buy = 0, sell = 0
    for (const r of initial.flow) { if (r.side === 'buy') buy += r.value; else if (r.side === 'sell') sell += r.value }
    return { buy, sell, net: buy - sell, sessions: new Set(initial.flow.map((r) => r.date)).size }
  }, [initial.flow])

  /* ⚠ buildReturns yields FRACTIONS (0.157), not percentages. Formatting one
     straight to `toFixed(1)` printed a 15.7% move as «0.2%». */
  const perf = ([['ytd', C.ytd], ['y1', C.y1], ['y3', C.y3], ['y5', C.y5]] as const)
    .map(([k, label]) => ({
      k, label,
      co: initial.returns.co?.[k] != null ? initial.returns.co![k]! * 100 : null,
      idx: initial.returns.idx?.[k] != null ? initial.returns.idx![k]! * 100 : null,
    }))
    .filter((r) => r.co != null || r.idx != null)
  /* Scale to the biggest move actually on screen, with a small floor so a
     quiet period still draws a bar rather than a hairline. */
  const perfMax = Math.max(5, ...perf.flatMap((r) => [Math.abs(r.co ?? 0), Math.abs(r.idx ?? 0)]))

  if (!initial.found) {
    return (
      <SiteShell>
        <main className="cmp id-full iq-door">
          <DoorRail door="markets" items={RAIL.map((r) => ({ label: t.market.page.rail[r.key], route: r.route }))} />
          <div className="cmp-body"><p className="id-note">{P.notFound}</p></div>
        </main>
      </SiteShell>
    )
  }

  return (
    <SiteShell>
      <main className="cmp id-full iq-door">
        <DoorRail door="markets" items={RAIL.map((r) => ({ label: t.market.page.rail[r.key], route: r.route }))} />
        <div className="cmp-body">
          <header>
            <p className="id-eyebrow">{P.eyebrow}</p>
            <div className="cmp-head">
              <div className="cmp-id">
                {initial.logo ? <img className="cmp-logo" src={initial.logo} alt="" width={44} height={44} loading="lazy" /> : null}
                <div className="cmp-names">
                  <h1>{name}</h1>
                  <p className="cmp-sub">
                    <bdi className="cmp-sym">{initial.sym}</bdi>
                    <span>{sectorLabel(initial.sec, locale)}</span>
                    <span>{C.exchange}</span>
                  </p>
                </div>
              </div>
              <div className="cmp-actions">
                <button type="button" className="id-btn is-sm" aria-pressed={watched} onClick={() => toggleWatchlist?.(initial.sym)}>
                  {watched ? C.watching : C.watch}
                </button>
                <Link className="id-btn is-sm" href={L(`/c/${initial.sym}/financials`)}>{C.fullFinancials}</Link>
              </div>
            </div>

            <p className="cmp-price id-num">
              <strong>{initial.last == null ? '—' : price.format(initial.last)}</strong>
              <span className="cmp-cur">{P.currency}</span>
              {initial.changePct == null
                ? <span className="id-chg is-flat">—</span>
                : <span className={`id-chg ${initial.changePct > 0 ? 'is-up' : initial.changePct < 0 ? 'is-down' : 'is-flat'}`}>
                    <bdi>{pctStr(initial.changePct)}</bdi>
                  </span>}
            </p>
            <p className="cmp-when id-num">
              {initial.session ? C.sessionClose(localeDate(initial.session, locale)) : C.latestAvailable}
            </p>
            {/* A stale price is stated as stale, with the date of the last real
                trade — never presented as today's. */}
            {initial.stale && initial.lastTrade ? (
              <p className="id-note cmp-warn">
                {(initial.daysSinceTrade ?? 0) > 60
                  ? P.suspended(localeDate(initial.lastTrade, locale))
                  : P.untraded(localeDate(initial.lastTrade, locale))}
              </p>
            ) : null}
            {initial.changePct == null && initial.last != null ? <p className="id-cap cmp-warn">{P.noPrior}</p> : null}
          </header>

          <section className="id-panel cmp-panel" aria-label={P.priceChart(name)}>
            <PriceChart bars={initial.series} label={P.priceChart(name)} sym={initial.sym} />
          </section>

          <section className="id-panel cmp-panel" aria-label={P.figures}>
            <h2 className="id-h3">{P.figures}</h2>
            <div className="id-stats id-num">
              <div className="id-stat"><small>{C.marketCap}</small><b>{compact(mcap, u)}</b></div>
              <div className="id-stat"><small>{C.issuedShares}</small><b>{compact(initial.shares, u)}</b></div>
              <div className="id-stat"><small>{C.volume}</small><b>{compact(initial.volume, u)}</b></div>
              <div className="id-stat"><small>{P.sessionValue}</small><b>{compact(initial.value, u)}</b></div>
              <div className="id-stat"><small>{P.trades}</small><b>{initial.trades == null ? '—' : int.format(initial.trades)}</b></div>
              <div className="id-stat"><small>{P.range52}</small><b>{initial.low52 == null || initial.high52 == null ? '—' : `${price.format(initial.low52)} – ${price.format(initial.high52)}`}</b></div>
              <div className="id-stat"><small>{C.pe}</small><b>{initial.pe == null ? '—' : `${initial.pe.toFixed(1)}×`}</b></div>
              <div className="id-stat"><small>{C.eps}</small><b>{ratios.map.eps == null ? '—' : price.format(ratios.map.eps)}</b></div>
            </div>
          </section>

          <div className="cmp-row">
            {perf.length ? (
              <section className="id-panel cmp-panel" aria-label={C.vsIndex}>
                <h2 className="id-h3">{C.vsIndex}</h2>
                <p className="id-cap">{C.vsIndexNote} · ISX60</p>
                <ul className="cmp-perf id-num">
                  {perf.map((r) => (
                    <li key={r.k}>
                      <span className="cmp-perf-label">{r.label}</span>
                      <span className="cmp-perf-track">
                        <i className="cmp-perf-zero" style={{ insetInlineStart: '50%' }} />
                        {r.co != null ? <i className={r.co >= 0 ? 'is-up' : 'is-down'} style={{ insetInlineStart: r.co >= 0 ? '50%' : `${50 - (Math.abs(r.co) / perfMax) * 50}%`, width: `${(Math.abs(r.co) / perfMax) * 50}%` }} /> : null}
                        {r.idx != null ? <i className="is-idx" style={{ insetInlineStart: r.idx >= 0 ? '50%' : `${50 - (Math.abs(r.idx) / perfMax) * 50}%`, width: `${(Math.abs(r.idx) / perfMax) * 50}%` }} /> : null}
                      </span>
                      <span className={`cmp-perf-val ${(r.co ?? 0) > 0 ? 'id-up' : (r.co ?? 0) < 0 ? 'id-down' : ''}`}><bdi>{pctStr(r.co)}</bdi></span>
                    </li>
                  ))}
                </ul>
                <p className="cmp-legend">
                  <span><i style={{ background: 'var(--moss-ink)' }} />{initial.sym}</span>
                  <span><i style={{ background: 'var(--muted)', opacity: .6 }} />ISX60</span>
                </p>
              </section>
            ) : null}

            <section className="id-panel cmp-panel" aria-label={C.foreignTrading}>
              <h2 className="id-h3">{C.foreignTrading}</h2>
              <p className="id-cap">{C.lastNSessions(int.format(flow.sessions))}</p>
              {!flow.sessions ? <p className="cmp-empty">{P.noFlow}</p> : (
                <>
                  <p className="cmp-price id-num" style={{ margin: 0 }}>
                    <strong className={flow.net > 0 ? 'id-up' : flow.net < 0 ? 'id-down' : ''} style={{ fontSize: 'clamp(28px,3.4vw,40px)' }}>
                      <bdi>{flow.net > 0 ? '+' : ''}{compact(flow.net, u)}</bdi>
                    </strong>
                    <span className="cmp-cur">{flow.net >= 0 ? C.netBuy : C.netSell}</span>
                  </p>
                  <div className="cmp-split" aria-hidden="true">
                    <i className="is-buy" style={{ flexBasis: `${(flow.buy / Math.max(1, flow.buy + flow.sell)) * 100}%` }} />
                    <i className="is-sell" style={{ flexBasis: `${(flow.sell / Math.max(1, flow.buy + flow.sell)) * 100}%` }} />
                  </div>
                  <div className="id-stats id-num" style={{ gridTemplateColumns: '1fr 1fr' }}>
                    <div className="id-stat"><small>{C.buy}</small><b>{compact(flow.buy, u)}</b></div>
                    <div className="id-stat"><small>{C.sell}</small><b>{compact(flow.sell, u)}</b></div>
                  </div>
                </>
              )}
            </section>
          </div>

          {earnings.length ? (
            <section className="id-panel cmp-panel" aria-label={C.incomeCorp}>
              <h2 className="id-h3">{initial.isBank ? C.incomeBank : C.incomeCorp}</h2>
              <p className="id-cap">{C.ratiosNote(String(ratios.year ?? '—'))}</p>
              <div className="cmp-scroll id-table-scroll">
                <table className="id-table cmp-table id-num">
                  <thead><tr><th scope="col">{P.periodCol}</th><th scope="col" className="is-end">{C.revenue}</th><th scope="col" className="is-end">{C.netProfit}</th></tr></thead>
                  <tbody>
                    {earnings.slice().reverse().map((e) => (
                      <tr key={`${e.year}-${e.period}`}>
                        <td><span className="id-name">{e.label}</span></td>
                        <td className="is-end"><bdi>{compact(e.rev, u)}</bdi></td>
                        <td className="is-end"><bdi className={(e.ni ?? 0) < 0 ? 'id-down' : ''}>{compact(e.ni, u)}</bdi></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          <div className="cmp-row">
            {initial.ownership ? (
              <section className="id-panel cmp-panel" aria-label={C.ownershipMix}>
                <h2 className="id-h3">{C.ownershipMix}</h2>
                <p className="id-cap">{C.ownershipNote(String(initial.ownership.month), String(initial.ownership.year))}</p>
                {(() => {
                  const i = initial.ownership!.iraqi_shares ?? 0, f = initial.ownership!.foreign_shares ?? 0
                  const tot = i + f
                  const fp = tot ? (f / tot) * 100 : 0
                  return (
                    <>
                      <p className="cmp-price id-num" style={{ margin: 0 }}>
                        <strong style={{ fontSize: 'clamp(28px,3.4vw,40px)' }}><bdi>{fp.toFixed(2)}%</bdi></strong>
                        <span className="cmp-cur">{C.foreignOwnership}</span>
                      </p>
                      <div className="cmp-split" aria-hidden="true">
                        <i className="is-buy" style={{ flexBasis: `${100 - fp}%` }} />
                        <i className="is-sell" style={{ flexBasis: `${fp}%` }} />
                      </div>
                    </>
                  )
                })()}
              </section>
            ) : null}

            <section className="id-panel cmp-panel" aria-label={C.majorShareholders}>
              <h2 className="id-h3">{C.majorShareholders}</h2>
              {!initial.holders.length ? <p className="cmp-empty">{P.noHolders}</p> : (
                <div className="cmp-scroll id-table-scroll">
                  <table className="id-table cmp-table is-sm id-num">
                    <thead><tr><th scope="col">{P.holderCols.holder}</th><th scope="col" className="is-end">{P.holderCols.pct}</th></tr></thead>
                    <tbody>
                      {initial.holders.map((h, i) => (
                        <tr key={`${h.name}-${i}`}>
                          {/* Filed spelling, never translated or matched. */}
                          <td><bdi>{h.name}</bdi></td>
                          <td className="is-end"><bdi>{h.pct == null ? '—' : `${h.pct.toFixed(2)}%`}</bdi></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

          <AboutSection title={P.about.title} body={P.about.body} />
        </div>
      </main>
    </SiteShell>
  )
}
