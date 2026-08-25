'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { localeDateOrDash } from '@/lib/date'
import { useLocale } from '@/context/LocaleContext'
import type { Locale } from '@/lib/i18n/locale'
import Link from 'next/link'
import { FlowChart, bucketTitle, type FlowMode } from './FlowChart'
import {
  PERIODS, iqd, iqdFull, nf0, shortY, monthLabel,
  type PeriodId,
} from '@/lib/statistics'
import {
  foldSessions, flowWindow, flowTotals, flowBuckets, flowGrainFor,
  companyFlows, rankCompanies, sectorFlows, COMPANY_VIEWS, isNetView, viewValue,
  type FlowRow, type OracleRow, type FlowSession, type CompanyFlow, type CompanyView,
  type SectorFlow, type Roster,
} from '@/lib/foreignFlow'
import { fetchCompanyMeta, matchCompanyName, companyName, SECTORS } from '@/lib/market'
import type { CompanyMeta } from '@/types'
import '@/styles/foreign-flow.css'

/**
 * تدفق المستثمر الأجنبي — the deep foreign-capital surface.
 *
 * ── The three surfaces, and why this one is different ─────────────────────
 *   HOMEPAGE      one session, one number, one balance bar. A signal.
 *   الإحصائيات    the period's net flow in market context. An overview.
 *   THIS PAGE     where the capital went, how persistent it was, which
 *                 companies and sectors absorbed it, and — separately — what
 *                 foreigners actually OWN.
 *
 * Nothing here is an enlargement of the homepage card.
 *
 * ── The two separations the page is built on ──────────────────────────────
 * 1. SESSION vs PERIOD. The hero prints both, side by side, each under its own
 *    heading with its own dates. A one-session result and a multi-year
 *    cumulative result never share a number.
 * 2. FLOW vs OWNERSHIP. Trading and holding are different quantities from
 *    different tables on different cadences. Separate panels, and the
 *    ownership panel says so in words rather than trusting its heading.
 *
 * ── Where a line is allowed ───────────────────────────────────────────────
 * Net flow per bucket is discrete: bars, never joined. The cumulative balance
 * is continuous: a line, and the only line on the page.
 *
 * ── The loading strategy ──────────────────────────────────────────────────
 * `foreign_flow_company_daily` is 28,381 rows / 2.28 MB / 29 requests. The
 * page fetches the SELECTED window and extends backwards only when a longer
 * period is chosen; narrowing refetches nothing. See the data map §14.
 */

const OWN_MIN_SHARE = 0 // every company with any foreign holding is eligible

type Loaded = { from: string; rows: FlowRow[]; oracle: OracleRow[]; calendar: string[] }

type Ownership = {
  month: string
  iraqi: number
  foreign: number
  pct: number | null
  foreignHolders: number
  withForeign: number
  universe: number
  top: { name: string; pct: number }[]
}

const SECTOR_LABEL = new Map(SECTORS.filter((s) => s.id !== 'all').map((s) => [s.id, s.arFull]))

