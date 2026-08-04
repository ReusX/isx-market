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
import { SectorChip } from '@/components/design/SectorChip'
import { Card } from '@/components/design/ui'
import { SkeletonTableRows } from '@/components/design/Placeholders'
import { ListingStatusTabs, type ListingStatus } from '@/components/design/ListingStatusTabs'
import type { Company } from '@/types'

type Movement = 'all' | 'up' | 'flat' | 'down'
type SortKey = 'mcap' | 'price' | 'change' | 'volume'

const companyName = (c: Company, ar: boolean) => (ar ? c.ar || c.en : c.en || c.ar) || c.sym

/*
 * Suspended listings are hidden behind a counted toggle, the same treatment
 * /screener already ships (see the rule in lib/market.ts). When a row IS shown,
 * its last-trade date is printed under the price rather than left in a `title`
 * tooltip — no phone can display a tooltip, so on mobile a 2010 quote was
 * indistinguishable from today's.
 */

const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 })
const priceFormat = new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

export default function MarketPage() {
  const { lang, watchlist, toggleWatchlist } = useApp()
  const ar = lang === 'ar'

  const [companies, setCompanies] = useState<Company[]>([])
  const [sparks, setSparks] = useState<Record<string, number[]>>({})
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [sector, setSector] = useState('all')
  const [query, setQuery] = useState('')
  const [onlyWatchlist, setOnlyWatchlist] = useState(false)
  const [status, setStatus] = useState<ListingStatus>('active')
  const [movement, setMovement] = useState<Movement>('all')
  const [sortKey, setSortKey] = useState<SortKey>('mcap') // same default as the homepage list
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  /*
   * Seed the filter from ?q= · the endpoint the header search submits to, and
   * the one the WebSite SearchAction in app/layout.tsx declares to Google as
   * this site's search. That declaration was false until now: /market ignored
   * the parameter entirely, so the sitelinks searchbox it is meant to enable
   * could never have worked.
   *
   * Read from `window.location` rather than `useSearchParams()` on purpose —
   * that hook opts a page out of static rendering unless it sits behind a
   * Suspense boundary, and /market is prerendered. The filter is client-side
   * anyway, so there is nothing to gain from resolving it on the server.
   */
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('q')
    if (q) setQuery(q)
  }, [])

  useEffect(() => {
    Promise.all([fetchLive(), fetchCompanyMeta()])
      .then(([live, meta]) => setCompanies(mergeCompanies(meta, live.stocks)))
      .catch(() => setFailed(true))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchSparklines().then(setSparks).catch(() => {
      /* the 7D column is an enhancement — the table stands without it */
    })
  }, [])

  const listed = useMemo(() => companies.filter(c => c.close > 0), [companies])

  const suspendedCount = useMemo(
    () => listed.filter(c => isSuspended(c)).length,
    [listed],
  )

  const rows = useMemo(() => {
    let data = listed
    data = data.filter(c => (status === 'suspended' ? isSuspended(c) : !isSuspended(c)))
    if (sector !== 'all') data = data.filter(c => c.sec === sector)
    if (onlyWatchlist) data = data.filter(c => watchlist.includes(c.sym))
    // The breadth counts are read off this session's trades, so filtering by
    // them drops carried-forward names — they have no move to belong to.
    if (movement !== 'all') {
      data = data.filter(c => !c.stale && (
        movement === 'up' ? c.pct > 0 : movement === 'down' ? c.pct < 0 : c.pct === 0
      ))
    }
    const q = query.trim().toLowerCase()
    if (q) {
      data = data.filter(c =>
        c.sym.toLowerCase().includes(q) ||
        (c.en ?? '').toLowerCase().includes(q) ||
        (c.ar ?? '').includes(query.trim()),
      )
    }
    const val = (c: Company) =>
      sortKey === 'price' ? c.close
      // `vol` is the traded VALUE in dinars despite the name; `shares_traded`
      // is the share count the الحجم column actually claims to show.
      : sortKey === 'volume' ? (c.shares_traded ?? 0)
      : sortKey === 'change' ? c.pct
      // The suspended tab hides market cap, so the default mcap sort has no
      // visible column to explain itself. Order those by how recently they last
      // traded instead — the only dimension that still separates them.
      : status === 'suspended' ? -daysSinceTrade(c)
      : liveMcap(c)
    return [...data].sort((a, b) => (sortDir === 'asc' ? val(a) - val(b) : val(b) - val(a)))
  }, [listed, sector, onlyWatchlist, watchlist, query, movement, sortKey, sortDir, status])

  // Advancers/decliners only count names that actually traded this session —
  // carried-forward rows would otherwise all land in "unchanged".
  const counts = useMemo(() => {
    const traded = listed.filter(c => !c.stale)
    return {
      advancers: traded.filter(c => c.pct > 0).length,
      unchanged: traded.filter(c => c.pct === 0).length,
      decliners: traded.filter(c => c.pct < 0).length,
    }
  }, [listed])

  function sortBy(key: SortKey) {
    if (key === sortKey) { setSortDir(d => (d === 'asc' ? 'desc' : 'asc')); return }
    setSortKey(key); setSortDir('desc')
  }

  const sectorLabel = (id: string) => {
    const s = SECTORS.find(x => x.id === id)
    return s ? (ar ? s.arFull : s.enFull) : id
  }

  return (
    <main className="terminal-shell app-page market-movement-page">
      <Card className="market-movement-header">
        <div>
          <span className="app-eyebrow">{ar ? 'حركة السوق' : 'Market movement'}</span>
          <h1>{ar ? 'جميع الشركات المدرجة' : 'All listed companies'}</h1>
        </div>
        <div className="market-counts" role="group" aria-label={ar ? 'ملخص حركة الشركات' : 'Breadth summary'}>
          {([
            { id: 'up',   tone: 'positive', count: counts.advancers, ar: 'رابح',   en: 'up' },
            { id: 'flat', tone: '',         count: counts.unchanged, ar: 'الثابت', en: 'flat' },
            { id: 'down', tone: 'negative', count: counts.decliners, ar: 'خاسر',   en: 'down' },
          ] as const).map(item => (
            <button
              key={item.id}
              type="button"
              className={[item.tone, movement === item.id ? 'is-active' : ''].filter(Boolean).join(' ')}
              aria-pressed={movement === item.id}
              onClick={() => setMovement(current => (current === item.id ? 'all' : item.id))}
            >
              <bdi>{item.count}</bdi>
              <small>{ar ? item.ar : item.en}</small>
            </button>
          ))}
        </div>
      </Card>

      <div className="filter-bar">
        <label className="app-field">
          <input
            type="search"
            dir="auto"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={ar ? 'ابحث عن شركة أو رمز…' : 'Search company or symbol…'}
            aria-label={ar ? 'بحث' : 'Search'}
          />
        </label>
        <SectorChip
          label={ar ? '★ متابعتي' : '★ Watchlist'}
          selected={onlyWatchlist}
          selectionTone="accent"
          onClick={() => setOnlyWatchlist(v => !v)}
        />
      </div>

      <div className="market-sector-filters" aria-label={ar ? 'تصفية حسب القطاع' : 'Filter by sector'}>
        {SECTORS.map(s => (
          <SectorChip
            key={s.id}
            label={ar ? s.ar : s.en}
            selected={s.id === sector}
            selectionTone="neutral"
            onClick={() => setSector(s.id)}
          />
        ))}
      </div>

      <ListingStatusTabs
        value={status}
        onChange={setStatus}
        activeCount={listed.length - suspendedCount}
        suspendedCount={suspendedCount}
        ar={ar}
      />

      {status === 'suspended' ? (
        <p className="listing-status-note">
          {ar
            ? <>أسهم لم تُتداول منذ أكثر من <bdi>{STALE_DAYS}</bdi> يوماً. السعر المعروض هو آخر صفقة فعلية بتاريخها، وليس سعراً حالياً — ولهذا لا تُحتسب لها قيمة سوقية.</>
            : <>Stocks with no trade in over <bdi>{STALE_DAYS}</bdi> days. The price shown is the last actual trade on its date, not a current quote — which is why no market cap is given.</>}
        </p>
      ) : null}

      {failed ? (
        <div className="empty-state">
          <strong>{ar ? 'تعذّر تحميل بيانات السوق' : 'Could not load market data'}</strong>
          <span>{ar ? 'يرجى تحديث الصفحة.' : 'Please refresh the page.'}</span>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th><button type="button" onClick={() => sortBy('mcap')}>#</button></th>
                {/* The homepage list has no star; on the full list it is the
                    only way to build a watchlist, so it leads the row where it
                    stays reachable instead of trailing off the scroll. */}
                <th><span className="sr-only">{ar ? 'متابعة' : 'Watch'}</span></th>
                <th>{ar ? 'الشركة' : 'Company'}</th>
                <th><button type="button" onClick={() => sortBy('price')}>{ar ? 'آخر سعر' : 'Last'}</button></th>
                <th><button type="button" onClick={() => sortBy('change')}>{ar ? 'التغير' : 'Change'}</button></th>
                <th><button type="button" onClick={() => sortBy('volume')}>{ar ? 'الحجم' : 'Volume'}</button></th>
                <th><button type="button" onClick={() => sortBy('mcap')}>{ar ? 'القيمة السوقية' : 'Mkt cap'}</button></th>
                <th><bdi>7D</bdi></th>
              </tr>
            </thead>
            <tbody>
              {/* Placeholder rows rather than a fixed-height grey box: the box
                  was 420px and the table that replaced it is several times
                  that, so everything below it still jumped. */}
              {loading && !rows.length ? (
                <SkeletonTableRows
                  rows={20}
                  columns={8}
                  withLogo={false}
                  labels={['#', ar ? 'متابعة' : 'Watch', ar ? 'الشركة' : 'Company', ar ? 'آخر سعر' : 'Last', ar ? 'التغير' : 'Change', ar ? 'الحجم' : 'Volume', ar ? 'القيمة السوقية' : 'Mkt cap', '7D']}
                />
              ) : null}
              {rows.map((company, i) => (
                <tr key={company.sym} className="row-link">
                  <td data-label="#"><bdi className="num-roll">{i + 1}</bdi></td>
                  <td className="watch-cell" data-label={ar ? 'متابعة' : 'Watch'}>
                    <button
                      type="button"
                      className={watchlist.includes(company.sym) ? 'watch-star is-on' : 'watch-star'}
                      aria-pressed={watchlist.includes(company.sym)}
                      aria-label={ar ? `متابعة ${company.sym}` : `Watch ${company.sym}`}
                      onClick={() => toggleWatchlist(company.sym)}
                    >
                      ★
                    </button>
                  </td>
                  <td data-label={ar ? 'الشركة' : 'Company'}>
                    <Link className="company-cell" href={`/c/${company.sym}`}>
                      <CompanyLogo className="logo-chip" sym={company.sym} logo={company.logo} />
                      <span>
                        <strong>{companyName(company, ar)}</strong>
                        <small>{sectorLabel(company.sec)} · <bdi>{company.sym}</bdi></small>
                      </span>
                    </Link>
                  </td>
                  <td data-label={ar ? 'آخر سعر' : 'Last'} title={lastTradeNote(company, ar)}>
                    <span className="stacked-cell">
                      <bdi className="num-roll">{priceFormat.format(company.close)} IQD</bdi>
                      {/* Anything older than a session gets its date printed.
                          Five days is the screener's threshold too — below that
                          the date is noise, above it the price needs a caveat
                          the reader can actually see. */}
                      {company.stale && company.lastTrade && daysSinceTrade(company) > 5
                        ? <small><bdi>{arDate(company.lastTrade)}</bdi></small>
                        : null}
                    </span>
                  </td>
                  {/* A name that did not trade has no move to report — printing
                      0.00% would read as "flat today". */}
                  <td data-label={ar ? 'التغير' : 'Change'} className={company.stale ? '' : company.pct >= 0 ? 'gain' : 'loss'}>
                    {company.stale
                      ? <span className="stale-flag" title={lastTradeNote(company, ar)}>—</span>
                      : <bdi className="num-roll">{company.pct > 0 ? '+' : ''}{company.pct.toFixed(2)}%</bdi>}
                  </td>
                  <td data-label={ar ? 'الحجم' : 'Volume'}>
                    {company.stale
                      ? <span className="stale-flag" title={lastTradeNote(company, ar)}>·</span>
                      : <bdi className="num-roll">{compact.format(company.shares_traded ?? 0)}</bdi>}
                  </td>
                  {/* Market cap is close x share count. For a suspended name
                      that close is years old, so the product is not a current
                      market cap and printing one put dead banks among the
                      largest companies on the exchange. Suppressed rather than
                      guessed — the share count alone is not a valuation. */}
                  <td data-label={ar ? 'القيمة السوقية' : 'Mkt cap'}>
                    {!isSuspended(company) && liveMcap(company) > 0
                      ? <bdi className="num-roll">{compact.format(liveMcap(company))} IQD</bdi>
                      : <span className="stale-flag" title={lastTradeNote(company, ar)}>·</span>}
                  </td>
                  <td data-label="7D">
                    {sparks[company.sym]?.length > 1
                      ? <Sparkline values={sparks[company.sym]} positive={company.pct >= 0} />
                      : <span className="spark-empty" aria-label={ar ? 'لا يوجد سجل كافٍ' : 'Not enough history'}>·</span>}
                  </td>
                </tr>
              ))}
              {!rows.length && !loading ? (
                <tr><td colSpan={8}>
                  <div className="empty-state">
                    <strong>{ar ? 'لا توجد نتائج' : 'No results'}</strong>
                    <span>{ar ? 'غيّر القطاع أو امسح البحث.' : 'Change the sector or clear the search.'}</span>
                  </div>
                </td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}

      <p className="page-footnote">
        {ar
          ? 'البيانات مُحدَّثة كل 30 دقيقة خلال ساعات التداول · المصدر: نشرات بورصة العراق الرسمية.'
          : 'Data refreshes every 30 minutes during trading hours · source: official ISX bulletins.'}
      </p>
    </main>
  )
}
