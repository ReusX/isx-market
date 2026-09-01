'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useLocale } from '@/context/LocaleContext'
import type { Bank, ProductRow, ServiceRow, BankFinancials, Coverage } from '@/lib/banks'
import '@/styles/banks.css'

/**
 * /banks — a research surface, not a directory.
 *
 * The organising fact about Iraqi banking data is that most of it is not
 * published. Rafidain gives rates, ceilings and conditions; Bank of Baghdad
 * publishes 105 financial facts through the exchange and not one retail term;
 * Rasheed's site does not resolve at all. A table that renders all three as
 * rows of «—» would say the same thing about three different situations.
 *
 * So the last column is what the bank publishes, in words. It is a
 * DESCRIPTION, not a score: a bank that publishes little is not a worse bank,
 * and the note under the table says so, because a column that looks like a
 * rating will be read as one.
 */

export interface HubBank {
  bank: Bank
  products: ProductRow[]
  services: ServiceRow[]
  coverage: Coverage
  financials?: BankFinancials
}

type Filter = 'all' | 'listed' | 'state' | 'private' | 'islamic'

export function BanksHub({ rows }: { rows: HubBank[] }) {
  const { t: T, locale, href: L } = useLocale()
  const c = T.banks
  const [filter, setFilter] = useState<Filter>('all')

  const shown = useMemo(() => rows.filter((r) => {
    if (filter === 'all') return true
    if (filter === 'listed') return Boolean(r.bank.ticker)
    if (filter === 'islamic') return r.bank.bank_type === 'islamic'
    return r.bank.ownership === filter
  }), [rows, filter])

  const stats = useMemo(() => ({
    total: rows.length,
    listed: rows.filter((r) => r.bank.ticker).length,
    publishing: rows.filter((r) => r.coverage === 'rich' || r.coverage === 'partial').length,
    islamic: rows.filter((r) => r.bank.bank_type === 'islamic').length,
  }), [rows])

  const FILTERS: { id: Filter; label: string }[] = [
    { id: 'all', label: c.filterAll },
    { id: 'listed', label: c.filterListed },
    { id: 'state', label: c.filterState },
    { id: 'private', label: c.filterPrivate },
    { id: 'islamic', label: c.filterIslamic },
  ]

  return (
    <main className="iq-page bk-page">
      <header className="bk-head">
        <div>
          <h1>{c.title}</h1>
          <p>{c.standfirst}</p>
        </div>
        <dl className="bk-stats">
          <div><dt>{c.totalBanks}</dt><dd><bdi>{stats.total}</bdi></dd></div>
          <div><dt>{c.listedBanks}</dt><dd><bdi>{stats.listed}</bdi></dd></div>
          <div><dt>{c.withProducts}</dt><dd><bdi>{stats.publishing}</bdi></dd></div>
          <div><dt>{c.islamicBanks}</dt><dd><bdi>{stats.islamic}</bdi></dd></div>
        </dl>
      </header>

      <div className="bk-filters" role="group" aria-label={c.filterGroup}>
        {FILTERS.map((f) => (
          <button key={f.id} type="button" className={filter === f.id ? 'active' : ''}
            aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>{f.label}</button>
        ))}
      </div>

      <div className="bk-table-wrap">
        <table className="bk-table">
          <thead>
            <tr>
              <th scope="col">{c.colBank}</th>
              <th scope="col">{c.colType}</th>
              <th scope="col" className="num">{c.colAssets}</th>
              <th scope="col" className="num">{c.colDeposits}</th>
              <th scope="col" className="num">{c.colProducts}</th>
              <th scope="col">{c.colCoverage}</th>
            </tr>
          </thead>
          <tbody>
            {shown.map(({ bank, products, coverage, financials }) => (
              <tr key={bank.slug}>
                <th scope="row">
                  <Link href={L(`/banks/${bank.slug}`)}>
                    {locale === 'ar' ? bank.name_ar : bank.name_en}
                  </Link>
                  {bank.ticker ? <bdi className="bk-ticker">{bank.ticker}</bdi> : null}
                </th>
                <td>
                  <span className="bk-type">{c.type[bank.bank_type]}</span>
                  <small>{c.ownership[bank.ownership]}</small>
                </td>
                {/* Financial columns exist only for listed banks, and are read
                    from the exchange disclosures — never stored on the bank. */}
                <td className="num">{financials?.values.total_assets != null
                  ? <bdi>{iqd(financials.values.total_assets)}</bdi>
                  : <span className="bk-na">{bank.ticker ? '—' : c.notListed}</span>}</td>
                <td className="num">{financials?.values.customer_deposits != null
                  ? <bdi>{iqd(financials.values.customer_deposits)}</bdi>
                  : <span className="bk-na">{bank.ticker ? '—' : c.notListed}</span>}</td>
                <td className="num"><bdi>{products.length || '—'}</bdi></td>
                <td><CoverageChip coverage={coverage} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="bk-note">{c.coverageNote}</p>
    </main>
  )
}

export function CoverageChip({ coverage }: { coverage: Coverage }) {
  const { t: T } = useLocale()
  return <span className={`bk-cov bk-cov-${coverage}`}>{T.banks.coverage[coverage]}</span>
}

/** Compact dinars. Bank balance sheets run to trillions; full digits in a
 *  table column are unreadable and the profile shows the exact figure. */
export function iqd(v: number): string {
  const a = Math.abs(v)
  if (a >= 1e12) return `${(v / 1e12).toFixed(2)}T`
  if (a >= 1e9) return `${(v / 1e9).toFixed(2)}B`
  if (a >= 1e6) return `${(v / 1e6).toFixed(1)}M`
  if (a >= 1e3) return `${(v / 1e3).toFixed(0)}K`
  return String(Math.round(v))
}
