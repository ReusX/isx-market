'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useApp } from '@/context/AppContext'
import {
  fetchLive, fetchCompanyMeta, mergeCompanies, liveMcap, lastTradeNote,
  daysSinceTrade, isSuspended, STALE_DAYS, SECTORS,
} from '@/lib/market'
import { arDate } from '@/lib/date'
import { fetchSparklines } from '@/lib/sparks'
import { CompanyLogo } from '@/components/CompanyLogo'
import { Sparkline } from '@/components/design/Sparkline'
import type { Company } from '@/types'
import './market.css'

/* ═══════════════════════════════════════════════════════════════════════════
   حركة السوق — THE MARKET BOARD.

   A VISUAL RE-PORT of the approved reference route
   (`/Users/amed/iqwealth-design/app/market/MarketBoard.tsx` and the «حركة
   السوق» block of its globals.css), wired to this application's real data.

   ── Why it does not look like the homepage ────────────────────────────────
   The homepage is a briefing — you read it once, standing up. This is a
   workspace — you sit in it and scan. Same materials, same Electric Blue, same
   numerals, but the composition inverts: the homepage gives 520px to a hero
   card, this gives the table roughly 80% of the page and compresses everything
   above it into two dense strips. Nothing here is in a card unless being in a
   card earns it.

   ── What the re-port restores ─────────────────────────────────────────────
   THREE COLUMNS. The previous implementation computed absolute change, traded
   value and deal count and displayed none of them. A 2% move on 4M IQD across
   nine deals and a 2% move on 68M IQD across 512 deals are completely
   different events, and it rendered them identically. `docs/MARKET_DATA_MAP.md`
   §3 confirms every one is already on `Company`.

   THE BOARD SCROLLS ITSELF. The page was 4,674px tall with a `position:
   sticky` thead that could never stick — sticky resolves against the nearest
   scrollport, and the scrollport was the window. Now the board owns its
   scroll, so the head, the summary and the filters stay on screen.

   ── What the data layer keeps ─────────────────────────────────────────────
   Commit `1c16513` in full: four-state movement, `flat` meaning MEASURED flat,
   «دون إغلاق سابق» as its own state and its own filter, counts that reconcile
   with the filtered rows, and no coercion of an unknown move to zero.
   ═══════════════════════════════════════════════════════════════════════════ */

/* `na` — traded, but with no comparable prior close. A fourth state, not a
   variety of flat. See docs/MARKET_DATA_MAP.md §5. */
type Movement = 'all' | 'up' | 'flat' | 'down' | 'na'
type Tab = 'all' | 'gainers' | 'losers' | 'active'
type Listing = 'active' | 'suspended'
type SortKey = 'price' | 'change' | 'pct' | 'volume' | 'value' | 'trades' | 'mcap'

const companyName = (c: Company, ar: boolean) => (ar ? c.ar || c.en : c.en || c.ar) || c.sym

const nfInt = new Intl.NumberFormat('en-US')
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 })
const nfPrice = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const tone = (v: number) => (v > 0 ? 'positive' : v < 0 ? 'negative' : 'neutral')
/* Round FIRST, then read the sign off what the reader will actually see —
   otherwise −0.0009 prints as «−0.00%», a direction the number itself denies.
   Same rule as the homepage's `signed()`. */
function signedPct(v: number): { text: string; cls: string } {
  const r = Number(v.toFixed(2))
  return { text: `${r > 0 ? '+' : r < 0 ? '−' : ''}${Math.abs(r).toFixed(2)}%`, cls: tone(r) }
}
function signedPrice(v: number): { text: string; cls: string } {
  const r = Number(v.toFixed(2))
  return { text: `${r > 0 ? '+' : r < 0 ? '−' : ''}${nfPrice.format(Math.abs(r))}`, cls: tone(r) }
}

