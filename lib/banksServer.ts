import { cache } from 'react'
import companiesData from '@/public/data/companies.json'
import {
  listBanks, listProducts, listServices, bankFinancials, coverageOf, getBank, productDetail, indexability,
  type Bank, type ProductRow, type Coverage, type ServiceRow, type FactRow, type ConditionRow, type BankFinancials,
} from '@/lib/banks'
import { editorialFor, type EditorialProfile } from '@/lib/bankEditorial'

/**
 * The banking hub's rows, built on the server and flat enough for the wire.
 *
 * `lib/banks` reads the current-views over bare PostgREST (its own fetch
 * with `next.revalidate`, so the route stays static). This file only
 * shapes what the hub table needs — one row per bank, a handful of facts —
 * and never the editorial prose or the product facts, which belong to the
 * profile page.
 */
export type HubRow = {
  slug: string
  ar: string; en: string
  type: Bank['bank_type']
  ownership: Bank['ownership']
  status: Bank['operating_status']
  usd: boolean
  ticker: string | null
  logo: string | null
  founded: number | null
  city: string | null
  research: Bank['research_state']
  coverage: Coverage
  /** What the bank publishes, as categories. */
  deposits: boolean
  loans: boolean
  /** Services confirmed available, out of those checked. */
  services: { on: number; checked: number }
  /** Latest filed total assets (IQD) for listed banks, and the filing year. */
  assets: number | null
  finYear: number | null
  /** Editorial rating where one exists. */
  rating: { overall: number; outOf: number } | null
}

/** A published term-deposit rate, for the hub's deposits strip. */
export type DepositLead = {
  slug: string; ar: string; en: string
  nameAr: string; nameEn: string
  rate: number; rateTo: number | null
  termMonths: number | null
  currency: string
  islamic: boolean
}

export type BanksInitial = {
  rows: HubRow[]
  deposits: DepositLead[]
  counts: { total: number; listed: number; usd: number; guardianship: number; liquidation: number; publishing: number }
}

const LOGO = new Map((companiesData as { sym: string; logo?: string }[]).map((c) => [c.sym, c.logo && !/placeholder/.test(c.logo) ? c.logo : null]))

const isDeposit = (p: ProductRow) => p.kind.startsWith('deposit') || p.kind === 'account_current'

export const loadBanksHub = cache(async (): Promise<BanksInitial> => {
  const [banks, products, services] = await Promise.all([listBanks(), listProducts(), listServices()])
  const fin = await bankFinancials(banks.map((b) => b.ticker).filter(Boolean) as string[])

  const rows: HubRow[] = banks.map((b) => {
    const p = products.filter((x) => x.bank_slug === b.slug)
    const s = services.filter((x) => x.bank_slug === b.slug)
    const f = b.ticker ? fin.get(b.ticker) : undefined
    const ed = editorialFor(b.slug)
    return {
      slug: b.slug, ar: b.name_ar, en: b.name_en,
      type: b.bank_type, ownership: b.ownership, status: b.operating_status,
      usd: b.usd_restricted === true,
      ticker: b.ticker, logo: b.ticker ? LOGO.get(b.ticker) ?? null : null,
      founded: b.founded, city: b.hq_city, research: b.research_state,
      coverage: coverageOf(b, p),
      deposits: p.some(isDeposit), loans: p.some((x) => !isDeposit(x)),
      services: { on: s.filter((x) => x.availability === 'available').length, checked: s.length },
      assets: f?.values.total_assets ?? null, finYear: f?.fiscalYear ?? null,
      rating: ed?.ratings.overall != null ? { overall: ed.ratings.overall, outOf: ed.ratings.outOf } : null,
    }
  })

  const bySlug = new Map(banks.map((b) => [b.slug, b]))
  const deposits: DepositLead[] = products
    .filter((p) => p.kind === 'deposit_term' && (p.rate ?? p.rate_from) != null)
    .map((p) => {
      const b = bySlug.get(p.bank_slug)!
      return {
        slug: p.bank_slug, ar: b.name_ar, en: b.name_en,
        nameAr: p.name_ar, nameEn: p.name_en,
        rate: (p.rate ?? p.rate_from) as number,
        /* A range only when the ends differ; «9–9%» is a single rate. */
        rateTo: p.rate == null && p.rate_to != null && p.rate_to !== p.rate_from ? p.rate_to : null,
        termMonths: p.term_months ?? p.max_term_months, currency: p.currency,
        islamic: p.financing_type === 'islamic',
      }
    })
    .sort((a, b) => b.rate - a.rate)

  return {
    rows, deposits,
    counts: {
      total: rows.length,
      listed: rows.filter((r) => r.ticker).length,
      usd: rows.filter((r) => r.usd).length,
      guardianship: rows.filter((r) => r.status === 'guardianship').length,
      liquidation: rows.filter((r) => r.status === 'liquidation').length,
      publishing: rows.filter((r) => r.deposits || r.loans).length,
    },
  }
})

