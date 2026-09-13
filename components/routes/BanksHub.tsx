'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useLocale } from '@/context/LocaleContext'
import { CompanyLogo } from '@/components/CompanyLogo'
import companiesData from '@/public/data/companies.json'
import type { Bank, ProductRow, ServiceRow, BankFinancials, Coverage } from '@/lib/banks'
import '@/styles/banks.css'

/**
 * /banks — what each bank actually gives you.
 *
 * The first version of this page was a twelve-column table. It was accurate
 * and nobody could read it: the thing a reader wants — «هل ينشر هذا المصرف
 * سعر فائدة، وكم هو؟» — was a count in a column called "published products",
 * three columns from the name.
 *
 * So the card leads with the REAL published numbers, up to three of them, in
 * the bank's own product names. Everything else on the card — type, assets,
 * verification date — sits under them.
 *
 * The organising fact has not changed and the design has to carry it: most
 * Iraqi banking terms are not published. Rafidain gives rates, ceilings and
 * conditions; Bank of Baghdad publishes 105 financial facts through the
 * exchange and not one retail term; Rasheed's site does not resolve at all.
 * Those are three different situations and the card says which, in words,
 * rather than rendering all three as an empty space.
 */

export interface HubBank {
  bank: Bank
  products: ProductRow[]
  services: ServiceRow[]
  coverage: Coverage
  financials?: BankFinancials
}

type Filter = 'all' | 'listed' | 'state' | 'private' | 'islamic'

type Listed = { sym: string; logo?: string; color?: string }
const LOGOS = new Map(
  (companiesData as Listed[]).map((c) => [c.sym, { logo: c.logo, color: c.color }]),
)

export function BanksHub({ rows }: { rows: HubBank[] }) {
  const { t: T, locale, href: L } = useLocale()
  const c = T.banks
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')

  /* Banks that publish something come first. Not a ranking of the banks —
     the note under the grid says so — but four "nothing published" cards
     above the one bank with a full rate card was a page that hid its own
     content. Within a group, alphabetical by the name being displayed. */
  const ordered = useMemo(() => {
    const rank: Record<Coverage, number> = { rich: 0, partial: 1, 'named-only': 2, none: 3, unreachable: 4 }
    return [...rows].sort((a, b) =>
      rank[a.coverage] - rank[b.coverage] ||
      (locale === 'ar' ? a.bank.name_ar.localeCompare(b.bank.name_ar, 'ar')
        : a.bank.name_en.localeCompare(b.bank.name_en, 'en')))
  }, [rows, locale])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return ordered.filter((r) => {
      if (q && !`${r.bank.name_ar} ${r.bank.name_en} ${r.bank.ticker ?? ''}`.toLowerCase().includes(q)) return false
      if (filter === 'all') return true
      if (filter === 'listed') return Boolean(r.bank.ticker)
      if (filter === 'islamic') return r.bank.bank_type === 'islamic'
      return r.bank.ownership === filter
    })
  }, [ordered, filter, query])

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
      <header className="bk-hero">
        <h1>{c.title}</h1>
        <p>{c.standfirst}</p>
        <dl className="bk-stats">
          <div><dt>{c.totalBanks}</dt><dd><bdi>{stats.total}</bdi></dd></div>
          <div><dt>{c.listedBanks}</dt><dd><bdi>{stats.listed}</bdi></dd></div>
          <div><dt>{c.withProducts}</dt><dd><bdi>{stats.publishing}</bdi></dd></div>
          <div><dt>{c.islamicBanks}</dt><dd><bdi>{stats.islamic}</bdi></dd></div>
        </dl>
      </header>

      <div className="bk-controls">
        <div className="bk-search">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.6" />
            <path d="M11 11l3.2 3.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <input
            type="search" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder={c.searchPlaceholder} aria-label={c.searchPlaceholder}
          />
        </div>
        <div className="bk-filters" role="group" aria-label={c.filterGroup}>
          {FILTERS.map((f) => (
            <button key={f.id} type="button" className={filter === f.id ? 'active' : ''}
              aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>{f.label}</button>
          ))}
        </div>
      </div>

      {shown.length ? (
        <div className="bk-grid">
          {shown.map((row) => <BankCard key={row.bank.slug} row={row} locale={locale} c={c} L={L} />)}
        </div>
      ) : (
        <p className="bk-none">{c.noMatch}</p>
      )}

      <p className="bk-note">{c.coverageNote}</p>
    </main>
  )
}

