'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useLocale } from '@/context/LocaleContext'
import { CompanyLogo } from '@/components/CompanyLogo'
import companiesData from '@/public/data/companies.json'
import { categoriesOf } from '@/lib/banks'
import type { Bank, ProductRow, ServiceRow, BankFinancials, Coverage } from '@/lib/banks'
import {
  editorialCoverage, headlineProduct, ratedCategoryCount, type EditorialProfile,
} from '@/lib/bankEditorial'
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
  editorial: EditorialProfile | null
}

type Filter = 'all' | 'listed' | 'state' | 'islamic' | 'foreign' | 'publishing' | 'rated'
const COV_RANK = { overall: 0, partial: 1, products: 2, limited: 3 } as const

const LOGOS = new Map(
  (companiesData as { sym: string; logo?: string; color?: string }[]).map((c) => [c.sym, c]),
)

export function BanksHub({ rows }: { rows: HubBank[] }) {
  const { t: T, locale, href: L } = useLocale()
  const c = T.banks
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')

  const publishes = (r: HubBank) => Boolean(r.editorial?.products.length) || r.products.some((p) => p.known_facts > 0)
  const rated = (r: HubBank) => Boolean(r.editorial) && ratedCategoryCount(r.editorial!) > 0

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
        if (filter === 'rated') return rated(r)
        return r.bank.ownership === filter
      })
      /* Most-researched first — an overall figure, then partial scores, then
         reviewed products, then directory-only — then listed, then name. Not
         a ranking of banks: the note under the table says so, and the two
         overall figures are never compared across the sector. A table whose
         first forty rows say «أدلة محدودة» would bury its own content. */
      .sort((a, b) =>
        COV_RANK[editorialCoverage(a.editorial)] - COV_RANK[editorialCoverage(b.editorial)] ||
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
    { id: 'rated', label: c.filterRated },
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
      </div>

      <div className="bk-table-wrap">
        <table className="bk-table bk-table-lean">
          <thead>
            <tr>
              <th scope="col">{c.colBank}</th>
              <th scope="col">{c.ed.colRating}</th>
              <th scope="col">{c.ed.colProduct}</th>
              <th scope="col" className="num">{c.ed.colRate}</th>
            </tr>
          </thead>
          <tbody>
            {shown.map(({ bank, products, editorial: ed }) => {
              const art = bank.ticker ? LOGOS.get(bank.ticker) : undefined
              const cov = editorialCoverage(ed)
              const overall = ed?.ratings.overall ?? null
              const mobile = ed?.ratings.categories.mobile?.score ?? null
              const pick = headlineProduct(ed)
              const pickRow = pick ? products.find((p) => p.slug === pick.slug) : null
              const special = bank.operating_status !== 'operating'
              return (
                <tr key={bank.slug} className={`is-cov-${cov}`}>
                  <th scope="row">
                    <span className="bk-row-name">
                      <CompanyLogo className="bk-row-mark" sym={bank.ticker ?? bank.name_en.slice(0, 2)}
                        logo={art?.logo} color={art?.color ?? 'var(--mv-line-strong)'} letters={2} />
                      <Link href={L(`/banks/${bank.slug}`)}>{locale === 'ar' ? bank.name_ar : bank.name_en}</Link>
                    </span>
                    <small className="bk-row-type">
                      {c.type[bank.bank_type]} · {c.ownership[bank.ownership]}
                      {/* Status only when there is one to show. */}
                      {special ? (
                        <span className={`bk-flag is-${bank.operating_status}`}>
                          {(locale === 'ar' ? bank.status_note_ar : bank.status_note_en) ?? c.status[bank.operating_status]}
                        </span>
                      ) : null}
                      {bank.usd_restricted ? <span className="bk-flag is-usd">{c.usdRestricted}</span> : null}
                    </small>
                  </th>
                  {/* One number. The overall where the package gives one, the app
                      score where that is all there is, a word where there is
                      nothing — never a store's stars. */}
                  <td>
                    {overall !== null ? (
                      <span className="bk-cell-rating">
                        <b><bdi>{overall}</bdi></b><small>/10 · {c.ed.coverage.overall}</small>
                      </span>
                    ) : mobile !== null ? (
                      <span className="bk-cell-rating is-partial">
                        <b><bdi>{mobile}</bdi></b><small>/5 · {c.ed.category.mobile}</small>
                      </span>
                    ) : (
                      <span className="bk-na">{c.ed.coverage[cov === 'limited' ? 'limited' : 'products']}</span>
                    )}
                  </td>
                  <td>
                    {pick
                      ? <span className="bk-cell-product">{locale === 'ar' ? pick.name : (pickRow?.name_en ?? pick.name)}</span>
                      : <span className="bk-na">—</span>}
                  </td>
                  <td className="num">
                    {pick?.rate ? (
                      <span className="bk-cell-rate">
                        <b><bdi>{pick.rate.value}%</bdi></b>
                        <small>{c.ed.basis[pick.rate.basis]}</small>
                      </span>
                    ) : <span className="bk-na">—</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {!shown.length ? <p className="bk-none">{c.noMatch}</p> : null}
      <p className="bk-note">{c.ed.hubFoot}</p>
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
