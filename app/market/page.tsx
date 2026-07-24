'use client'

import { useEffect, useMemo, useState } from 'react'
import { useApp } from '@/context/AppContext'
import { fetchLive, fetchCompanyMeta, mergeCompanies, liveMcap, SECTORS } from '@/lib/market'
import { DataTable, type TableColumn } from '@/components/design/DataTable'
import { CompanyIdentity } from '@/components/design/CompanyIdentity'
import { SectorChip } from '@/components/design/SectorChip'
import { Card, ChangeValue } from '@/components/design/ui'
import type { Company } from '@/types'

const compactFormat = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 })
const numberFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const priceFormat = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 3 })

export default function MarketPage() {
  const { lang, watchlist, toggleWatchlist } = useApp()
  const ar = lang === 'ar'

  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [sector, setSector] = useState('all')
  const [query, setQuery] = useState('')
  const [onlyWatchlist, setOnlyWatchlist] = useState(false)

  useEffect(() => {
    Promise.all([fetchLive(), fetchCompanyMeta()])
      .then(([live, meta]) => setCompanies(mergeCompanies(meta, live.stocks)))
      .catch(() => setFailed(true))
      .finally(() => setLoading(false))
  }, [])

  const listed = useMemo(() => companies.filter(c => c.close > 0), [companies])

  const rows = useMemo(() => {
    let data = listed
    if (sector !== 'all') data = data.filter(c => c.sec === sector)
    if (onlyWatchlist) data = data.filter(c => watchlist.includes(c.sym))
    const q = query.trim().toLowerCase()
    if (q) {
      data = data.filter(c =>
        c.sym.toLowerCase().includes(q) ||
        (c.en ?? '').toLowerCase().includes(q) ||
        (c.ar ?? '').includes(query.trim()),
      )
    }
    return data
  }, [listed, sector, onlyWatchlist, watchlist, query])

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

  const sectorLabel = (id: string) => SECTORS.find(s => s.id === id)

  const columns: TableColumn<Company>[] = [
    {
      key: 'company',
      label: ar ? 'الشركة' : 'Company',
      className: 'market-company-column',
      linked: true,
      sortValue: c => (ar ? c.ar : c.en) || c.sym,
      render: c => <CompanyIdentity name={(ar ? c.ar : c.en) || c.sym} symbol={c.sym} logo={c.logo} color={c.color} />,
    },
    {
      key: 'sector',
      label: ar ? 'القطاع' : 'Sector',
      sortValue: c => c.sec,
      render: c => {
        const s = sectorLabel(c.sec)
        return <span>{s ? (ar ? s.ar : s.en) : c.sec}</span>
      },
    },
    {
      key: 'marketCap',
      label: ar ? 'القيمة السوقية' : 'Mkt Cap',
      className: 'numeric-column',
      sortValue: c => liveMcap(c),
      render: c => <bdi>{compactFormat.format(liveMcap(c))} IQD</bdi>,
    },
    {
      key: 'volume',
      label: ar ? 'الحجم' : 'Volume',
      className: 'numeric-column',
      sortValue: c => c.vol ?? 0,
      render: c => <bdi>{numberFormat.format(c.vol ?? 0)}</bdi>,
    },
    {
      key: 'price',
      label: ar ? 'السعر' : 'Price',
      className: 'numeric-column',
      sortValue: c => c.close,
      render: c => <bdi>{priceFormat.format(c.close)}</bdi>,
    },
    {
      key: 'change',
      label: ar ? 'التغير' : 'Change',
      className: 'numeric-column',
      sortValue: c => c.pct,
      render: c => (c.stale
        ? <span className="stale-flag" title={ar ? 'لم يتداول في الجلسة الأخيرة' : 'Did not trade in the latest session'}>—</span>
        : <ChangeValue value={c.pct} />),
    },
    {
      key: 'watch',
      label: '',
      className: 'watch-column',
      render: c => (
        <button
          type="button"
          className={watchlist.includes(c.sym) ? 'watch-star is-on' : 'watch-star'}
          aria-pressed={watchlist.includes(c.sym)}
          aria-label={ar ? `متابعة ${c.sym}` : `Watch ${c.sym}`}
          onClick={event => { event.stopPropagation(); toggleWatchlist(c.sym) }}
        >
          ★
        </button>
      ),
    },
  ]

  return (
    <main className="terminal-shell app-page market-movement-page">
      <Card className="market-movement-header">
        <div>
          <span className="app-eyebrow">{ar ? 'حركة السوق' : 'Market movement'}</span>
          <h1>{ar ? 'جميع الشركات المدرجة' : 'All listed companies'}</h1>
        </div>
        <div className="market-counts" aria-label={ar ? 'ملخص حركة الشركات' : 'Breadth summary'}>
          <span className="positive"><bdi>{counts.advancers}</bdi><small>{ar ? 'رابح' : 'up'}</small></span>
          <span><bdi>{counts.unchanged}</bdi><small>{ar ? 'ثابت' : 'flat'}</small></span>
          <span className="negative"><bdi>{counts.decliners}</bdi><small>{ar ? 'خاسر' : 'down'}</small></span>
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

      <Card className="market-table-card">
        {failed ? (
          <div className="empty-state">
            <strong>{ar ? 'تعذّر تحميل بيانات السوق' : 'Could not load market data'}</strong>
            <span>{ar ? 'يرجى تحديث الصفحة.' : 'Please refresh the page.'}</span>
          </div>
        ) : (
          <DataTable
            rows={rows}
            columns={columns}
            loading={loading}
            rowKey={c => c.sym}
            rowHref={c => `/c/${c.sym}`}
            gridTemplateColumns="minmax(0, 1fr) 90px 130px 110px 90px 90px 40px"
            minWidth="820px"
            // Company lists open on market capitalisation, largest first.
            initialSort={{ key: 'marketCap', direction: 'desc' }}
            emptyTitle={ar ? 'لا توجد نتائج' : 'No results'}
            emptyDescription={ar ? 'غيّر القطاع أو امسح البحث.' : 'Change the sector or clear the search.'}
          />
        )}
      </Card>

      <p className="page-footnote">
        {ar
          ? 'البيانات مُحدَّثة كل 30 دقيقة خلال ساعات التداول · المصدر: نشرات بورصة العراق الرسمية.'
          : 'Data refreshes every 30 minutes during trading hours · source: official ISX bulletins.'}
      </p>
    </main>
  )
}