export default function MarketPage() {
  const { lang, watchlist, toggleWatchlist } = useApp()
  const ar = lang === 'ar'

  const [companies, setCompanies] = useState<Company[]>([])
  const [session, setSession] = useState('')
  const [sparks, setSparks] = useState<Record<string, number[]>>({})
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  const [tab, setTab] = useState<Tab>('all')
  const [listing, setListing] = useState<Listing>('active')
  const [sector, setSector] = useState('all')
  const [query, setQuery] = useState('')
  const [onlyWatchlist, setOnlyWatchlist] = useState(false)
  const [movement, setMovement] = useState<Movement>('all')
  const [sortKey, setSortKey] = useState<SortKey>('value')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  /*
   * Seed the filter from ?q= · the endpoint the header search submits to, and
   * the one the WebSite SearchAction in app/layout.tsx declares to Google as
   * this site's search.
   *
   * Read from `window.location` rather than `useSearchParams()` on purpose —
   * that hook opts a page out of static rendering unless it sits behind a
   * Suspense boundary, and /market is prerendered.
   */
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('q')
    if (q) setQuery(q)
  }, [])

  function load() {
    setFailed(false)
    setLoading(true)
    Promise.all([fetchLive(), fetchCompanyMeta()])
      .then(([live, meta]) => {
        setCompanies(mergeCompanies(meta, live.stocks))
        setSession(live.updated ?? '')
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  useEffect(() => {
    fetchSparklines().then(setSparks).catch(() => {
      /* the 7D column is an enhancement — the table stands without it */
    })
  }, [])

  const listed = useMemo(() => companies.filter((c) => c.close > 0), [companies])
  const suspendedCount = useMemo(() => listed.filter((c) => isSuspended(c)).length, [listed])
  const activeCount = listed.length - suspendedCount

  /* ── Breadth · FOUR states ───────────────────────────────────────────────
     Only names that actually traded are counted — carried-forward rows would
     otherwise all pile into «ثابت» and make a thin session look like a calm
     one. And «ثابت» means MEASURED flat: a company with no valid prior close
     has an UNKNOWN change, so it gets its own state rather than being folded
     into a claim the data does not support. Commit `1c16513`. */
  const counts = useMemo(() => {
    const traded = listed.filter((c) => !c.stale)
    return {
      up: traded.filter((c) => !c.noPrior && c.pct > 0).length,
      flat: traded.filter((c) => !c.noPrior && c.pct === 0).length,
      down: traded.filter((c) => !c.noPrior && c.pct < 0).length,
      na: traded.filter((c) => c.noPrior).length,
      traded: traded.length,
    }
  }, [listed])

  const totals = useMemo(() => {
    const traded = listed.filter((c) => !c.stale)
    return {
      value: traded.reduce((s, c) => s + (c.vol ?? 0), 0),
      volume: traded.reduce((s, c) => s + (c.shares_traded ?? 0), 0),
      trades: traded.reduce((s, c) => s + (c.deals ?? 0), 0),
      mostActive: [...traded].sort((a, b) => (b.vol ?? 0) - (a.vol ?? 0))[0],
    }
  }, [listed])

  const rows = useMemo(() => {
    let data = listed.filter((c) => isSuspended(c) === (listing === 'suspended'))
    if (sector !== 'all') data = data.filter((c) => c.sec === sector)
    if (onlyWatchlist) data = data.filter((c) => watchlist.includes(c.sym))

    if (tab === 'gainers') data = data.filter((c) => !c.stale && !c.noPrior && c.pct > 0)
    else if (tab === 'losers') data = data.filter((c) => !c.stale && !c.noPrior && c.pct < 0)
    else if (tab === 'active') data = data.filter((c) => !c.stale && (c.vol ?? 0) > 0)

    /* The breadth keys filter on the same four states they count, so the
       number on the key and the number of rows it produces are the same
       number. `noPrior` is the distinguishing signal — `pct === 0` alone would
       quietly return unknown-change companies from a filter that claims to
       show unchanged ones. */
    if (movement !== 'all') {
      data = data.filter((c) => !c.stale && (
        movement === 'up' ? !c.noPrior && c.pct > 0
        : movement === 'down' ? !c.noPrior && c.pct < 0
        : movement === 'flat' ? !c.noPrior && c.pct === 0
        : Boolean(c.noPrior)
      ))
    }

    const q = query.trim().toLowerCase()
    if (q) {
      data = data.filter((c) =>
        c.sym.toLowerCase().includes(q) ||
        (c.en ?? '').toLowerCase().includes(q) ||
        (c.ar ?? '').includes(query.trim()))
    }

    const val = (c: Company): number =>
      sortKey === 'price' ? c.close
      : sortKey === 'change' ? c.change
      : sortKey === 'pct' ? c.pct
      // `vol` is the traded VALUE in dinars despite the name; `shares_traded`
      // is the share count the الحجم column actually claims to show.
      : sortKey === 'volume' ? (c.shares_traded ?? 0)
      : sortKey === 'value' ? (c.vol ?? 0)
      : sortKey === 'trades' ? (c.deals ?? 0)
      // The suspended tab hides market cap, so a mcap sort has no visible
      // column to explain itself. Order those by how recently they last traded
      // instead — the only dimension that still separates them.
      : listing === 'suspended' ? -daysSinceTrade(c)
      : liveMcap(c)

    const factor = sortDir === 'asc' ? 1 : -1
    return [...data].sort((a, b) => {
      /* A carried-forward row has no value for any SESSION column, so it sinks
         rather than interleaving with real results at zero. Price and market
         cap are properties of the company, not of the session, so they sort
         normally. */
      if (sortKey !== 'price' && sortKey !== 'mcap') {
        const aq = Boolean(a.stale), bq = Boolean(b.stale)
        if (aq !== bq) return aq ? 1 : -1
      }
      return (val(a) - val(b)) * factor
    })
  }, [listed, listing, sector, onlyWatchlist, watchlist, tab, movement, query, sortKey, sortDir])

  function sortBy(key: SortKey) {
    if (key === sortKey) { setSortDir((d) => (d === 'asc' ? 'desc' : 'asc')); return }
    setSortKey(key)
    // Money and size open large-first; nothing else is a useful first look.
    setSortDir('desc')
  }

  function selectTab(next: Tab) {
    setTab(next)
    // The tab carries the ordering that makes it legible — «الأكثر نشاطاً»
    // sorted by market cap would be a different question's answer.
    if (next === 'active') { setSortKey('value'); setSortDir('desc') }
    else if (next === 'gainers') { setSortKey('pct'); setSortDir('desc') }
    else if (next === 'losers') { setSortKey('pct'); setSortDir('asc') }
  }

  const filtersActive = tab !== 'all' || sector !== 'all' || query.trim() !== '' ||
    movement !== 'all' || onlyWatchlist
  function resetFilters() {
    setTab('all'); setSector('all'); setQuery(''); setMovement('all'); setOnlyWatchlist(false)
    setSortKey('value'); setSortDir('desc')
  }

  const sectorLabel = (id: string) => {
    const s = SECTORS.find((x) => x.id === id)
    return s ? (ar ? s.arFull : s.enFull) : id
  }
  const sectorShort = (id: string) => {
    const s = SECTORS.find((x) => x.id === id)
    return s ? (ar ? s.ar : s.en) : id
  }

  const showEmpty = !loading && !failed && rows.length === 0

  return (
    <main className="iq-page mk">
      {/* ── Page head ───────────────────────────────────────────────────────
          One row. The real estate above the first row is the most expensive on
          the page, so it carries only what changes the reading of the table:
          which session this is, and how much of the exchange is represented. */}
      <header className="mk-head">
        <div className="mk-head-title">
          <h1>{ar ? 'حركة السوق' : 'Market movement'}</h1>
          {/* ISX publishes one bulletin per trading day — there is no intraday
              feed and therefore no «open» state this product can honestly
              claim. The chip names the bulletin, not a live session. */}
          <span className="mk-session" data-state="closed">
            <i aria-hidden="true" />{ar ? 'آخر نشرة' : 'Latest bulletin'}
          </span>
        </div>

        <dl className="mk-meta">
          <div>
            <dt>{ar ? 'الجلسة' : 'Session'}</dt>
            <dd className="mk-meta-date">{session ? arDate(session) : '—'}</dd>
          </div>
          <div>
            <dt>{ar ? 'المتداولة' : 'Traded'}</dt>
            <dd><bdi>{counts.traded}</bdi></dd>
          </div>
          <div>
            <dt>{ar ? 'الشركات' : 'Companies'}</dt>
            <dd><bdi>{activeCount}</bdi> <small>{ar ? 'من' : 'of'} <bdi>{listed.length}</bdi></small></dd>
          </div>
        </dl>
      </header>

      {/* ── Summary strip ───────────────────────────────────────────────────
          One surface, four cells, hairline dividers. Not four KPI cards: four
          cards say the same thing in 180px that this says in 99px, on a page
          whose whole job is getting you into rows fast. */}
      <section className="mk-summary" aria-label={ar ? 'ملخص الجلسة' : 'Session summary'}>
        <div className="mk-breadth">
          <span className="mk-cell-label">{ar ? 'اتساع السوق' : 'Breadth'}</span>
          <div className="mk-breadth-bar" role="img"
            aria-label={ar
              ? `${counts.up} رابح، ${counts.flat} ثابت، ${counts.down} خاسر، ${counts.na} دون إغلاق سابق، من ${counts.traded} متداولة`
              : `${counts.up} up, ${counts.flat} flat, ${counts.down} down, ${counts.na} with no prior close, of ${counts.traded} traded`}>
            {([['up', counts.up], ['flat', counts.flat], ['down', counts.down], ['na', counts.na]] as const)
              .map(([k, n]) => n > 0
                ? <i key={k} className={k} style={{ inlineSize: `${(n / (counts.traded || 1)) * 100}%` }} />
                : null)}
          </div>
          {/* The counts ARE the filter. Two controls for one idea is one too
              many, and these are the most-glanced numbers on the page. The
              fourth key appears only when the session has such companies — a
              permanent «0 دون إغلاق سابق» would be noise on most sessions. */}
          <div className="mk-breadth-keys">
            {([
              { id: 'up' as const, n: counts.up, ar: 'رابح', en: 'up' },
              { id: 'flat' as const, n: counts.flat, ar: 'ثابت', en: 'flat' },
              { id: 'down' as const, n: counts.down, ar: 'خاسر', en: 'down' },
              ...(counts.na > 0
                ? [{ id: 'na' as const, n: counts.na, ar: 'دون إغلاق سابق', en: 'no prior close' }]
                : []),
            ]).map((k) => (
              <button key={k.id} type="button" className={k.id}
                aria-pressed={movement === k.id}
                onClick={() => setMovement((c) => (c === k.id ? 'all' : k.id))}>
                <bdi>{k.n}</bdi><span>{ar ? k.ar : k.en}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mk-metric">
          <span className="mk-cell-label">{ar ? 'قيمة التداول' : 'Traded value'}</span>
          <strong><bdi>{compact.format(totals.value)}</bdi><small>IQD</small></strong>
        </div>

        <div className="mk-metric mk-metric-pair">
          <div>
            <span className="mk-cell-label">{ar ? 'الحجم' : 'Volume'}</span>
            <strong><bdi>{compact.format(totals.volume)}</bdi><small>{ar ? 'سهم' : 'sh'}</small></strong>
          </div>
          <div>
            <span className="mk-cell-label">{ar ? 'الصفقات' : 'Trades'}</span>
            <strong><bdi>{nfInt.format(totals.trades)}</bdi></strong>
          </div>
        </div>

        <div className="mk-metric mk-most-active">
          <span className="mk-cell-label">{ar ? 'الأكثر نشاطاً' : 'Most active'}</span>
          {totals.mostActive ? (
            <Link href={`/c/${totals.mostActive.sym}`}>
              <strong>{companyName(totals.mostActive, ar)}</strong>
              <span>
                <bdi className="mk-ticker">{totals.mostActive.sym}</bdi>
                <bdi>{compact.format(totals.mostActive.vol ?? 0)} IQD</bdi>
              </span>
            </Link>
          ) : null}
        </div>
      </section>

      {/* ── Controls ────────────────────────────────────────────────────────
          Sticky, because on a 104-row board the filters scroll away exactly
          when you decide you want a different slice. */}
      <div className="mk-controls">
        <div className="mk-filter-tabs" role="tablist" aria-label={ar ? 'تصنيف الشركات' : 'Company filter'}>
          {([
            { id: 'all' as const, ar: 'الكل', en: 'All' },
            { id: 'gainers' as const, ar: 'الرابحون', en: 'Gainers' },
            { id: 'losers' as const, ar: 'الخاسرون', en: 'Losers' },
            { id: 'active' as const, ar: 'الأكثر نشاطاً', en: 'Most active' },
          ]).map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id}
              className={tab === t.id ? 'active' : ''} onClick={() => selectTab(t.id)}>
              {ar ? t.ar : t.en}
            </button>
          ))}
        </div>

        {/* dir="auto" so an Arabic name types RTL and a ticker types LTR in the
            same field, which is how people actually search here. */}
        <label className="mk-search">
          <span aria-hidden="true" className="mk-search-icon">⌕</span>
          <span className="sr-only">{ar ? 'بحث في الشركات' : 'Search companies'}</span>
          <input value={query} dir="auto"
            placeholder={ar ? 'ابحث باسم الشركة أو الرمز…' : 'Search company or symbol…'}
            onChange={(e) => setQuery(e.target.value)} />
          {query ? (
            <button type="button" className="mk-search-clear"
              aria-label={ar ? 'مسح البحث' : 'Clear search'}
              onClick={() => setQuery('')}>✕</button>
          ) : null}
        </label>

        <label className="mk-sector">
          <span className="sr-only">{ar ? 'تصفية حسب القطاع' : 'Filter by sector'}</span>
          <select value={sector} onChange={(e) => setSector(e.target.value)}>
            {SECTORS.map((s) => (
              <option key={s.id} value={s.id}>{ar ? s.arFull ?? s.ar : s.enFull ?? s.en}</option>
            ))}
          </select>
          <i aria-hidden="true">▾</i>
        </label>

        <div className="mk-listing" role="group" aria-label={ar ? 'حالة الإدراج' : 'Listing status'}>
          <button type="button" aria-pressed={listing === 'active'} onClick={() => setListing('active')}>
            {ar ? 'نشطة' : 'Active'} <bdi>{activeCount}</bdi>
          </button>
          <button type="button" aria-pressed={listing === 'suspended'} onClick={() => setListing('suspended')}>
            {ar ? 'موقوفة' : 'Suspended'} <bdi>{suspendedCount}</bdi>
          </button>
        </div>

        <button type="button" className="mk-watch-filter" aria-pressed={onlyWatchlist}
          onClick={() => setOnlyWatchlist((v) => !v)}>
          ★ {ar ? 'متابعتي' : 'Watchlist'}
        </button>

        <div className="mk-controls-end">
          {filtersActive ? (
            <button type="button" className="mk-reset" onClick={resetFilters}>
              {ar ? 'مسح الفلاتر' : 'Clear filters'}
            </button>
          ) : null}
          <span className="mk-count"><bdi>{rows.length}</bdi> {ar ? 'شركة' : 'companies'}</span>
        </div>
      </div>

      {listing === 'suspended' ? (
        <p className="mk-note">
          {ar
            ? <>أسهم لم تُتداول منذ أكثر من <bdi>{STALE_DAYS}</bdi> يوماً. السعر المعروض هو آخر صفقة فعلية بتاريخها، وليس سعراً حالياً — ولهذا لا تُحتسب لها قيمة سوقية.</>
            : <>Stocks with no trade in over <bdi>{STALE_DAYS}</bdi> days. The price shown is the last actual trade on its date, not a current quote — which is why no market cap is given.</>}
        </p>
      ) : null}

      {/* ── The board ───────────────────────────────────────────────────── */}
      {failed ? (
        <div className="mk-error" role="alert">
          <span className="mk-error-mark" aria-hidden="true">!</span>
          <div>
            <strong>{ar ? 'تعذّر تحميل جدول السوق' : 'Could not load the market board'}</strong>
            <p>{ar
              ? 'لم نتمكن من الوصول إلى بيانات الجلسة.'
              : 'We could not reach the session data.'}</p>
          </div>
          <button type="button" onClick={load}>{ar ? 'إعادة المحاولة' : 'Try again'}</button>
        </div>
      ) : (
        <section className="mk-board" data-empty={showEmpty || undefined}
          aria-label={ar ? 'جدول الشركات' : 'Company table'}>
          <div className="mk-board-scroll">
            <table className="mk-table">
              <caption className="sr-only">
                {ar
                  ? `حركة أسهم بورصة العراق لجلسة ${session ? arDate(session) : ''} · ${rows.length} شركة`
                  : `Iraq Stock Exchange movement for ${session} · ${rows.length} companies`}
              </caption>
              <thead>
                <tr>
                  <th className="mk-col-rank" scope="col">
                    <span className="sr-only">{ar ? 'الترتيب' : 'Rank'}</span><span aria-hidden="true">#</span>
                  </th>
                  <th className="mk-col-watch" scope="col">
                    <span className="sr-only">{ar ? 'متابعة' : 'Watch'}</span>
                  </th>
                  <th className="mk-col-company" scope="col">{ar ? 'الشركة' : 'Company'}</th>
                  <SortHeader k="price" label={ar ? 'آخر سعر' : 'Last'} {...{ sortKey, sortDir, sortBy, ar }} />
                  <SortHeader k="change" label={ar ? 'التغير' : 'Change'} cls="mk-col-change-abs" {...{ sortKey, sortDir, sortBy, ar }} />
                  <SortHeader k="pct" label={ar ? 'التغير ٪' : 'Change %'} {...{ sortKey, sortDir, sortBy, ar }} />
                  <SortHeader k="volume" label={ar ? 'الحجم' : 'Volume'} {...{ sortKey, sortDir, sortBy, ar }} />
                  <SortHeader k="value" label={ar ? 'قيمة التداول' : 'Value'} {...{ sortKey, sortDir, sortBy, ar }} />
                  <SortHeader k="trades" label={ar ? 'الصفقات' : 'Trades'} {...{ sortKey, sortDir, sortBy, ar }} />
                  <SortHeader k="mcap" label={ar ? 'القيمة السوقية' : 'Mkt cap'} {...{ sortKey, sortDir, sortBy, ar }} />
                  <th className="mk-col-spark" scope="col">
                    <span className="sr-only">{ar ? 'اتجاه 7 جلسات' : '7-session trend'}</span>
                    <bdi aria-hidden="true">7D</bdi>
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading && !rows.length ? <SkeletonRows /> : null}
                {!loading && !showEmpty ? rows.map((c, i) => {
                  const quiet = Boolean(c.stale)
                  const suspended = isSuspended(c)
                  const watched = watchlist.includes(c.sym)
                  const pct = signedPct(c.pct)
                  const abs = signedPrice(c.change)
                  return (
                    <tr key={c.sym} data-quiet={quiet || undefined}>
                      <td className="mk-col-rank"><bdi>{i + 1}</bdi></td>
                      <td className="mk-col-watch">
                        <button type="button"
                          className={watched ? 'mk-star is-on' : 'mk-star'}
                          aria-pressed={watched}
                          aria-label={ar ? `متابعة ${c.sym}` : `Watch ${c.sym}`}
                          onClick={() => toggleWatchlist(c.sym)}>★</button>
                      </td>

                      <td className="mk-col-company">
                        <Link href={`/c/${c.sym}`}>
                          {/* Two letters, not one: half the exchange is banks. */}
                          <CompanyLogo className="mk-mark" sym={c.sym} logo={c.logo} letters={2} />
                          <span className="mk-identity">
                            <strong title={companyName(c, ar)}>{companyName(c, ar)}</strong>
                            <small>
                              <bdi className="mk-ticker">{c.sym}</bdi>
                              <em>{sectorShort(c.sec)}</em>
                              {quiet ? (
                                <span className="mk-flag" title={lastTradeNote(c, ar)}>
                                  {suspended ? (ar ? 'موقوف' : 'suspended') : (ar ? 'لم يُتداول' : 'no trade')}
                                </span>
                              ) : null}
                            </small>
                          </span>
                        </Link>
                      </td>

                      <td className="mk-col-num mk-price">
                        <bdi>{nfPrice.format(c.close)}</bdi>
                        {/* NOT wrapped in `bdi`: an Arabic date isolated as LTR
                            comes out as «أغسطس 16 2026». */}
                        {quiet && c.lastTrade && daysSinceTrade(c) > 5 ? <small>{arDate(c.lastTrade)}</small> : null}
                      </td>

                      {/* A stock that did not trade has no move to report, and
                          one with no comparable prior close has an unknown one.
                          An em dash for both — never 0.00, which would be a
                          claim that it was flat today. */}
                      <td className="mk-col-num mk-col-change-abs">
                        {quiet || c.noPrior ? <Dash ar={ar} /> : <bdi className={abs.cls}>{abs.text}</bdi>}
                      </td>
                      <td className="mk-col-num">
                        {quiet || c.noPrior ? <Dash ar={ar} /> : <bdi className={`mk-pct ${pct.cls}`}>{pct.text}</bdi>}
                      </td>

                      <td className="mk-col-num">{quiet ? <Dash ar={ar} /> : <bdi>{nfInt.format(c.shares_traded ?? 0)}</bdi>}</td>
                      <td className="mk-col-num">{quiet ? <Dash ar={ar} /> : <bdi>{compact.format(c.vol ?? 0)}</bdi>}</td>
                      <td className="mk-col-num">{quiet ? <Dash ar={ar} /> : <bdi>{nfInt.format(c.deals ?? 0)}</bdi>}</td>

                      {/* Market cap is last price × issued shares. On a
                          suspended name that price can be years old, so the
                          product is not a valuation — suppressed, not guessed. */}
                      <td className="mk-col-num">
                        {suspended || liveMcap(c) <= 0 ? <Dash ar={ar} /> : <bdi>{compact.format(liveMcap(c))}</bdi>}
                      </td>

                      <td className="mk-col-spark">
                        {sparks[c.sym]?.length > 1
                          ? <Sparkline values={sparks[c.sym]} positive={c.pct >= 0} compact />
                          : <Dash ar={ar} />}
                      </td>
                    </tr>
                  )
                }) : null}
              </tbody>
            </table>
          </div>

          {showEmpty ? (
            <EmptyState ar={ar} query={query} tab={tab} sector={sector}
              movement={movement} onlyWatchlist={onlyWatchlist}
              sectorLabel={sectorLabel} onReset={resetFilters} />
          ) : null}
        </section>
      )}

      <p className="mk-footnote">
        {ar
          ? <>الأسعار من النشرة الرسمية لبورصة العراق لجلسة {session ? arDate(session) : '—'} · القيمة السوقية = آخر سعر × الأسهم المصدرة · الشركات التي لم تُتداول في الجلسة تظهر بآخر سعر فعلي لها دون تغيّر أو حجم.</>
          : <>Prices from the official Iraq Stock Exchange bulletin for {session} · market cap = last price × issued shares · companies that did not trade this session show their last actual price with no change or volume.</>}
      </p>
    </main>
  )
}

/* ── Sortable header ────────────────────────────────────────────────────────
   State is carried by THREE signals, not one: the caret's direction, the
   caret's opacity, and the column's ink weight. Colour alone fails for about
   one man in twelve, and an arrow alone is four pixels of ink at this size. */
function SortHeader({ k, label, cls = '', sortKey, sortDir, sortBy, ar }: {
  k: SortKey; label: string; cls?: string; sortKey: SortKey
  sortDir: 'asc' | 'desc'; sortBy: (k: SortKey) => void; ar: boolean
}) {
  const active = sortKey === k
  const state = active
    ? sortDir === 'asc' ? (ar ? 'مرتّب تصاعدياً' : 'sorted ascending') : (ar ? 'مرتّب تنازلياً' : 'sorted descending')
    : (ar ? 'غير مرتّب' : 'not sorted')
  return (
    <th scope="col" className={`mk-col-num ${cls}`}
      aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}>
      <button type="button" onClick={() => sortBy(k)}
        className={active ? 'active' : ''} data-dir={active ? sortDir : undefined}
        aria-label={`${label} · ${state}`}>
        <span>{label}</span>
        <svg viewBox="0 0 9 6" width="9" height="6" aria-hidden="true" className="mk-caret">
          <path d="M0.6 0.8 L4.5 4.9 L8.4 0.8" fill="none" stroke="currentColor" strokeWidth="1.3" />
        </svg>
      </button>
    </th>
  )
}

