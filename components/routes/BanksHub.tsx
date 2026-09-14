'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useLocale } from '@/context/LocaleContext'
import { CompanyLogo } from '@/components/CompanyLogo'
import companiesData from '@/public/data/companies.json'
import { localeDate } from '@/lib/date'
import { categoriesOf } from '@/lib/banks'
import type { Bank, ProductRow, ServiceRow, BankFinancials, Coverage } from '@/lib/banks'
import '@/styles/banks.css'

/**
 * /banks — the research surface over the whole CBI directory.
 *
 * Table-first on purpose. With seventy-nine entries the question a reader
 * arrives with is comparative — who is listed, who publishes anything, who is
 * in liquidation — and a grid of seventy-nine cards cannot be read down a
 * column. Rates are NOT here: one number per product only means anything with
 * its currency, tenor and conditions attached, and those belong on the profile.
 *
 * ── The counts in the header are deliberately three different numbers ─────
 * 79 directory entries, 64 operating, 20 publishing terms. Collapsing those
 * into "79 banks" would be the single most misleading thing this page could
 * say: six of the seventy-nine are in liquidation.
 */

export interface HubBank {
  bank: Bank
  products: ProductRow[]
  services: ServiceRow[]
  coverage: Coverage
  financials?: BankFinancials
}

type Filter = 'all' | 'listed' | 'state' | 'islamic' | 'foreign' | 'publishing'

const LOGOS = new Map(
  (companiesData as { sym: string; logo?: string; color?: string }[]).map((c) => [c.sym, c]),
)