export function ForeignFlow() {
  const { t: T, locale, href: L } = useLocale()
  const ff = T.flow
  /* The reference opens on سنة, and it is the right default here too: a month
     of foreign flow on this exchange is often one outsized session and 21
     small ones, which reads as a single spike rather than a market. */
  const [period, setPeriod] = useState<PeriodId>('1Y')
  const [mode, setMode] = useState<FlowMode>('net')
  const [view, setView] = useState<CompanyView>('netIn')
  const [sector, setSector] = useState<string | null>(null)
  const [row, setRow] = useState<string | null>(null)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [meta, setMeta] = useState<CompanyMeta[]>([])
  const [ownRows, setOwnRows] = useState<{ month: string; rows: OwnRow[] } | null>(null)
  const [ownFailed, setOwnFailed] = useState(false)

  /* The theme is read, never owned — app/layout.tsx sets `data-theme` on
     <html> pre-paint and the header toggle owns it. The canvas cannot inherit
     a CSS variable, so it needs the value as a string. */
  useEffect(() => {
    const read = () =>
      setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light')
    read()
    const mo = new MutationObserver(read)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => mo.disconnect()
  }, [])

  // ── the window's data, fetched lazily and extended, never refetched ──────
  const load = useCallback(async (want: PeriodId) => {
    setLoading(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const sb = createClient()
      const n = PERIODS.find((p) => p.id === want)!.sessions

      /* The window calendar is the market's own trading sessions, so a gap in
         the flow table shows up as a gap instead of vanishing. */
      let cal: string[] = []
      if (Number.isFinite(n)) {
        const { data } = await sb.from('daily_index').select('date')
          .order('date', { ascending: false }).limit(n as number)
        cal = ((data as { date: string }[]) ?? []).map((r) => r.date).reverse()
      } else {
        cal = await pageAll<{ date: string }>(sb, 'daily_index', 'date').then((r) => r.map((x) => x.date))
      }
      if (!cal.length) { setFailed(true); setLoading(false); return }
      const from = cal[0]

      const [rows, oracle] = await Promise.all([
        pageAll<FlowRow>(sb, 'foreign_flow_company_daily', 'date,ticker,side,value,trades', from),
        pageAll<OracleRow>(sb, 'foreign_flow_daily', 'date,side,value,companies', from),
      ])
      if (!rows.length) { setFailed(true); setLoading(false); return }
      setFailed(false)
      setLoaded({ from, rows, oracle, calendar: cal })
    } catch {
      setFailed(true)
    }
    setLoading(false)
  }, [])

  useEffect(() => { void load('1Y') }, [load])

  /* Widening refetches; narrowing does not, because the wider window already
     holds every row the narrower one needs. */
  useEffect(() => {
    if (!loaded) return
    const n = PERIODS.find((p) => p.id === period)!.sessions
    const have = loaded.calendar.length
    if (!Number.isFinite(n) ? have >= 3000 : (n as number) <= have) return
    void load(period)
  }, [period, loaded, load])

  /* The curated roster is fetched ONCE and shared by the ranking, the sector
     rollup and the ownership name-matching. It used to be fetched by both the
     roster effect and the ownership effect. */
  useEffect(() => {
    ;(async () => {
      try { setMeta(await fetchCompanyMeta()) }
      catch { /* the ranking falls back to tickers */ }
    })()
  }, [])

  /* 20 of the 104 curated rows carry an empty `ar`; `companyName` falls back to
     the English name before it falls back to the ticker, which is what the
     market board and the screener already do. */
  const roster = useMemo<Roster>(
    () => new Map(meta.map((m) => [m.sym, { name: companyName(m, m.sym, locale), sec: m.sec, logo: m.logo }])),
    [meta, locale])

  // ── ownership · its own table, its own month, its own failure ────────────
  useEffect(() => {
    ;(async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const sb = createClient()
        const { data: latest } = await sb.from('ownership_monthly')
          .select('year,month').order('year', { ascending: false })
          .order('month', { ascending: false }).limit(1)
        const y = latest?.[0]?.year as number | undefined
        const m = latest?.[0]?.month as number | undefined
        if (!y || !m) { setOwnFailed(true); return }
        const { data } = await sb.from('ownership_monthly')
          .select('name_ar,iraqi_shares,foreign_shares,foreign_count')
          .eq('year', y).eq('month', m)
        const rows = (data as OwnRow[]) ?? []
        if (!rows.length) { setOwnFailed(true); return }
        setOwnRows({ month: `${y}-${String(m).padStart(2, '0')}`, rows })
      } catch { setOwnFailed(true) }
    })()
  }, [])

  // ── derived ──────────────────────────────────────────────────────────────
  const sessions = useMemo<FlowSession[]>(
    () => (loaded ? foldSessions(loaded.rows, loaded.calendar, loaded.oracle) : []),
    [loaded])

  /* Name-matching runs over the month's rows once, not on every render. */
  const own = useMemo<Ownership | null>(
    () => (ownRows ? summariseOwnership(ownRows.rows, ownRows.month, meta, locale) : null),
    [ownRows, meta, locale])

  const win = useMemo(() => flowWindow(sessions, period), [sessions, period])
  const t = useMemo(() => flowTotals(win), [win])
  const grain = flowGrainFor(period)
  const buckets = useMemo(() => flowBuckets(win, grain), [win, grain])

  const latest = useMemo(() => {
    for (let i = sessions.length - 1; i >= 0; i--) if (sessions[i].kind === 'observed') return sessions[i]
    return null
  }, [sessions])

  const companies = useMemo(
    () => (loaded && t ? companyFlows(loaded.rows, t.from, t.to, roster) : []),
    [loaded, t, roster])
  const ranked = useMemo(() => rankCompanies(companies, view), [companies, view])
  const sectors = useMemo(() => sectorFlows(companies, SECTOR_LABEL), [companies])
  const sectorMax = Math.max(...sectors.map((s) => s.buy + s.sell), 1)
  const top10 = ranked.slice(0, 10)
  const rowMax = Math.max(...top10.map((c) => Math.abs(viewValue(c, view))), 1)

  const periodLabel = PERIODS.find((p) => p.id === period)![locale]

  return (
    /* `iq-page` is how a route opts into the Phase 0 token layer — the
       `--mv-*` variables are scoped to it, exactly as /statistics and the
       homepage do it. Without it every panel here paints transparent. */
    <main className="iq-page ffw-page">
      <Link className="ffw-back" href="/statistics">
        <span className="dir-go" aria-hidden="true">›</span> {ff.breadcrumb}
      </Link>

      <header className="ffw-st-head ffw-head">
        <div className="ffw-st-title">
          <h1>{ff.title}</h1>
          <p>
            {ff.standfirst}
            {t ? <> · {ff.sessionsInPeriod(nf0.format(t.sessions))}</> : null}
            {latest ? <> · {ff.lastObserved(localeDateOrDash(latest.date, locale))}</> : null}
          </p>
        </div>
        <div className="ffw-st-period" role="group" aria-label={ff.periodGroup}>
          {PERIODS.map((p) => (
            <button key={p.id} type="button" className={period === p.id ? 'active' : ''}
              aria-pressed={period === p.id} onClick={() => setPeriod(p.id)}>{p[locale]}</button>
          ))}
        </div>
      </header>

      {failed ? (
        <div className="ffw-cd-nodata ffw-cd-nodata-wide">
          <strong>{ff.loadFailed}</strong>
          <p>
            {ff.failedNote}
            {ff.backTo} <Link href={L('/statistics')}>{ff.statistics}</Link>.
          </p>
        </div>
      ) : (
        <>
          {/* ── Hero · the session and the period, never mixed ──────────── */}
          <section className="ffw-hero" aria-label={ff.heroLabel}>
            <article className="ffw-hero-card">
              <span className="ffw-st-chip ffw-st-chip-session">{ff.lastSessionChip}</span>
              <span className="ffw-cd-cell-label">{latest ? localeDateOrDash(latest.date, locale) : '—'}</span>
              {loading || !latest ? <Skel h={104} /> : (
                <>
                  <strong className={cls(latest.net)}>
                    <bdi>{sign(latest.net)}{iqd(Math.abs(latest.net))}</bdi>
                    <em>{ff.iqd}</em>
                  </strong>
                  <p>{latest.net > 0 ? ff.netBuy : latest.net < 0 ? ff.netSell : ff.balanced}</p>
                  <Balance buy={latest.buy} sell={latest.sell} />
                  <dl className="ffw-hero-figs">
                    <div><dt>{ff.foreignTrades}</dt><dd><bdi>{nf0.format(latest.trades)}</bdi></dd></div>
                    <div><dt>{ff.companiesActive}</dt><dd><bdi>{latest.companies}</bdi></dd></div>
                  </dl>
                </>
              )}
            </article>

            <article className="ffw-hero-card is-period">
              <span className="ffw-st-chip ffw-st-chip-period">{ff.periodChip(periodLabel)}</span>
              <span className="ffw-cd-cell-label">
                {t ? <>{shortY(t.from, locale)} — {shortY(t.to, locale)}</> : '—'}
              </span>
              {loading || !t ? <Skel h={104} /> : (
                <>
                  <strong className={cls(t.net)}>
                    <bdi>{sign(t.net)}{iqd(Math.abs(t.net))}</bdi>
                    <em>{ff.iqd}</em>
                  </strong>
                  {/* Persistence, not a sentiment score: two counts and the
                      arithmetic that produced them. */}
                  <p>
                    {ff.cumulativeLine(
                      t.net >= 0 ? ff.buying : ff.selling,
                      nf0.format(t.counted), String(t.buySessions), String(t.sellSessions),
                      t.missing > 0 ? String(t.missing) : '',
                    )}
                  </p>
                  <Balance buy={t.buy} sell={t.sell} />
                  <dl className="ffw-hero-figs">
                    <div>
                      <dt>
                        {ff.buyContinuity}
                        <i className="ffw-fn-help" tabIndex={0} role="note"
                          data-help={ff.buySessionsHelpLong}
                          aria-label={ff.buySessionsHelp}>{locale === 'ar' ? '؟' : '?'}</i>
                      </dt>
                      <dd>
                        <bdi>{t.counted ? `${((t.buySessions / t.counted) * 100).toFixed(0)}%` : '—'}</bdi>
                        <small>{t.buySessions}/{t.counted}</small>
                      </dd>
                    </div>
                    <div>
                      <dt>
                        {ff.grossActivity}
                        <i className="ffw-fn-help" tabIndex={0} role="note"
                          data-help={ff.grossHelpLong}
                          aria-label={ff.grossHelp}>{locale === 'ar' ? '؟' : '?'}</i>
                      </dt>
                      <dd><bdi>{iqd(t.gross)}</bdi><small>{ff.iqd}</small></dd>
                    </div>
                  </dl>
                </>
              )}
            </article>
          </section>

          {/* ── Net flow / cumulative balance ───────────────────────────── */}
          <section className="ffw-cd-panel ffw-chart-panel">
            <div className="ffw-cd-panel-head">
              <h2>{mode === 'net' ? ff.netByPeriod : ff.cumulativeBalance}</h2>
              <span className="ffw-cd-panel-note">{ff.grain[grain]}</span>
              <div className="ffw-st-switch" role="group" aria-label={ff.viewGroup}>
                <button type="button" className={mode === 'net' ? 'active' : ''}
                  aria-pressed={mode === 'net'} onClick={() => setMode('net')}>{ff.netEach}</button>
                <button type="button" className={mode === 'cum' ? 'active' : ''}
                  aria-pressed={mode === 'cum'} onClick={() => setMode('cum')}>{ff.cumulative}</button>
              </div>
            </div>
            {loading || !t ? <Skel h={236} /> : (
              <>
                <FlowChart key={`${period}-${mode}`} buckets={buckets} mode={mode}
                  grain={grain} theme={theme} height={236} />
                <p className="ffw-st-foot">
                  {mode === 'net'
                    ? ff.netNote
                    : ff.cumNote}
                  {ff.sourceLine(shortY(t.from, locale), shortY(t.to, locale))}
                </p>
              </>
            )}
          </section>

          <div className="ffw-st-grid-2 ffw-grid">
            {/* ── Company activity ───────────────────────────────────── */}
            <section className="ffw-cd-panel ffw-companies">
              <div className="ffw-cd-panel-head">
                <h2>{ff.companyActivity}</h2>
                <span className="ffw-st-chip ffw-st-chip-period">{ff.periodOnly}</span>
                <div className="ffw-st-switch" role="group" aria-label={ff.rankGroup}>
                  {COMPANY_VIEWS.map((v) => (
                    <button key={v.id} type="button" className={view === v.id ? 'active' : ''}
                      aria-pressed={view === v.id} onClick={() => setView(v.id)}>{ff.rank[v.id]}</button>
                  ))}
                </div>
              </div>
              {loading ? <Skel h={300} /> : !ranked.length ? (
                <div className="ffw-cd-nodata">
                  <strong>{ff.noCompanies}</strong>
                  <p>{ff.noCompaniesNote}</p>
                </div>
              ) : (
                <>
                  <div className="ffw-pl-readout" aria-live="polite">
                    {row ? <CompanyRead c={ranked.find((x) => x.ticker === row)} />
                      : <span className="ffw-pl-readout-hint">{ff.companyHint}</span>}
                  </div>
                  <ul className="ffw-rows">
                    {top10.map((c, i) => (
                      <CompanyRow key={c.ticker} c={c} i={i} view={view} max={rowMax}
                        on={row === c.ticker}
                        onEnter={() => setRow(c.ticker)} onLeave={() => setRow(null)} />
                    ))}
                  </ul>
                  <p className="ffw-st-foot">
                    {ff.companyFoot(String(ranked.length), String(companies.length))}
                  </p>
                </>
              )}
            </section>

            {/* ── Sector allocation ──────────────────────────────────── */}
            <section className={`ffw-cd-panel ffw-sectors-panel ${sector ? 'has-sel' : ''}`}>
              <div className="ffw-cd-panel-head">
                <h2>{ff.capitalSpread}</h2>
                <span className="ffw-st-chip ffw-st-chip-period">{ff.periodOnly}</span>
                <span className="ffw-cd-panel-note">{ff.bySector}</span>
              </div>
              {loading ? <Skel h={300} /> : !sectors.length ? (
                <div className="ffw-cd-nodata">
                  <strong>{ff.noSectorActivity}</strong>
                  <p>{ff.noSectorNote}</p>
                </div>
              ) : (
                <>
                  <div className="ffw-pl-readout" aria-live="polite">
                    {sector ? <SectorRead s={sectors.find((x) => x.id === sector)} />
                      : <span className="ffw-pl-readout-hint">{ff.sectorHint}</span>}
                  </div>
                  <ul className="ffw-sectors">
                    {sectors.map((s) => (
                      <SectorRow key={s.id} s={s} max={sectorMax} on={sector === s.id}
                        onEnter={() => setSector(s.id)} onLeave={() => setSector(null)} />
                    ))}
                  </ul>
                  <p className="ffw-st-foot">
                    {ff.sectorFoot}
                  </p>
                </>
              )}
            </section>
          </div>

          {/* ── OWNERSHIP · a different quantity ────────────────────────── */}
          <section className="ffw-cd-panel ffw-own-panel">
            <div className="ffw-cd-panel-head">
              <h2>{ff.ownership}</h2>
              {own ? <span className="ffw-st-chip ffw-st-chip-snap">{ff.monthlySnapshot(monthLabel(own.month, locale))}</span> : null}
              <Link className="ffw-st-link" href={L('/statistics/ownership')}>{ff.fullOwnership} <i className="dir-go" aria-hidden="true">←</i></Link>
              <Link className="ffw-st-link" href={L('/statistics/shareholders')}>{ff.majorShareholders} <i className="dir-go" aria-hidden="true">←</i></Link>
            </div>
            {ownFailed ? (
              <div className="ffw-mv-error" role="alert">
                <span className="ffw-mv-error-mark" aria-hidden="true">!</span>
                <div>
                  <strong>{ff.ownershipFailed}</strong>
                  <p>{ff.ownershipFailedNote}</p>
                </div>
              </div>
            ) : !own ? <Skel h={200} /> : (
              <>
                {/* The sentence that keeps the page honest. */}
                <p className="ffw-own-note">
                  {ff.ownershipNote}
                </p>
                <div className="ffw-own">
                  <div className="ffw-own-lead">
                    <span className="ffw-cd-cell-label">{ff.foreignShare}</span>
                    <strong><bdi>{own.pct == null ? '—' : `${own.pct.toFixed(1)}%`}</bdi></strong>
                    <div className="ffw-own-track" role="img"
                      aria-label={own.pct == null ? ff.shareUnavailable : ff.sharePct(own.pct.toFixed(1))}>
                      <i style={{ inlineSize: `${own.pct ?? 0}%` }} />
                    </div>
                    <p>
                      {ff.sharesSplit(iqd(own.foreign), iqd(own.iraqi))}
                    </p>
                  </div>
                  <dl className="ffw-own-figs">
                    <div>
                      <dt>{ff.companiesWithForeign}</dt>
                      <dd><bdi>{own.withForeign}</bdi><small>{ff.ofInReport(String(own.universe))}</small></dd>
                    </div>
                    <div>
                      <dt>{ff.foreignHolders}</dt>
                      <dd><bdi>{nf0.format(own.foreignHolders)}</bdi></dd>
                    </div>
                    <div>
                      <dt>{ff.highestForeign}</dt>
                      <dd>
                        <bdi>{own.top.length ? `${own.top[0].pct.toFixed(1)}%` : '—'}</bdi>
                        <small>{own.top[0]?.name ?? ''}</small>
                      </dd>
                    </div>
                  </dl>
                </div>
                <ul className="ffw-own-rows">
                  {own.top.map((c) => (
                    <li key={c.name}>
                      <span className="ffw-own-row">
                        <span className="ffw-own-name" title={c.name}>{c.name}</span>
                        <span className="ffw-own-bar" aria-hidden="true">
                          <i style={{ inlineSize: `${(c.pct / (own.top[0].pct || 1)) * 100}%` }} />
                        </span>
                        <bdi className="ffw-own-pct">{c.pct.toFixed(1)}%</bdi>
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="ffw-st-foot">
                  {ff.ownershipSource(monthLabel(own.month, locale))}
                </p>
              </>
            )}
          </section>
        </>
      )}
    </main>
  )
}

/* ── Bits ─────────────────────────────────────────────────────────────────── */

/** Buy / sell proportional bar. Green buy, red sell, exact values, the
 *  percentage relationship, and the net stated separately.
 *
 *  The two segments are hit targets as well as a picture, and their PAINTED
 *  width is a real quantity — on 2026-08-20 foreign buying was 0.1% of the
 *  session, so the buy segment is 1px wide. Widening the paint would be a lie
 *  about the proportion, and giving both a 44px target would overlap them.
 *  So the paint stays proportional and the two invisible targets are tiled
 *  across the measured track: whichever side is under 44px is clamped up to
 *  44, and the other yields exactly that much. They abut, never overlap. */
function Balance({ buy, sell }: { buy: number; sell: number }) {
  const { t: T, locale } = useLocale()
  const ff = T.flow
  const total = buy + sell
  const [on, setOn] = useState<'buy' | 'sell' | null>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const [trackW, setTrackW] = useState(0)

  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    const read = () => setTrackW(el.clientWidth)
    read()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(read) : null
    ro?.observe(el)
    return () => ro?.disconnect()
  }, [])
  if (!total) {
    return (
      <div className="ffw-balance">
        <div className="ffw-balance-labels">
          <span className="sell"><small>{ff.selling}</small><strong><bdi>0</bdi></strong></span>
          <span className="buy"><small>{ff.buying}</small><strong><bdi>0</bdi></strong></span>
        </div>
        <div className="ffw-balance-track" />
        <p>{ff.measuredZero}</p>
      </div>
    )
  }
  const bs = (buy / total) * 100, ss = (sell / total) * 100
  const [sellTarget, buyTarget] = tileTargets(trackW, ss, bs)
  return (
    <div className={`ffw-balance${on ? ` is-${on}` : ''}`}>
      <div className="ffw-balance-labels">
        <span className="sell"><small>{ff.selling}</small><strong><bdi>{iqd(sell)}</bdi></strong></span>
        <span className="buy"><small>{ff.buying}</small><strong><bdi>{iqd(buy)}</bdi></strong></span>
      </div>
      <div className="ffw-balance-track" ref={trackRef}>
        <button type="button" className="sell"
          style={{ inlineSize: `${ss}%`, ['--ffw-target' as string]: sellTarget }}
          aria-label={ff.sellBar(iqdFull(sell), ss.toFixed(1))}
          onPointerEnter={() => setOn('sell')} onPointerLeave={() => setOn(null)}
          onFocus={() => setOn('sell')} onBlur={() => setOn(null)} />
        <button type="button" className="buy"
          style={{ inlineSize: `${bs}%`, ['--ffw-target' as string]: buyTarget }}
          aria-label={ff.buyBar(iqdFull(buy), bs.toFixed(1))}
          onPointerEnter={() => setOn('buy')} onPointerLeave={() => setOn(null)}
          onFocus={() => setOn('buy')} onBlur={() => setOn(null)} />
      </div>
      <p aria-live="polite">
        {on === 'buy' ? <>{ff.buyOf(iqdFull(buy), `${bs.toFixed(1)}%`)}</>
          : on === 'sell' ? <>{ff.sellOf(iqdFull(sell), `${ss.toFixed(1)}%`)}</>
            : <>{ff.bothOf(`${bs.toFixed(1)}%`, `${ss.toFixed(1)}%`)}</>}
      </p>
    </div>
  )
}