function BankCard({ row, locale, c, L }: {
  row: HubBank; locale: 'ar' | 'en'; c: any; L: (p: string) => string
}) {
  const { bank, products, coverage, financials } = row
  const name = locale === 'ar' ? bank.name_ar : bank.name_en
  const art = bank.ticker ? LOGOS.get(bank.ticker) : undefined
  const terms = headlineTerms(products, locale).slice(0, 3)
  const fin = financials?.values

  return (
    <article className="bk-card">
      <div className="bk-card-top">
        <CompanyLogo
          className="bk-mark" sym={bank.ticker ?? initials(bank.name_en)}
          logo={art?.logo} color={art?.color ?? tint(bank.slug)} letters={bank.ticker ? 2 : 3}
        />
        <div className="bk-card-id">
          <h2><Link href={L(`/banks/${bank.slug}`)}>{name}</Link></h2>
          <p className="bk-meta">
            <span>{c.type[bank.bank_type]} · {c.ownership[bank.ownership]}</span>
            {bank.ticker ? <bdi className="bk-ticker">{bank.ticker}</bdi> : null}
          </p>
        </div>
      </div>

      {/* The answer, before the explanation. */}
      {terms.length ? (
        <div className="bk-terms">
          {terms.map((t) => (
            <div className="bk-term" key={t.key}>
              <span>{t.label}</span>
              <strong><bdi>{t.value}</bdi>{t.note ? <em> {t.note}</em> : null}</strong>
            </div>
          ))}
        </div>
      ) : (
        <p className={`bk-empty${coverage === 'unreachable' ? ' is-unreachable' : ''}`}>
          {c.coverage[coverage]}
        </p>
      )}

      <div className="bk-card-foot">
        {fin ? (
          <div className="bk-figs">
            {fin.total_assets != null ? (
              <div>{c.colAssets}<b><bdi>{iqd(fin.total_assets)}</bdi></b></div>
            ) : null}
            {fin.customer_deposits != null ? (
              <div>{c.colDeposits}<b><bdi>{iqd(fin.customer_deposits)}</bdi></b></div>
            ) : null}
          </div>
        ) : (
          <div className="bk-figs"><div>{c.productsLabel}<b><bdi>{products.length}</bdi></b></div></div>
        )}
        {/* The chip repeats what the empty state already said in a full
            sentence, so it only appears when there are terms above it. */}
        {terms.length ? <CoverageChip coverage={coverage} /> : null}
      </div>
    </article>
  )
}

/* ── the numbers a reader came for ────────────────────────────────────────
   Only PUBLISHED rates. A product whose rate we do not have contributes
   nothing here rather than a zero or a dash — the card's empty state says
   what happened instead, once, in words. */
export function headlineTerms(products: ProductRow[], locale: 'ar' | 'en') {
  const out: { key: string; label: string; value: string; note?: string }[] = []
  for (const p of products) {
    const label = locale === 'ar' ? p.name_ar : p.name_en
    if (p.rate != null) out.push({ key: p.slug, label, value: `${p.rate}%` })
    else if (p.rate_from != null && p.rate_to != null) {
      out.push({
        key: p.slug, label,
        value: p.rate_from === p.rate_to ? `${p.rate_from}%` : `${p.rate_from}% – ${p.rate_to}%`,
      })
    }
  }
  return out
}

export function CoverageChip({ coverage }: { coverage: Coverage }) {
  const { t: T } = useLocale()
  return <span className={`bk-cov bk-cov-${coverage}`}>{T.banks.coverage[coverage]}</span>
}

/** Initials for a bank with no ticker — Rafidain, Rasheed, TBI. */
export function initials(en: string): string {
  return en.replace(/\b(bank|of|for|the|and)\b/gi, ' ').trim().slice(0, 3).toUpperCase() || 'BK'
}

/** A stable colour per bank, so an unlisted bank still has an identity. */
function tint(slug: string): string {
  let h = 0
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) % 360
  return `hsl(${h} 42% 38%)`
}

/** Compact dinars. Balance sheets run to trillions; the profile shows exact. */
export function iqd(v: number): string {
  const a = Math.abs(v)
  if (a >= 1e12) return `${(v / 1e12).toFixed(2)}T`
  if (a >= 1e9) return `${(v / 1e9).toFixed(2)}B`
  if (a >= 1e6) return `${(v / 1e6).toFixed(1)}M`
  if (a >= 1e3) return `${(v / 1e3).toFixed(0)}K`
  return String(Math.round(v))
}
