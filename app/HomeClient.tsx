'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import Link from 'next/link'
import { fetchLive, fetchCompanyMeta, mergeCompanies, liveMcap, lastTradeNote } from '@/lib/market'
import { fetchSparklines } from '@/lib/sparks'
import IndexChart from '@/components/design/IndexChart'
import { Sparkline } from '@/components/design/Sparkline'
import { CompanyLogo } from '@/components/CompanyLogo'
import { useOverlay } from '@/components/system/Overlay'
import { useApp } from '@/context/AppContext'
import { Skeleton, ModuleError, Freshness, Unavailable } from '@/components/system/DataStates'
import {
  computeBreadth, computeFlow, computeSectors, sessionFreshness, arSession, signed,
  type Breadth, type Flow, type IndexRow, type SectorMove,
} from '@/lib/homeData'
import { HeroCard, BreadthCard, ActivityCard, FlowCard, SectorsCard } from './HomeModules'
import type { Company } from '@/types'

const nf = new Intl.NumberFormat('en-US')
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 })
const price = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

type SortKey = 'price' | 'change' | 'volume' | 'value' | 'mcap'
type MoverTab = 'mcap' | 'gainers' | 'losers' | 'active'

/**
 * The market-cap caveat. The universe is the curated roster and the figure is a
 * snapshot, so neither is an officially proven ISX ranking. The wording matches
 * what `/market` and `/companies` already say about the same number.
 */
const MCAP_CAVEAT =
  'القيمة السوقية = آخر سعر تداول × الأسهم المصدرة، بالقيمة نفسها المعروضة في صفحتي السوق والشركات · '
  + 'لقطة على سجل الشركات لا ترتيب رسمي معتمد. الشركات التي لا يتوفر لها سعر أو عدد أسهم مستبعدة، ولا تُحتسب صفراً.'

/**
 * The homepage.
 *
 * ══ WHAT THIS IS ══════════════════════════════════════════════════════════
 * A VISUAL RE-PORT of the approved reference homepage
 * (`/Users/amed/iqwealth-design/app/page.tsx` + its `.home-v2-*` CSS), wrapped
 * around the real data layer that commits `8f53ad9` and `b61f96a` established.
 *
 * The composition is the reference's 12-column one: an 8-column ISX60 hero and
 * a 4-column navy foreign-flow card sharing a 520px row, then breadth (3),
 * activity (4) and sectors (5) sharing the row beneath, then the dense
 * 25-row board. Nothing here is «span 2» four times.
 *
 * ══ DATA ══════════════════════════════════════════════════════════════════
 * Every module is fed from `lib/homeData.ts` against ONE resolved session, and
 * every figure traces to `docs/HOMEPAGE_DATA_MAP.md`. Nothing here invents a
 * metric, and nothing labels a window it cannot name.
 *
 * ══ PARTIAL FAILURE ═══════════════════════════════════════════════════════
 * The page has three independent sources. A module whose source failed shows
 * its own error and the rest of the page carries on — escalating one failed
 * panel to a full-route error throws away everything that DID load, which is
 * the most common way an error state makes things worse than the error.
 */