function CompanyRead({ c }: { c?: CompanyFlow }) {
  const { t: T, locale } = useLocale()
  const ff = T.flow
  if (!c) return <span className="ffw-pl-readout-hint">—</span>
  return (
    <>
      <span className="ffw-pl-readout-name">{c.name}</span>
      <bdi className="ffw-cd-ticker">{c.ticker}</bdi>
      <span className="ffw-pl-read"><em>{ff.buying}</em><bdi className="positive">{iqdFull(c.buy)}</bdi></span>
      <span className="ffw-pl-read"><em>{ff.selling}</em><bdi className="negative">{iqdFull(c.sell)}</bdi></span>
      <span className="ffw-pl-read"><em>{ff.net}</em>
        <bdi className={cls(c.net)}>{sign(c.net)}{iqdFull(Math.abs(c.net))}</bdi>
      </span>
      <span className="ffw-pl-read"><em>{ff.ofForeignActivity}</em><bdi>{(c.share * 100).toFixed(1)}%</bdi></span>
      <span className="ffw-pl-read"><em>{ff.trades}</em><bdi>{nf0.format(c.trades)}</bdi></span>
    </>
  )
}

function SectorRead({ s }: { s?: SectorFlow }) {
  const { t: T, locale } = useLocale()
  const ff = T.flow
  if (!s) return <span className="ffw-pl-readout-hint">—</span>
  return (
    <>
      <span className="ffw-pl-readout-name">{s.label}</span>
      <span className="ffw-pl-read"><em>{ff.buying}</em><bdi className="positive">{iqdFull(s.buy)}</bdi></span>
      <span className="ffw-pl-read"><em>{ff.selling}</em><bdi className="negative">{iqdFull(s.sell)}</bdi></span>
      <span className="ffw-pl-read"><em>{ff.net}</em>
        <bdi className={cls(s.net)}>{sign(s.net)}{iqd(Math.abs(s.net))}</bdi>
      </span>
      <span className="ffw-pl-read"><em>{ff.ofActivity}</em><bdi>{(s.share * 100).toFixed(1)}%</bdi></span>
      <span className="ffw-pl-read"><em>{ff.companies}</em><bdi>{s.companies}</bdi></span>
    </>
  )
}

