/**
 * The editorial layer of a bank profile — verdict, ratings, FAQs, links —
 * read from content/banks/profiles.ar.json, which scripts/import-bank-
 * editorial.mjs writes from the research package.
 *
 * Kept apart from lib/banks.ts on purpose. That module reads FACTS: each with
 * a state, a source, a condition hash and a freshness class. This reads COPY.
 * A verdict has none of those properties and should not be made to pretend
 * it does; and a rating is a desk-research judgment, which the page has to
 * say every time it shows one.
 *
 * The file is bundled at build time. There is no runtime fetch and nothing
 * for a request to wait on; a profile either exists in the file or the page
 * renders the fact layer alone.
 */

import EDITORIAL from '@/content/banks/profiles.ar.json'

export type RateBasis =
  | 'annual' | 'annual_from' | 'annual_declining' | 'declining_unannualized'
  | 'expected_profit_not_guaranteed' | 'financing_return_only' | 'unstated' | 'flat'

export type Confidence = 'low' | 'medium' | 'high' | 'limited' | 'insufficient'

export type CategoryKey = 'mobile' | 'support' | 'fees' | 'payments' | 'access' | 'products'
export const CATEGORY_KEYS: readonly CategoryKey[] = ['mobile', 'support', 'fees', 'payments', 'access', 'products']

export interface EditorialProduct {
  slug: string
  name: string
  summary: string
  sources: number[]
  bankConfirmed: boolean
  rate: { value: number; basis: RateBasis; scenario: string; source: number | null } | null
}

export interface EditorialCategory {
  score: number | null
  outOf: number
  weight: number
  confidence: Confidence
  rationale: string
  sources: number[]
}

export interface EditorialProfile {
  h1: string
  intro: string
  suitableFor: string
  watchOut: string
  experience: string
  fees: string | null
  products: EditorialProduct[]
  faqs: { q: string; a: string; sources: number[] }[]
  links: { label: string; url: string; source: number | null }[]
  ratings: {
    overall: number | null
    outOf: number
    label: string | null
    coveredWeight: number | null
    confidence: Confidence | null
    categories: Record<CategoryKey, EditorialCategory>
  }
  app: {
    url: string; title: string; storeRating: number | null; ratingCount: string | null
    storefront: string | null; sample: number | null; confidence: Confidence | null
    summary: string | null; source: number | null
  } | null
  seo: { title: string; description: string; recommendation: string }
  sources: { id: number; title: string; url: string; kind: string; date: string | null }[]
}

const DATA = EDITORIAL as unknown as {
  observed_at: string
  methodology_ar: string
  profiles: Record<string, EditorialProfile>
  aliases: Record<string, string>
}

export const EDITORIAL_OBSERVED_AT = DATA.observed_at
export const METHODOLOGY_AR = DATA.methodology_ar

export function editorialFor(slug: string): EditorialProfile | null {
  return DATA.profiles[slug] ?? null
}

/** A research slug the package used for a bank whose live slug differs. */
export function canonicalSlug(slug: string): string {
  return DATA.aliases[slug] ?? slug
}

export function allEditorial(): Record<string, EditorialProfile> {
  return DATA.profiles
}

/* ── Coverage · derived from what is actually there ──────────────────────
   Not a score. Four descriptions of how much the desk research could say,
   so a bank with an overall figure and a bank with a name and a directory
   line do not sit in the same column looking alike. */
export type EditorialCoverage = 'overall' | 'partial' | 'products' | 'limited'

export function editorialCoverage(e: EditorialProfile | null): EditorialCoverage {
  if (!e) return 'limited'
  if (e.ratings.overall !== null) return 'overall'
  if (CATEGORY_KEYS.some((k) => e.ratings.categories[k]?.score !== null)) return 'partial'
  if (e.products.length) return 'products'
  return 'limited'
}

export function ratedCategoryCount(e: EditorialProfile): number {
  return CATEGORY_KEYS.filter((k) => e.ratings.categories[k]?.score !== null).length
}

/**
 * The one product the hub shows for a bank: the first with a headline rate,
 * otherwise the first selected product. Never a rate from a different product
 * than the name beside it.
 */
export function headlineProduct(e: EditorialProfile | null): EditorialProduct | null {
  if (!e?.products.length) return null
  return e.products.find((p) => p.rate) ?? e.products[0]
}

/** "4.4 · 5.3K" — the store's own figure, labelled as the store's. */
export function storeRatingText(app: EditorialProfile['app']): string | null {
  if (!app || app.storeRating === null) return null
  return app.ratingCount ? `${app.storeRating} · ${app.ratingCount}` : String(app.storeRating)
}
