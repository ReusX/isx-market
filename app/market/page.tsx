'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useApp } from '@/context/AppContext'
import { fetchLive, fetchCompanyMeta, mergeCompanies, liveMcap, SECTORS } from '@/lib/market'
import { fetchSparklines } from '@/lib/sparks'
import { CompanyLogo } from '@/components/CompanyLogo'
import { Sparkline } from '@/components/design/Sparkline'
import { SectorChip } from '@/components/design/SectorChip'
import { Card } from '@/components/design/ui'
import type { Company } from '@/types'

type Movement = 'all' | 'up' | 'flat' | 'down'
type SortKey = 'mcap' | 'price' | 'change' | 'volume'

const companyName = (c: Company, ar: boolean) => (ar ? c.ar || c.en : c.en || c.ar) || c.sym

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
  const [movement, setMovement] = useState<Movement>('all')
  const [sortKey, setSortKey] = useState<SortKey>('mcap') // same default as the homepage list
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

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

  const rows = useMemo(() => {
    let data = listed
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
      : liveMcap(c)
    return [...data].sort((a, b) => (sortDir === 'asc' ? val(a) - val(b) : val(b) - val(a)))
  }, [listed, sector, onlyWatchlist, watchlist, query, movement, sortKey, sortDir])

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

      {failed ? (
        <div className="empty-state">
          <strong>{ar ? 'تعذّر تحميل بيانات السوق' : 'Could not load market data'}</strong>
          <span>{ar ? 'يرجى تحديث الصفحة.' : 'Please refresh the page.'}</span>
        </div>
      ) : loading ? (
        <div className="skeleton" style={{ height: 420, borderRadius: 7 }} />
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
                  <td data-label={ar ? 'آخر سعر' : 'Last'}><bdi className="num-roll">{priceFormat.format(company.close)} IQD</bdi></td>
                  {/* A name that did not trade has no move to report — printing
                      0.00% would read as "flat today". */}
                  <td data-label={ar ? 'التغير' : 'Change'} className={company.stale ? '' : company.pct >= 0 ? 'gain' : 'loss'}>
                    {company.stale
                      ? <span className="stale-flag" title={ar ? 'لم يتداول في الجلسة الأخيرة' : 'Did not trade in the latest session'}>—</span>
                      : <bdi className="num-roll">{company.pct > 0 ? '+' : ''}{company.pct.toFixed(2)}%</bdi>}
                  </td>
                  <td data-label={ar ? 'الحجم' : 'Volume'}><bdi className="num-roll">{compact.format(company.shares_traded ?? 0)}</bdi></td>
                  <td data-label={ar ? 'القيمة السوقية' : 'Mkt cap'}>
                    {liveMcap(company) > 0
                      ? <bdi className="num-roll">{compact.format(liveMcap(company))} IQD</bdi>
                      : <bdi className="num-roll">·</bdi>}
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