/* ── /banks/[slug] ─────────────────────────────────────────────────────────── */


export type ProfileProduct = ProductRow & { facts: FactRow[]; conditions: ConditionRow[] }

export type BankProfileInitial = {
  bank: Bank
  logo: string | null
  products: ProfileProduct[]
  services: ServiceRow[]
  fin: BankFinancials | null
  editorial: EditorialProfile | null
  coverage: Coverage
  indexable: boolean
}

/** One bank, with its products' facts attached to them. */
export const loadBankProfile = cache(async (slug: string): Promise<BankProfileInitial | null> => {
  const bank = await getBank(slug)
  if (!bank) return null
  const [products, services] = await Promise.all([listProducts(slug), listServices(slug)])
  const { facts, conditions } = await productDetail(products.map((p) => p.id))
  const fin = bank.ticker ? (await bankFinancials([bank.ticker])).get(bank.ticker) ?? null : null
  const editorial = editorialFor(bank.slug)
  const withFacts: ProfileProduct[] = products.map((p) => {
    const f = facts.filter((x) => x.product_id === p.id)
    const ids = new Set(f.map((x) => x.id))
    return { ...p, facts: f, conditions: conditions.filter((x) => ids.has(x.fact_id)) }
  })
  return {
    bank, logo: bank.ticker ? LOGO.get(bank.ticker) ?? null : null,
    products: withFacts, services, fin, editorial,
    coverage: coverageOf(bank, products),
    indexable: indexability(bank, products, services, Boolean(fin), editorial).indexable,
  }
})

/* ── /banks/deposits · /banks/loans ───────────────────────────────────────── */

export type RateRow = ProfileProduct & { bankAr: string; bankEn: string; bankIslamic: boolean }
export type BankRatesInitial = { rows: RateRow[]; asOf: string | null }

const isDepositKind = (kind: string) => kind.startsWith('deposit') || kind === 'account_current'

/**
 * Every published product of one family, across all banks, with its facts
 * attached — the compare pages are the profile's product block laid out as
 * a table. Products WITHOUT a rate stay in: a bank that names a product and
 * publishes no number is a fact worth a row, said in those words.
 */
export const loadBankRates = cache(async (family: 'deposits' | 'loans'): Promise<BankRatesInitial> => {
  const [banks, products] = await Promise.all([listBanks(), listProducts()])
  const mine = products.filter((p) => (family === 'deposits') === isDepositKind(p.kind))
  const { facts, conditions } = await productDetail(mine.map((p) => p.id))
  const bySlug = new Map(banks.map((b) => [b.slug, b]))
  const rows: RateRow[] = mine.flatMap((p) => {
    const b = bySlug.get(p.bank_slug)
    if (!b) return []
    const f = facts.filter((x) => x.product_id === p.id)
    const ids = new Set(f.map((x) => x.id))
    return [{ ...p, facts: f, conditions: conditions.filter((x) => ids.has(x.fact_id)), bankAr: b.name_ar, bankEn: b.name_en, bankIslamic: b.bank_type === 'islamic' }]
  })
  const asOf = rows.map((r) => r.last_verified).filter(Boolean).sort().pop() ?? null
  return { rows, asOf }
})