function CompanyRow({ c, i, view, max, on, onEnter, onLeave }: {
  c: CompanyFlow; i: number; view: CompanyView; max: number
  on: boolean; onEnter: () => void; onLeave: () => void
}) {
  const { t: T, locale } = useLocale()
  const ff = T.flow
  const v = viewValue(c, view)
  const pct = Math.min(100, (Math.abs(v) / max) * 100)
  const signed = isNetView(view)
  return (
    <li className={on ? 'is-on' : ''} onPointerEnter={onEnter} onPointerLeave={onLeave}>
      <Link href={`/c/${c.ticker}`} onFocus={onEnter} onBlur={onLeave}
        aria-label={ff.companyRowLabel(c.name, iqdFull(c.buy), iqdFull(c.sell), iqdFull(c.net))}>
        <span className="ffw-rank"><bdi>{i + 1}</bdi></span>
        <span className="ffw-name">
          <strong title={c.name}>{c.name}</strong>
          <bdi className="ffw-cd-ticker">{c.ticker}</bdi>
        </span>
        {signed ? (
          /* A signed bar needs a centre, not a start edge: net buying grows one
             way from the zero rail and net selling the other. */
          <span className="ffw-bar-signed" aria-hidden="true">
            <span className="ffw-bar-half down">{v < 0 ? <i style={{ inlineSize: `${pct}%` }} /> : null}</span>
            <span className="ffw-bar-rail" />
            <span className="ffw-bar-half up">{v > 0 ? <i style={{ inlineSize: `${pct}%` }} /> : null}</span>
          </span>
        ) : (
          <span className={`ffw-bar ${view}`} aria-hidden="true">
            <i style={{ inlineSize: `${pct}%` }} />
          </span>
        )}
        <bdi className={`ffw-val ${signed ? cls(v) : view === 'buy' ? 'positive' : 'negative'}`}>
          {signed ? sign(v) : ''}{iqd(Math.abs(v))}
        </bdi>
        <span className="ffw-go" aria-hidden="true">‹</span>
      </Link>
    </li>
  )
}

