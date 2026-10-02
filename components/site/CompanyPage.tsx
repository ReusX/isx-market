'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useLocale } from '@/context/LocaleContext'
import { periodLabel } from '@/lib/news'
import { useApp } from '@/context/AppContext'
import { SiteShell } from './SiteShell'
import { DoorRail } from './DoorRail'
import { AboutSection } from './AboutSection'
import { PriceChart } from './PriceChart'
import type { CompanyInitial } from '@/lib/marketServer'
import { latestRatios, earningsSeries } from '@/lib/companyView'
import { sectorLabel } from '@/lib/screener'
import { buildCompanyProfile } from '@/lib/companyProfile'
import { localeDate } from '@/lib/date'
import '@/styles/econ-page.css'
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

/* Results pages exist in Arabic only; resolved per locale for the link gate. */
const RESULTS_HOME: Record<string, string | null> = { ar: '/c', en: null }

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
  /* The profile: hand-written for 41 companies, generated for the rest, the
     last close folded into its facts and its price question. This is the
     unique prose the page ranks with; it is server-rendered like the rest. */
  const profile = useMemo(() => buildCompanyProfile({
    sym: initial.sym, ar: initial.ar, en: initial.en,
    sector: sectorLabel(initial.sec, locale),
    mcapIqd: mcap,
    quote: initial.last != null && initial.session ? { close: initial.last, pct: initial.changePct, date: initial.session, suspended: initial.stale && (initial.daysSinceTrade ?? 0) > 60 } : null,
  }, C.gen, locale), [initial, mcap, locale, C])
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

  const B = P.board
  const R = t.rates
  const dir = initial.changePct == null || Math.round(initial.changePct * 100) === 0 ? 0 : initial.changePct > 0 ? 1 : -1
  /* The board's chart: the last month of sessions. */
  const month = useMemo(() => {
    const s = initial.series
    if (!s.length) return []
    const since = new Date(new Date(s[s.length - 1].date).getTime() - 31 * 86400_000).toISOString().slice(0, 10)
    return s.filter((b) => b.date >= since)
  }, [initial.series])
  const monthPct = month.length > 1 && month[0].open ? ((month[month.length - 1].close - month[0].open) / month[0].open) * 100 : null
  const monthDir = monthPct == null || Math.round(monthPct * 10) === 0 ? 0 : monthPct > 0 ? 1 : -1
  /* «What if you had bought»: the first session on or after the chosen day. */
  const [ifAmount, setIfAmount] = useState('1000000')
  const [ago, setAgo] = useState<'m1' | 'm6' | 'y1' | 'y5'>('m1')
  const ifNum = parseFloat(ifAmount.replace(/,/g, '')) || 0
  /* Only the periods our record actually reaches are offered; a record that
     starts within two weeks of the date still counts (its first session). */
  const AGO_DAYS = { m1: 31, m6: 183, y1: 366, y5: 1827 } as const
  const agoOk = useMemo(() => {
    const first = initial.series[0]?.date
    const ok = (k: keyof typeof AGO_DAYS) => !!first && first <= new Date(Date.now() - (AGO_DAYS[k] - 14) * 86400_000).toISOString().slice(0, 10)
    return (['m1', 'm6', 'y1', 'y5'] as const).filter(ok)
  // eslint-disable-next-line react-hooks/exhaustive-deps -- AGO_DAYS is a constant
  }, [initial.series])
  const agoUsed = agoOk.includes(ago) ? ago : agoOk[agoOk.length - 1] ?? 'm1'
  const buy = useMemo(() => {
    const target = new Date(Date.now() - AGO_DAYS[agoUsed] * 86400_000).toISOString().slice(0, 10)
    const bar = initial.series.find((b) => b.date >= target)
    return bar && bar.close > 0 && agoOk.includes(agoUsed) ? bar : null
  // eslint-disable-next-line react-hooks/exhaustive-deps -- AGO_DAYS is a constant
  }, [agoUsed, agoOk, initial.series])
  const worth = buy && initial.last != null ? ifNum * (initial.last / buy.close) : 0

  if (!initial.found) {
    return (
      <SiteShell>
        <main className="cmp id-full iq-door" data-world="lapis" data-level="calm">
          <DoorRail door="markets" />
          <div className="cmp-body"><p className="id-note">{P.notFound}</p></div>
        </main>
      </SiteShell>
    )
  }

  return (
    <SiteShell>
      <main className="cmp id-full iq-door" data-world="lapis" data-level="calm">
        <DoorRail door="markets" />
        <div className="cmp-body">
          {/* Identity v3, board 1 «صفحة شركة»: the price and its month as the
              lead, «what if you had bought» as the key card. */}
          <div className="fx-frame">
            <header className="cmp-head">
              <div className="cmp-id">
                {initial.logo ? <img className="cmp-logo" src={initial.logo} alt="" width={52} height={52} loading="lazy" /> : <span className="cmp-badge id-num">{initial.sym}</span>}
                <div className="cmp-names">
                  <h1>{name}</h1>
                  <p className="cmp-sub">
                    <bdi className="cmp-sym">{initial.sym}</bdi>
                    <span>{sectorLabel(initial.sec, locale)}</span>
                    <span>{initial.session ? C.sessionClose(localeDate(initial.session, locale)) : C.latestAvailable}</span>
                  </p>
                </div>
              </div>
              <div className="cmp-actions">
                <button type="button" className="fx-qbtn" aria-pressed={watched} onClick={() => toggleWatchlist?.(initial.sym)}>
                  {watched ? C.watching : C.watch}
                </button>
                <Link className="fx-qbtn" href={L(`/c/${initial.sym}/financials`)}>{C.fullFinancials}</Link>
                {initial.latestResults && RESULTS_HOME[locale] ? (
                  <Link className="fx-qbtn" href={L(`${RESULTS_HOME[locale]}/${initial.sym}/results/${initial.latestResults.slug}`)}>
                    {C.latestResults(periodLabel(initial.latestResults.period, locale), String(initial.latestResults.year))}
                  </Link>
                ) : null}
              </div>
            </header>

            <div className="fx-board">
              <div className="fx-lead">
                <p className="fx-huge id-num">
                  <span className={`fx-huge-num ${dir === 0 ? '' : dir > 0 ? 'is-up' : 'is-down'}`.trim()}>
                    <bdi>{initial.last == null ? '—' : price.format(initial.last)}</bdi>
                    <svg className="fx-swoosh" viewBox="0 0 200 40" preserveAspectRatio="none" aria-hidden="true">
                      <path d="M4 30 C 50 10, 110 4, 196 20" pathLength={1} fill="none" stroke="currentColor" strokeWidth={5} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                    </svg>
                  </span>
                </p>
                <p className="fx-line">
                  {initial.changePct == null
                    ? <span className="id-chg is-flat">—</span>
                    : <span className={`id-chg ${dir > 0 ? 'is-up' : dir < 0 ? 'is-down' : 'is-flat'}`}>
                        <bdi>{initial.change != null && dir !== 0 ? `${initial.change > 0 ? '+' : ''}${price.format(initial.change)} · ` : ''}{pctStr(initial.changePct)}</bdi>
                      </span>}
                  <span>{B.perShare}{initial.session ? ` · ${C.sessionClose(localeDate(initial.session, locale))}` : ''}</span>
                </p>
                {/* A stale price is stated as stale, with the date of the last
                    real trade — never presented as today's. */}
                {initial.stale && initial.lastTrade ? (
                  <p className="id-note cmp-warn">
                    {(initial.daysSinceTrade ?? 0) > 60 ? P.suspended(localeDate(initial.lastTrade, locale)) : P.untraded(localeDate(initial.lastTrade, locale))}
                  </p>
                ) : null}
                {initial.changePct == null && initial.last != null ? <p className="id-cap cmp-warn">{P.noPrior}</p> : null}

                {/* One chart, the full one: the board's look, a month of
                    candles to start; ranges, line, averages, zoom, drag and
                    drawing tools on the same chart. */}
                {initial.series.length > 1 ? <PriceChart bars={initial.series} label={P.priceChart(name)} sym={initial.sym} defaultRange="m1" /> : null}
                {month.length > 1 ? (
                  <>
                    <div className="cmp-mstats id-num">
                      <div><small>{B.monthHigh}</small><b>{price.format(Math.max(...month.map((b) => b.high)))}</b></div>
                      <div><small>{B.monthLow}</small><b>{price.format(Math.min(...month.map((b) => b.low)))}</b></div>
                      <div><small>{B.monthChg}</small><b className={monthDir > 0 ? 'id-up' : monthDir < 0 ? 'id-down' : ''}><bdi>{pctStr(monthPct)}</bdi></b></div>
                    </div>
                  </>
                ) : null}
              </div>

              {initial.last != null && agoOk.length ? (
                <section className="id-print is-key fx-calc" aria-label={B.ifTitle(int.format(ifNum), B.when[agoUsed])}>
                  <h2 className="fx-calc-title">{B.ifTitle(int.format(ifNum), B.when[agoUsed])}</h2>
                  <label className="fx-calc-in" htmlFor="cmp-amount">
                    <span>{B.amount}</span>
                    <input id="cmp-amount" className="id-num" inputMode="decimal" dir="ltr" value={ifAmount} onChange={(e) => setIfAmount(e.target.value)} />
                  </label>
                  <div className="fx-quick" role="group" aria-label={B.amount}>
                    {agoOk.map((k) => <button key={k} type="button" className="fx-qbtn" aria-pressed={agoUsed === k} onClick={() => setAgo(k)}>{B.when[k]}</button>)}
                  </div>
                  {buy ? (
                    <>
                      <p className={`fx-calc-out id-num ${worth > ifNum ? 'id-up' : worth < ifNum ? 'id-down' : ''}`.trim()}><bdi>{int.format(Math.round(worth))}</bdi> <span>{R.page.fx.calcIqd}</span></p>
                      <p className="fx-calc-note">{B.ifNote(price.format(buy.close), localeDate(buy.date, locale), price.format(initial.last), int.format(Math.round(Math.abs(worth - ifNum))), worth >= ifNum)}</p>
                    </>
                  ) : <p className="fx-calc-note">{B.noHistory}</p>}
                  <p className="fx-calc-note">{B.notAdvice}</p>
                </section>
              ) : null}
            </div>
          </div>

          {/* The share's figures, grouped into four print cards that each say
              one thing: size, today's trading, where the price sits in its
              year, and how it is valued. */}
          <section className="cmp-figs" aria-label={B.figures}>
            <div className="id-print is-calm cmp-fig id-num">
              <small>{C.marketCap}</small>
              <strong><bdi>{compact(mcap, u)}</bdi></strong>
              <span>{C.issuedShares} · {compact(initial.shares, u)}</span>
            </div>
            <div className="id-print is-calm cmp-fig id-num">
              <small>{P.sessionValue}</small>
              <strong><bdi>{compact(initial.value, u)}</bdi></strong>
              <span>{C.volume} · {compact(initial.volume, u)} · {P.trades} · {initial.trades == null ? '—' : int.format(initial.trades)}</span>
            </div>
            <div className="id-print is-calm cmp-fig id-num">
              <small>{P.range52}</small>
              {initial.low52 != null && initial.high52 != null && initial.last != null ? (
                <div className="fx-range cmp-fig-range">
                  <div className="fx-range-track" aria-hidden="true"><i style={{ insetInlineStart: `${initial.high52 > initial.low52 ? Math.min(100, Math.max(0, ((initial.last - initial.low52) / (initial.high52 - initial.low52)) * 100)) : 50}%` }} /></div>
                  <div className="fx-range-ends"><span><small>{t.rates.fx.periodLow}</small> <bdi>{price.format(initial.low52)}</bdi></span><span><small>{t.rates.fx.periodHigh}</small> <bdi>{price.format(initial.high52)}</bdi></span></div>
                </div>
              ) : <strong>—</strong>}
            </div>
            <div className="id-print is-calm cmp-fig id-num">
              <small>{C.pe}</small>
              <strong><bdi>{initial.pe == null ? '—' : `${initial.pe.toFixed(1)}×`}</bdi></strong>
              <span>{C.eps} · {ratios.map.eps == null ? '—' : price.format(ratios.map.eps)}</span>
            </div>
          </section>

          {/* The evidence as story cards (Thndr's principle, our voice). */}
          <div className="fx-facts cmp-facts id-num">
            <section className="id-print is-calm fx-fact" aria-label={C.foreignTrading}>
              <svg className="fx-ill" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="22" fill="var(--fill)" stroke="currentColor" strokeWidth="2.5"/><path d="M10 32h44M32 10c-8 7-8 37 0 44M32 10c8 7 8 37 0 44" fill="none" stroke="currentColor" strokeWidth="2.2"/></svg>
              {!flow.sessions ? (
                <><h3 className="fx-fact-head">{C.foreignTrading}</h3><p className="fx-pocket">{P.noFlow}</p></>
              ) : (() => {
                const head = B.flowHead(compact(Math.abs(flow.net), u), flow.net >= 0)
                return (
                  <>
                    <h3 className={`fx-fact-head ${flow.net > 0 ? 'is-up' : flow.net < 0 ? 'is-down' : ''}`.trim()}>{head[0]}<em><bdi>{head[1]}</bdi></em>{head[2]}</h3>
                    <p className="fx-pocket">{B.flowPocket(int.format(flow.sessions))}</p>
                    <div className="cmp-split" aria-hidden="true">
                      <i className="is-buy" style={{ flexBasis: `${(flow.buy / Math.max(1, flow.buy + flow.sell)) * 100}%` }} />
                      <i className="is-sell" style={{ flexBasis: `${(flow.sell / Math.max(1, flow.buy + flow.sell)) * 100}%` }} />
                    </div>
                    <div className="fx-pair">
                      <div><small>{C.buy}</small><b>{compact(flow.buy, u)}</b></div>
                      <div><small>{C.sell}</small><b>{compact(flow.sell, u)}</b></div>
                    </div>
                  </>
                )
              })()}
              <details className="fx-more"><summary aria-label={R.page.fx.facts.more}>+</summary><p>{B.flowMore}</p></details>
            </section>

            {perf.length ? (() => {
              const ytd = perf.find((r) => r.k === 'ytd') ?? perf[0]
              const head = B.idxHead(pctStr(ytd.co), (ytd.co ?? 0) >= (ytd.idx ?? 0))
              return (
                <section className="id-print is-calm fx-fact" aria-label={C.vsIndex}>
                  <svg className="fx-ill" viewBox="0 0 64 64" aria-hidden="true"><path d="M8 50l14-18 10 8 22-26" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M8 54l14-8 10 4 22-14" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="3 4" strokeLinecap="round"/></svg>
                  <h3 className={`fx-fact-head ${(ytd.co ?? 0) > 0 ? 'is-up' : (ytd.co ?? 0) < 0 ? 'is-down' : ''}`.trim()}>{head[0]}<em><bdi>{head[1]}</bdi></em>{head[2]}</h3>
                  <p className="fx-pocket">{B.idxPocket(pctStr(ytd.idx))}</p>
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
                  <details className="fx-more"><summary aria-label={R.page.fx.facts.more}>+</summary><p>{B.idxMore}</p></details>
                </section>
              )
            })() : null}

            {earnings.length ? (() => {
              const lastE = earnings[earnings.length - 1], prevE = earnings[earnings.length - 2]
              const head = B.profitHead(compact(lastE.ni, u), lastE.label)
              const top = Math.max(1, ...earnings.map((e) => Math.abs(e.ni ?? 0)))
              const up = prevE && lastE.ni != null && prevE.ni != null ? lastE.ni > prevE.ni : null
              return (
                <section className="id-print is-calm fx-fact" aria-label={initial.isBank ? C.incomeBank : C.incomeCorp}>
                  <svg className="fx-ill" viewBox="0 0 64 64" aria-hidden="true"><path d="M10 54V30M24 54V20M38 54V34M52 54V12" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round"/></svg>
                  <h3 className={`fx-fact-head ${(lastE.ni ?? 0) < 0 ? 'is-down' : ''}`.trim()}>{head[0]}<em><bdi>{head[1]}</bdi></em>{head[2]}</h3>
                  <p className="fx-pocket">{B.profitPocket(up)}</p>
                  <div className="fx-bars is-wide" aria-hidden="true">
                    {earnings.slice().reverse().map((e) => (
                      <div key={`${e.year}-${e.period}`}><span>{e.label}</span><i style={{ width: `${(Math.abs(e.ni ?? 0) / top) * 100}%` }} className={(e.ni ?? 0) < 0 ? 'is-neg' : e === lastE ? 'is-market' : ''} /><b>{compact(e.ni, u)}</b></div>
                    ))}
                  </div>
                  <p className="fx-fact-note">{C.netProfit} · {C.ratiosNote(String(ratios.year ?? '—'))}</p>
                  <details className="fx-more"><summary aria-label={R.page.fx.facts.more}>+</summary><p>{B.profitMore}</p></details>
                </section>
              )
            })() : null}

            {initial.ownership || initial.holders.length ? (() => {
              const i = initial.ownership?.iraqi_shares ?? 0, f = initial.ownership?.foreign_shares ?? 0
              const fp = i + f ? (f / (i + f)) * 100 : null
              const head = B.ownHead(fp == null ? '—' : `${fp.toFixed(2)}%`)
              return (
                <section className="id-print is-calm fx-fact" aria-label={C.majorShareholders}>
                  <svg className="fx-ill" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="22" fill="var(--fill)" stroke="currentColor" strokeWidth="2.5"/><path d="M32 10v22l16 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
                  <h3 className="fx-fact-head">{head[0]}<em><bdi>{head[1]}</bdi></em>{head[2]}</h3>
                  <p className="fx-pocket">{initial.ownership ? C.ownershipNote(String(initial.ownership.month), String(initial.ownership.year)) : B.ownPocket(initial.holders.length)}</p>
                  {fp != null ? (
                    <div className="cmp-split" aria-hidden="true">
                      <i className="is-buy" style={{ flexBasis: `${100 - fp}%` }} />
                      <i className="is-sell" style={{ flexBasis: `${fp}%` }} />
                    </div>
                  ) : null}
                  {initial.holders.length ? (
                    <ul className="fx-sizes">
                      {initial.holders.slice(0, 5).map((h, k) => (
                        <li key={`${h.name}-${k}`}><span><bdi>{h.name}</bdi></span><b><bdi>{h.pct == null ? '—' : `${h.pct.toFixed(2)}%`}</bdi></b><small /></li>
                      ))}
                    </ul>
                  ) : null}
                  <details className="fx-more"><summary aria-label={R.page.fx.facts.more}>+</summary><p>{B.ownMore}</p></details>
                </section>
              )
            })() : null}
          </div>

          <section className="cmp-profile id-read" aria-label={profile.heading}>
            <h2 className="id-h2">{profile.heading}</h2>
            <p className="id-body">{profile.about}</p>
            <dl className="cmp-profile-facts id-num">
              {profile.facts.map((f) => <div key={f.label}><dt>{f.label}</dt><dd><bdi>{f.value}</bdi></dd></div>)}
            </dl>
            <h3 className="id-h3">{P.faqTitle}</h3>
            {profile.faq.map((qa) => (
              <details key={qa.q} className="cmp-q"><summary>{qa.q}</summary><p className="id-body">{qa.a}</p></details>
            ))}
          </section>

          <AboutSection title={P.about.title} body={P.about.body} />
        </div>
      </main>
    </SiteShell>
  )
}