export function BanksHub({ rows }: { rows: HubBank[] }) {
  const { t: T, locale, href: L } = useLocale()
  const c = T.banks
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')

  const publishes = (r: HubBank) => r.products.some((p) => p.known_facts > 0)

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows
      .filter((r) => {
        if (q && !`${r.bank.name_ar} ${r.bank.name_en} ${r.bank.ticker ?? ''}`.toLowerCase().includes(q)) return false
        if (filter === 'all') return true
        if (filter === 'listed') return Boolean(r.bank.ticker)
        if (filter === 'islamic') return r.bank.bank_type === 'islamic'
        if (filter === 'foreign') return r.bank.ownership === 'foreign'
        if (filter === 'publishing') return publishes(r)
        return r.bank.ownership === filter
      })
      /* Banks that publish something first, then listed banks, then the rest
         alphabetically. Not a ranking of banks — the note says so — but a
         table whose first forty rows are all «—» buries its own content. */
      .sort((a, b) =>
        Number(publishes(b)) - Number(publishes(a)) ||
        Number(Boolean(b.bank.ticker)) - Number(Boolean(a.bank.ticker)) ||
        (locale === 'ar'
          ? a.bank.name_ar.localeCompare(b.bank.name_ar, 'ar')
          : a.bank.name_en.localeCompare(b.bank.name_en, 'en')))
  }, [rows, filter, query, locale])

  const stats = useMemo(() => ({
    total: rows.length,
    operating: rows.filter((r) => r.bank.operating_status === 'operating').length,
    listed: rows.filter((r) => r.bank.ticker).length,
    publishing: rows.filter(publishes).length,
  }), [rows])

  const FILTERS: { id: Filter; label: string }[] = [
    { id: 'all', label: c.filterAll },
    { id: 'publishing', label: c.filterPublishing },
    { id: 'listed', label: c.filterListed },
    { id: 'state', label: c.filterState },
    { id: 'islamic', label: c.filterIslamic },
    { id: 'foreign', label: c.filterForeign },
  ]

  return (
    <main className="iq-page bk-page">
      <header className="bk-hero">
        <h1>{c.title}</h1>
        <p>{c.standfirst}</p>
        <dl className="bk-stats">
          <div><dt>{c.entriesLabel}</dt><dd><bdi>{stats.total}</bdi></dd></div>
          <div><dt>{c.operatingLabel}</dt><dd><bdi>{stats.operating}</bdi></dd></div>
          <div><dt>{c.listedBanks}</dt><dd><bdi>{stats.listed}</bdi></dd></div>
          <div><dt>{c.publishingLabel}</dt><dd><bdi>{stats.publishing}</bdi></dd></div>
        </dl>
        <p className="bk-note bk-note-tight">{c.countsNote}</p>
      </header>

      <div className="bk-controls">
        <div className="bk-search">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.6" />
            <path d="M11 11l3.2 3.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder={c.searchPlaceholder} aria-label={c.searchPlaceholder} />
        </div>
        <div className="bk-filters" role="group" aria-label={c.filterGroup}>
          {FILTERS.map((f) => (
            <button key={f.id} type="button" className={filter === f.id ? 'active' : ''}
              aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>{f.label}</button>
          ))}
        </div>
        <span className="bk-count"><bdi>{c.showingOf(String(shown.length), String(rows.length))}</bdi></span>
      </div>

      <div className="bk-table-wrap">
        <table className="bk-table">
          <thead>
            <tr>
              <th scope="col">{c.colBank}</th>
              <th scope="col">{c.colType}</th>
              <th scope="col">{c.colStatus}</th>
              <th scope="col" className="num">{c.colAssets}</th>
              <th scope="col" className="num">{c.colDeposits}</th>
              <th scope="col">{c.colCategories}</th>
              <th scope="col">{c.colServices}</th>
              <th scope="col">{c.colUpdated}</th>
            </tr>
          </thead>
          <tbody>
            {shown.map(({ bank, products, services, financials }) => {
              const art = bank.ticker ? LOGOS.get(bank.ticker) : undefined
              const cats = categoriesOf(products)
              const verified = services.filter((s) => s.availability === 'available')
              const checked = products.reduce<string | null>(
                (d, p) => (p.last_verified && (!d || p.last_verified > d) ? p.last_verified : d),
                bank.research_checked_at,
              )
              return (
                <tr key={bank.slug}>
                  <th scope="row">
                    <span className="bk-row-name">
                      <CompanyLogo className="bk-row-mark" sym={bank.ticker ?? bank.name_en.slice(0, 2)}
                        logo={art?.logo} color={art?.color ?? 'var(--mv-line-strong)'} letters={2} />
                      <Link href={L(`/banks/${bank.slug}`)}>
                        {locale === 'ar' ? bank.name_ar : bank.name_en}
                      </Link>
                      {bank.ticker ? <bdi className="bk-ticker">{bank.ticker}</bdi> : null}
                    </span>
                  </th>
                  <td>
                    <span className="bk-type">{c.type[bank.bank_type]}</span>
                    <small>{c.ownership[bank.ownership]}</small>
                  </td>
                  <td>
                    {bank.operating_status === 'operating'
                      ? <span className="bk-dim">{c.status.operating}</span>
                      : <span className={`bk-flag is-${bank.operating_status}`}>
                          {(locale === 'ar' ? bank.status_note_ar : bank.status_note_en) ?? c.status[bank.operating_status]}
                        </span>}
                    {bank.usd_restricted ? <small className="bk-flag-usd">{c.usdRestricted}</small> : null}
                  </td>
                  {/* Financial columns exist only for listed banks, and are read
                      from the exchange disclosures — never stored on the bank. */}
                  <td className="num">{financials?.values.total_assets != null
                    ? <bdi>{iqd(financials.values.total_assets)}</bdi>
                    : <span className="bk-na">{bank.ticker ? '—' : c.notListed}</span>}</td>
                  <td className="num">{financials?.values.customer_deposits != null
                    ? <bdi>{iqd(financials.values.customer_deposits)}</bdi>
                    : <span className="bk-na">{bank.ticker ? '—' : c.notListed}</span>}</td>
                  <td>
                    {cats.length ? (
                      <span className="bk-cats">
                        {cats.map((k) => <em key={k}>{k === 'deposits' ? c.catDeposits : c.catLoans}</em>)}
                      </span>
                    ) : <span className="bk-na">—</span>}
                  </td>
                  <td>
                    {verified.length
                      ? <bdi className="bk-svc-count">{verified.length}</bdi>
                      : <span className="bk-na">—</span>}
                  </td>
                  <td>
                    {checked
                      ? <bdi className="bk-dim">{localeDate(checked, locale)}</bdi>
                      : <span className="bk-na">—</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {!shown.length ? <p className="bk-none">{c.noMatch}</p> : null}
      <p className="bk-note">{c.coverageNote}</p>
    </main>
  )
}

export function CoverageChip({ coverage }: { coverage: Coverage }) {
  const { t: T } = useLocale()
  return <span className={`bk-cov bk-cov-${coverage}`}>{T.banks.coverage[coverage]}</span>
}

/** Compact dinars. Balance sheets run to trillions; the profile shows exact. */
export function iqd(v: number, unit: string | null = 'iqd'): string {
  const a = Math.abs(v)
  const n = a >= 1e12 ? `${(v / 1e12).toFixed(2)}T`
    : a >= 1e9 ? `${(v / 1e9).toFixed(2)}B`
      : a >= 1e6 ? `${(v / 1e6).toFixed(1)}M`
        : a >= 1e3 ? `${(v / 1e3).toFixed(0)}K`
          : String(Math.round(v))
  /* A minimum deposit of 20,000 on a USD product is not 20,000 dinars, so a
     fact that overrides its unit gets the currency printed with it. */
  return unit === 'usd' ? `$${n}` : n
}