function SectorRow({ s, max, on, onEnter, onLeave }: {
  s: SectorFlow; max: number; on: boolean; onEnter: () => void; onLeave: () => void
}) {
  const { t: T, locale } = useLocale()
  const ff = T.flow
  const gross = s.buy + s.sell
  return (
    <li className={on ? 'is-on' : ''} onPointerEnter={onEnter} onPointerLeave={onLeave}>
      <button type="button" onFocus={onEnter} onBlur={onLeave}
        aria-label={ff.sectorRowLabel(s.label, iqdFull(gross), iqdFull(s.net))}>
        <span className="ffw-sec-name">{s.label}</span>
        {/* Gross activity split into its buy and sell parts — the shape of the
            bar shows whether a sector was accumulated or churned. */}
        <span className="ffw-sec-track" aria-hidden="true">
          <i className="buy" style={{ inlineSize: `${(s.buy / max) * 100}%` }} />
          <i className="sell" style={{ inlineSize: `${(s.sell / max) * 100}%` }} />
        </span>
        <bdi className={`ffw-sec-net ${cls(s.net)}`}>{sign(s.net)}{iqd(Math.abs(s.net))}</bdi>
        <bdi className="ffw-sec-share">{pctLabel(s.share)}</bdi>
      </button>
    </li>
  )
}