export default function HomeClient() {
  const { profile } = useApp()

  const [companies, setCompanies] = useState<Company[]>([])
  const [series, setSeries] = useState<IndexRow[]>([])
  const [flowRows, setFlowRows] = useState<{ date: string; side: string; value: number | null }[]>([])
  const [sparks, setSparks] = useState<Record<string, number[]>>({})

  const [pricesLoading, setPricesLoading] = useState(true)
  const [pricesFailed, setPricesFailed] = useState(false)
  const [indexFailed, setIndexFailed] = useState(false)
  const [flowFailed, setFlowFailed] = useState(false)

  /* Seeded to match the default tab. Left at 'value' the board opened on
     «القيمة السوقية» while still ordered by traded value — the same
     mismatch `pickTab` exists to prevent, just on first paint. */
  const [sortKey, setSortKey] = useState<SortKey>('mcap')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [moverTab, setMoverTab] = useState<MoverTab>('mcap')
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState(false)

  // ── prices + company meta ──────────────────────────────────────────────
  const loadPrices = useCallback(() => {
    setPricesFailed(false)
    setPricesLoading(true)
    Promise.all([fetchLive(), fetchCompanyMeta()])
      .then(([live, meta]) => setCompanies(mergeCompanies(meta, live.stocks)))
      .catch(() => setPricesFailed(true))
      .finally(() => setPricesLoading(false))
  }, [])

  useEffect(() => { loadPrices() }, [loadPrices])

  // ── index series + foreign flow + sparklines ───────────────────────────
  useEffect(() => {
    ;(async () => {
      const { createClient } = await import('@/lib/supabase/client')
      const sb = createClient()
      const since = new Date(Date.now() - 400 * 86400_000).toISOString().slice(0, 10)

      // Independent, so one failing does not take the other.
      await Promise.allSettled([
        sb.from('daily_index')
          .select('date,isx60,total_value,total_volume,total_trades,traded_companies,listed_companies')
          .not('isx60', 'is', null).gte('date', since).order('date')
          .then(({ data, error }) => {
            if (error || !data?.length) { setIndexFailed(true); return }
            setSeries(data as IndexRow[])
          }),
        sb.from('foreign_flow_company_daily')
          .select('date,side,value').order('date', { ascending: false }).limit(400)
          .then(({ data, error }) => {
            if (error) { setFlowFailed(true); return }
            setFlowRows(data ?? [])
          }),
      ])

      try { setSparks(await fetchSparklines()) } catch { /* the 7D column degrades to nothing */ }
    })()
  }, [])

  // ── derived ────────────────────────────────────────────────────────────
  const latest = series.length ? series[series.length - 1] : null

  /** The one canonical session every module is labelled with. */
  const session = latest?.date ?? null
  const fresh = sessionFreshness(session)

  const traded = useMemo(() => companies.filter((c) => c.close > 0 && !c.stale), [companies])
  const breadth = useMemo<Breadth | null>(
    () => (traded.length ? computeBreadth(traded, latest) : null), [traded, latest])
  const sectors = useMemo<SectorMove[]>(() => computeSectors(traded), [traded])

  /* Foreign flow uses ITS OWN latest date, and the page states when that
     differs from the index session rather than pretending they match. */
  const flowSession = flowRows.length ? flowRows[0].date : null
  const flow = useMemo<Flow | null>(
    () => (flowSession ? computeFlow(flowRows, flowSession) : null), [flowRows, flowSession])
  const flowBehind = Boolean(session && flowSession && flowSession !== session)

  /* ── the board ───────────────────────────────────────────────────────────
     The reference's own model: a free-text filter, a sortable header, and a
     mover tab that re-ranks the 25 rows. `vol` is traded VALUE in IQD despite
     its name; `shares_traded` is the share count. */
  const sortable: Record<SortKey, (c: Company) => number> = {
    price: (c) => c.close,
    change: (c) => c.pct,
    volume: (c) => c.shares_traded ?? 0,
    value: (c) => c.vol ?? 0,
    /* Calls the import directly, not `capOf`: this object is built on every
       render and `capOf` is declared further down, so referencing it here threw
       «Cannot access 'capOf' before initialization» and took the whole page
       with it.

       Unavailable is not zero — but it still has to sort somewhere, and the
       comparator below pushes it past every real value in either direction, so
       a company with no cap never lands between two that have one. */
    mcap: (c) => { const v = liveMcap(c); return v > 0 ? v : Number.NEGATIVE_INFINITY },
  }

  /**
   * The board.
   *
   * The tab used to drive only the three mover chips while the table kept its
   * own pool and its own sort — so «القيمة السوقية» showed a table ordered by
   * TRADED VALUE with a column of traded values under it. Selecting a
   * market-cap view and reading BGUC's 274.1M session turnover as its market
   * capitalisation is the bug that produced.
   *
   * The tab now decides both, and the two universes stay distinct:
   *
   *   القيمة السوقية   the ROSTER, ranked by `liveMcap`. Market cap is a
   *                    property of the company, not of the session, so a name
   *                    that did not trade today still belongs in it.
   *   every other tab  the session's traded companies, ranked by the column
   *                    the reader picked, exactly as before.
   *
   * The other tabs kept their pool for the reason they always had: filtering
   * the table by «الرابحون» on a session with 11 advancers rendered an 11-row
   * board. Market cap does not have that problem — the roster is always full.
   */
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const base = moverTab === 'mcap' ? companies : traded
    const pool = base.filter((c) => !q || c.ar.includes(query.trim()) || c.sym.toLowerCase().includes(q))
    const get = sortable[sortKey]
    const dir = sortDir === 'asc' ? 1 : -1
    return [...pool].sort((a, b) => {
      const av = get(a), bv = get(b)
      /* A company with no value for the chosen measure sorts LAST whichever
         way the column is pointing. Interleaving it at zero would rank an
         unknown against real numbers. */
      const aNa = !Number.isFinite(av), bNa = !Number.isFinite(bv)
      if (aNa !== bNa) return aNa ? 1 : -1
      if (aNa && bNa) return 0
      return dir * (av - bv)
    }).slice(0, 25)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companies, traded, moverTab, query, sortKey, sortDir])

  /**
   * The four modes, and what each one actually ranks.
   *
   *   القيمة السوقية  market cap descending, from `liveMcap` — the same helper
   *                   `/market`, `/companies` and `/analysis` use, so the four
   *                   surfaces cannot disagree about one company. Over the
   *                   whole roster, not just today's tape. A company with
   *                   nothing to compute from prints `—` and sorts last,
   *                   never 0.
   *   الرابحون/الخاسرون  comparable companies only. A company with no valid
   *                   prior close has an unknown change, and ranking it at 0%
   *                   asserts something the data does not say.
   *   الأكثر نشاطاً    TRADED VALUE descending — the same measure the board's
   *                   own default sort uses (`c.vol`, which is value in IQD
   *                   despite its name). Not volume: the two disagree, and
   *                   switching between them silently is how a list stops
   *                   meaning one thing.
   */
  /**
   * Market cap — `liveMcap` from lib/market.ts, the SAME helper `/market`,
   * `/companies` and `/analysis` call, over the same `Company` objects
   * `mergeCompanies` builds. No second formula and no second data source: this
   * page reads whatever those three read, so one company cannot carry two
   * market caps in one product.
   *
   * `fetchLive` already carries a non-trading company forward from the
   * `latest_trade` view, so `c.close` is its last ACTUAL traded price with
   * `c.stale` set — which is why the largest names still have a cap on a day
   * they did not trade, and why no extra query is needed to find one.
   *
   * `liveMcap` returns 0, not null, when there is nothing to compute from.
   * `<= 0` is the unavailable test the two trusted tables already use.
   */
  const capOf = useCallback((c: Company): number | null => {
    const v = liveMcap(c)
    return v > 0 ? v : null
  }, [])

  /** What a ranked row is standing on: today's close, or the last real trade. */
  const capNote = useCallback((c: Company): string | undefined => {
    if (!(liveMcap(c) > 0)) return undefined
    return c.stale ? `${c.ar} · ${lastTradeNote(c, true)}` : undefined
  }, [])

  const movers = useMemo(() => {
    if (moverTab === 'mcap') {
      /* The CURRENT ROSTER, not today's tape — market cap is a property of the
         company, not of the session, and the largest name on the exchange must
         not vanish from a market-cap ranking on a day it happens not to trade.
         A company with nothing to compute from is dropped, never ranked as
         zero. */
      const withCap = companies
        .map((c) => ({ c, cap: capOf(c) }))
        .filter((x): x is { c: Company; cap: number } => x.cap != null)
      return withCap.sort((a, b) => b.cap - a.cap).slice(0, 3).map((x) => x.c)
    }
    const pool = traded.filter((c) => !c.noPrior)
    if (moverTab === 'gainers') return [...pool].sort((a, b) => b.pct - a.pct).slice(0, 3)
    if (moverTab === 'losers') return [...pool].sort((a, b) => a.pct - b.pct).slice(0, 3)
    return [...traded].sort((a, b) => (b.vol ?? 0) - (a.vol ?? 0)).slice(0, 3)
  }, [companies, traded, moverTab, capOf])

  function sortBy(key: SortKey) {
    if (key === sortKey) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  /** The tab owns the table's default measure; the header can still re-sort. */
  function pickTab(k: MoverTab) {
    setMoverTab(k)
    setSortKey(k === 'mcap' ? 'mcap' : 'value')
    setSortDir('desc')
  }

  /* The value column is not one column with two meanings. It is market cap in
     market-cap mode and traded value everywhere else, and it says which. */
  const capMode = moverTab === 'mcap'
  const valueCol = capMode
    ? { key: 'mcap' as SortKey, label: 'القيمة السوقية' }
    : { key: 'value' as SortKey, label: 'قيمة التداول' }

  const closeExpanded = useCallback(() => setExpanded(false), [])
  const expandedRef = useOverlay(expanded, closeExpanded)

  /* ── the greeting ────────────────────────────────────────────────────────
     The reference's intro is «مساء الخير، أحمد» over «نظرة السوق · ٢٤ تموز
     ٢٠٢٦» — a personalised salutation. Production serves mostly signed-out
     visitors and there is no name to greet them with, so this is the one place
     a literal port is impossible. Option 1 of the visual diff's §6: the
     reference's two-line structure and typography are kept verbatim, the real
     greeting appears once a session exists, and a market-context line stands in
     its place when it does not. */
  const [hour, setHour] = useState<number | null>(null)
  useEffect(() => { setHour(new Date().getHours()) }, [])
  const salutation = hour == null ? null : hour < 12 ? 'صباح الخير' : 'مساء الخير'
  const name = profile?.username?.trim() || null

  return (
    <main className="iq-page hm">
      <div className="hm-intro">
        <div>
          <span>نظرة السوق{session ? ` · ${arSession(session)}` : ''}</span>
          <h1>{name && salutation ? `${salutation}، ${name}` : 'نظرة على السوق'}</h1>
        </div>
        {/* No `stamp`. It is `<bdi>`-isolated inside the chip, which reorders
            «16 أغسطس 2026» to «أغسطس 16 2026» — and the intro line above
            already carries the same date, unisolated and correct. */}
        {session ? <Freshness tone={fresh.tone} label={fresh.label} /> : null}
      </div>

      {/* ── the 12-column composition ───────────────────────────────────────
          Four of the six modules have DIFFERENT widths, because the reference
          gives them different widths. 8/4 on the hero row, 3/4/5 beneath. */}
      <section className="hm-comp" aria-label="ملخص السوق العراقي">
        {indexFailed ? (
          <article className="hm-hero hm-hero-failed"><ModuleError what="مؤشر ISX60" /></article>
        ) : !latest ? (
          <article className="hm-hero hm-hero-failed"><Skeleton shape="chart" rows={1} /></article>
        ) : (
          <HeroCard rows={series} session={session} onExpand={() => setExpanded(true)} />
        )}

        {flowFailed ? (
          <article className="hm-flow hm-flow-failed"><ModuleError what="تدفق المستثمر الأجنبي" /></article>
        ) : (
          <FlowCard flow={flow} behind={flowBehind} />
        )}

        {pricesFailed ? (
          <article className="hm-breadth hm-mod-failed"><ModuleError what="اتساع السوق" onRetry={loadPrices} /></article>
        ) : pricesLoading ? (
          <article className="hm-breadth hm-mod-failed"><Skeleton shape="rows" rows={4} /></article>
        ) : (
          <BreadthCard b={breadth} />
        )}

        {indexFailed ? (
          <section className="hm-activity hm-mod-failed"><ModuleError what="نشاط السوق" /></section>
        ) : (
          <ActivityCard rows={series} />
        )}

        {pricesFailed ? (
          <section className="hm-sectors hm-mod-failed"><ModuleError what="أداء القطاعات" onRetry={loadPrices} /></section>
        ) : pricesLoading ? (
          <section className="hm-sectors hm-mod-failed"><Skeleton shape="rows" rows={5} /></section>
        ) : (
          <SectorsCard sectors={sectors} />
        )}
      </section>

      {/* ── the board ────────────────────────────────────────────────────── */}
      <section className="hm-market" aria-labelledby="hm-top-t">
        <header>
          <div>
            <span>لوحة السوق</span>
            {/* Not «الأكثر حركة» any more: the default view is market cap, and
                three of the four tabs are not about movement at all. */}
            <h2 id="hm-top-t">أبرز الشركات</h2>
          </div>
          <div className="hm-market-actions">
            <label>
              <span aria-hidden="true">⌕</span>
              <span className="sr-only">ابحث عن شركة</span>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث عن شركة..." />
            </label>
            <Link href="/market">جميع الشركات ↗</Link>
          </div>
        </header>

        <div className="hm-mover-tabs">
          <div role="tablist" aria-label="تصنيف الشركات">
            {([['mcap', 'القيمة السوقية'], ['gainers', 'الرابحون'], ['losers', 'الخاسرون'], ['active', 'الأكثر نشاطاً']] as const).map(([k, l]) => (
              <button key={k} type="button" role="tab" aria-selected={moverTab === k}
                className={moverTab === k ? 'active' : ''} onClick={() => pickTab(k)}
                /* The market-cap universe is the CURRENT ROSTER and a snapshot,
                   not a session figure and not an official exchange ranking.
                   Carried on the control rather than as a new line of chrome,
                   because this pass corrects data and not visual design. */
                title={k === 'mcap' ? MCAP_CAVEAT : undefined}>{l}</button>
            ))}
          </div>
          <div>
            {movers.map((c) => (
              <Link href={`/c/${c.sym}`} key={c.sym}
                /* A stale close is a real published price, not a current one,
                   and the ranking says so where it is material. */
                title={moverTab === 'mcap' ? capNote(c) : undefined}>
                <bdi>{c.sym}</bdi>
                <span>
                  {moverTab === 'mcap'
                    ? (capOf(c) == null ? <bdi>—</bdi> : <bdi>{compact.format(capOf(c) as number)}</bdi>)
                    : moverTab === 'active'
                      ? <bdi>{compact.format(c.vol ?? 0)}</bdi>
                      : signed(c.pct).text}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {pricesFailed ? (
          <ModuleError what="أسعار الشركات" onRetry={loadPrices} />
        ) : pricesLoading ? (
          <Skeleton shape="table" rows={10} />
        ) : (
          <div className="hm-market-table">
            <table>
              <caption className="sr-only">
                {capMode
                  ? `${rows.length} شركة مرتّبة حسب القيمة السوقية · لقطة على سجل الشركات`
                  : `${rows.length} شركة في جلسة ${arSession(session)}`}
              </caption>
              <thead>
                <tr>
                  <th scope="col">الشركة</th>
                  <th scope="col"><button type="button" onClick={() => sortBy('price')}>آخر سعر</button></th>
                  <th scope="col"><button type="button" onClick={() => sortBy('change')}>التغير</button></th>
                  <th scope="col"><button type="button" onClick={() => sortBy('volume')}>الحجم</button></th>
                  {/* «القيمة» meant traded value while a market-cap tab was
                      selected. The column now carries the name of the number
                      actually under it. */}
                  <th scope="col" aria-sort={sortKey === valueCol.key ? (sortDir === 'desc' ? 'descending' : 'ascending') : undefined}>
                    <button type="button" onClick={() => sortBy(valueCol.key)}>{valueCol.label}</button>
                  </th>
                  <th scope="col"><span className="sr-only">اتجاه 7 جلسات</span><bdi aria-hidden="true">7D</bdi></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.sym}>
                    <td>
                      <Link href={`/c/${c.sym}`}>
                        {/* No `color`: the reference's mark is one uniform
                            Electric-Blue chip, and the per-company colour is
                            an inline background that would override it. Real
                            logos still render, in the same 33px box. */}
                        <CompanyLogo sym={c.sym} logo={c.logo} />
                        <span>
                          <strong>{c.ar}</strong>
                          <small><bdi dir="ltr">{c.sym}</bdi></small>
                        </span>
                      </Link>
                    </td>
                    <td><bdi>{price.format(c.close)} IQD</bdi></td>
                    <td>
                      {/* A carried-forward row's change belongs to its LAST
                          traded session, not to this one. In the roster view
                          that row is on screen precisely because it did not
                          trade, so the session columns say so instead of
                          printing an old move as today's. */}
                      {c.stale ? <Unavailable why={lastTradeNote(c, true)} />
                        : c.noPrior ? <Unavailable why="لا يوجد إغلاق سابق" /> : (
                        <bdi className={signed(c.pct).tone === 'up' ? 'positive' : signed(c.pct).tone === 'down' ? 'negative' : ''}>
                          {signed(c.pct).text}
                        </bdi>
                      )}
                    </td>
                    <td>
                      {c.stale ? <Unavailable why={lastTradeNote(c, true)} />
                        : <bdi>{nf.format(c.shares_traded ?? 0)}</bdi>}
                    </td>
                    <td>
                      {capMode
                        ? (capOf(c) == null ? <Unavailable why="لا يتوفر سعر أو عدد أسهم" />
                          : <bdi>{compact.format(capOf(c) as number)} IQD</bdi>)
                        : <bdi>{compact.format(c.vol ?? 0)} IQD</bdi>}
                    </td>
                    <td>
                      {sparks[c.sym]?.length
                        ? <Sparkline values={sparks[c.sym]} positive={c.pct >= 0} compact />
                        : <Unavailable why="لا يتوفر تاريخ كافٍ" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── expanded ISX60 ───────────────────────────────────────────────
          A full-screen host held in component state, NOT a route. The
          standalone /charts destination is removed from the product and this
          must not quietly recreate it. */}
      {expanded ? (
        <div className="ov-scrim hm-expand-scrim" onMouseDown={closeExpanded}>
          <div ref={expandedRef} className="hm-expand-host" role="dialog" aria-modal="true"
            aria-label="مخطط ISX60 الموسّع" tabIndex={-1} onMouseDown={(e) => e.stopPropagation()}>
            <header>
              <h2 className="ty-section-title"><bdi>ISX60</bdi> · مخطط موسّع</h2>
              <button type="button" className="mv-btn is-compact" onClick={closeExpanded} data-autofocus>
                إغلاق
              </button>
            </header>
            <div className="hm-expand-body"><IndexChart rows={series} /></div>
          </div>
        </div>
      ) : null}
    </main>
  )
}