function Dash({ ar }: { ar: boolean }) {
  return <span className="mk-dash" aria-label={ar ? 'لا تتوفر بيانات' : 'not available'}>—</span>
}

/* ── Loading ────────────────────────────────────────────────────────────────
   Skeleton ROWS on the real column structure, not a spinner and not one grey
   block. The column widths are already correct when the placeholder paints, so
   the arrival of data changes the text and nothing else — no reflow, no jump. */
function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 14 }, (_, i) => (
        <tr className="mk-skeleton" key={i} aria-hidden="true">
          <td className="mk-col-rank"><i style={{ inlineSize: '12px' }} /></td>
          <td className="mk-col-watch"><i style={{ inlineSize: '12px' }} /></td>
          <td className="mk-col-company">
            <span className="mk-skeleton-id">
              <i className="mk-skeleton-mark" />
              <span>
                <i style={{ inlineSize: `${52 + ((i * 17) % 46)}%` }} />
                <i style={{ inlineSize: '34%', blockSize: '8px' }} />
              </span>
            </span>
          </td>
          {Array.from({ length: 7 }, (_, c) => (
            <td className="mk-col-num" key={c}><i style={{ inlineSize: `${44 + ((i + c) % 4) * 12}%` }} /></td>
          ))}
          <td className="mk-col-spark"><i style={{ inlineSize: '56px', blockSize: '16px' }} /></td>
        </tr>
      ))}
    </>
  )
}