/**
 * Two abutting hit targets across a track of `w` px, given the two shares.
 *
 * Returns CSS lengths. Before the track has been measured, and on a track too
 * narrow to hold two 44px targets, both fall back to their painted share —
 * there is no honest way to give both 44px inside 80px, and inventing one
 * would put two controls on top of each other.
 */
function tileTargets(w: number, sellPct: number, buyPct: number): [string, string] {
  if (w < 88) return [`${sellPct}%`, `${buyPct}%`]
  let s = (w * sellPct) / 100
  let b = w - s
  if (s < 44) { s = 44; b = w - 44 }
  else if (b < 44) { b = 44; s = w - 44 }
  return [`${s.toFixed(2)}px`, `${b.toFixed(2)}px`]
}

const Skel = ({ h }: { h: number }) =>
  <span className="ffw-pl-skel" style={{ inlineSize: '100%', blockSize: `${h}px`, borderRadius: '12px' }} aria-hidden="true" />

/* `0` is a measured balance, so it takes neither a sign nor a colour. */
const sign = (v: number) => (v > 0 ? '+' : v < 0 ? '−' : '')
const cls = (v: number) => (v > 0 ? 'positive' : v < 0 ? 'negative' : '')

/* A share that rounds to zero but is not zero must not print «0%» — that is
   the same defect as printing 0 for an unknown, one step down. */
function pctLabel(share: number): string {
  const p = share * 100
  if (p === 0) return '0%'
  if (p < 0.5) return '<1%'
  return `${p.toFixed(0)}%`
}

/* ── Fetching ─────────────────────────────────────────────────────────────── */

type Sb = Awaited<ReturnType<typeof import('@/lib/supabase/client')['createClient']>>

/** PostgREST caps a response at 1,000 rows; walk the range until it is short. */
async function pageAll<T>(sb: Sb, table: string, select: string, from?: string): Promise<T[]> {
  const out: T[] = []
  for (let off = 0; off < 40_000; off += 1000) {
    let q = sb.from(table).select(select).order('date', { ascending: true }).range(off, off + 999)
    if (from) q = q.gte('date', from)
    const { data, error } = await q
    if (error) throw error
    const rows = (data ?? []) as unknown as T[]
    out.push(...rows)
    if (rows.length < 1000) break
  }
  return out
}

/* ── Ownership ────────────────────────────────────────────────────────────── */

type OwnRow = {
  name_ar: string
  iraqi_shares: number | null
  foreign_shares: number | null
  foreign_count: number | null
}

function summariseOwnership(rows: OwnRow[], month: string, meta: CompanyMeta[], locale: Locale): Ownership {
  let iraqi = 0, foreign = 0, holders = 0, withForeign = 0
  const top: { name: string; pct: number }[] = []
  for (const r of rows) {
    const i = r.iraqi_shares ?? 0
    const f = r.foreign_shares ?? 0
    iraqi += i; foreign += f
    holders += r.foreign_count ?? 0
    if (f > OWN_MIN_SHARE && i + f > 0) {
      withForeign++
      top.push({
        // The parse mangles Arabic; recover the curated spelling where one
        // clearly matches, exactly as /statistics/ownership already does.
        name: meta.length ? matchCompanyName(r.name_ar, meta, 0.9, locale) : r.name_ar,
        pct: (f / (i + f)) * 100,
      })
    }
  }
  const total = iraqi + foreign
  top.sort((a, b) => b.pct - a.pct)
  return {
    month, iraqi, foreign,
    pct: total > 0 ? (foreign / total) * 100 : null,
    foreignHolders: holders, withForeign, universe: rows.length,
    top: top.slice(0, 5),
  }
}