/* ── Empty ──────────────────────────────────────────────────────────────────
   No illustration. It names what is filtering, because the useful thing here
   is not sympathy — it is telling someone which of their filters is the one
   hiding everything. */
function EmptyState({ ar, query, tab, sector, movement, onlyWatchlist, sectorLabel, onReset }: {
  ar: boolean; query: string; tab: Tab; sector: string; movement: Movement
  onlyWatchlist: boolean; sectorLabel: (id: string) => string; onReset: () => void
}) {
  const TAB_LABEL: Record<Tab, [string, string]> = {
    all: ['', ''], gainers: ['الرابحون', 'Gainers'],
    losers: ['الخاسرون', 'Losers'], active: ['الأكثر نشاطاً', 'Most active'],
  }
  const MOVE_LABEL: Record<Movement, [string, string]> = {
    all: ['', ''], up: ['رابح', 'up'], flat: ['ثابت', 'flat'],
    down: ['خاسر', 'down'], na: ['دون إغلاق سابق', 'no prior close'],
  }
  const active: string[] = []
  if (tab !== 'all') active.push(ar ? TAB_LABEL[tab][0] : TAB_LABEL[tab][1])
  if (movement !== 'all') active.push(ar ? MOVE_LABEL[movement][0] : MOVE_LABEL[movement][1])
  if (sector !== 'all') active.push(sectorLabel(sector))
  if (onlyWatchlist) active.push(ar ? 'متابعتي' : 'Watchlist')
  if (query.trim()) active.push(`${ar ? 'بحث' : 'search'}: ${query.trim()}`)

  return (
    <div className="mk-empty">
      <strong>{ar ? 'لا توجد شركات مطابقة' : 'No matching companies'}</strong>
      <p>{ar
        ? 'لم تُطابق أي شركة في هذه الجلسة الفلاتر المطبّقة حالياً.'
        : 'No company in this session matched the filters currently applied.'}</p>
      {active.length ? (
        <div className="mk-empty-filters">
          {active.map((l) => <span key={l}>{l}</span>)}
        </div>
      ) : null}
      <button type="button" onClick={onReset}>{ar ? 'مسح جميع الفلاتر' : 'Clear all filters'}</button>
    </div>
  )
}
