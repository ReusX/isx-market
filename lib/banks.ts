/**
 * Reading the banking model for the public pages.
 *
 * Everything comes from the current-views, never the raw tables, so a
 * superseded fact cannot reach a reader by construction. Financial figures for
 * listed banks are read from `financial_facts` — the same rows /c/[sym] uses —
 * rather than copied into the bank entity.
 *
 * Bare PostgREST rather than the Supabase client, for the reason
 * lib/freshness.ts documents: that client reads `cookies()`, which would opt
 * these routes out of static rendering.
 */

import type { FactState } from '@/lib/banking'

const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

async function q<T>(path: string, revalidate = 3600): Promise<T[]> {
  if (!URL_BASE || !ANON) return []
  try {
    const res = await fetch(`${URL_BASE}/rest/v1/${path}`, {
      headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
      next: { revalidate },
    })
    if (!res.ok) return []
    return (await res.json()) as T[]
  } catch {
    return []
  }
}

export type ResearchState = 'researched' | 'source_unreachable' | 'not_researched'
export type Availability = 'available' | 'unavailable' | 'unknown'

export interface Bank {
  id: number
  slug: string
  name_ar: string
  name_en: string
  bank_type: 'commercial' | 'islamic' | 'investment' | 'specialised' | 'central'
  ownership: 'state' | 'private' | 'mixed' | 'foreign'
  founded: number | null
  hq_city: string | null
  website: string | null
  swift: string | null
  ticker: string | null
  cbi_licensed: boolean | null
  research_state: ResearchState
  research_note: string | null
  research_checked_at: string | null
  is_active: boolean
}

export interface ProductRow {
  id: number
  bank_slug: string
  slug: string
  kind: string
  name_ar: string
  name_en: string
  currency: string
  financing_type: 'conventional' | 'islamic'
  rate: number | null
  rate_basis: string | null
  rate_from: number | null
  rate_to: number | null
  min_amount: number | null
  max_amount: number | null
  max_amount_from: number | null
  max_amount_to: number | null
  min_salary: number | null
  max_term_months: number | null
  term_months: number | null
  conditional_rates: number
  has_conditions: boolean
  known_facts: number
  unknown_facts: number
  stale_facts: number
  last_verified: string | null
}

export interface FactRow {
  id: number
  product_id: number
  field_key: string
  value_num: number | null
  value_text: string | null
  value_text_en: string | null
  value_bool: boolean | null
  unit: string | null
  state: FactState
  is_conditional: boolean
  source_key: string | null
  source_url: string | null
  source_excerpt: string | null
  verified_at: string | null
  label_ar: string
  label_en: string
  is_stale: boolean
  note: string | null
}

export interface ConditionRow {
  fact_id: number
  field_key: string
  op: string
  value_num: number | null
  value_text: string | null
  value_bool: boolean | null
  value_set: string[] | null
}

export interface ServiceRow {
  bank_slug: string
  service_key: string
  availability: Availability
  source_url: string | null
  verified_at: string | null
  is_stale: boolean | null
}

const BANK_COLS =
  'id,slug,name_ar,name_en,bank_type,ownership,founded,hq_city,website,swift,ticker,' +
  'cbi_licensed,research_state,research_note,research_checked_at,is_active'

export const listBanks = () =>
  q<Bank>(`banks?select=${BANK_COLS}&is_active=is.true&order=name_en.asc`)

export const getBank = async (slug: string) =>
  (await q<Bank>(`banks?select=${BANK_COLS}&slug=eq.${slug}&limit=1`))[0] ?? null

export const listProducts = (slug?: string) =>
  q<ProductRow>(
    `bank_products_current?select=*${slug ? `&bank_slug=eq.${slug}` : ''}&is_active=is.true&order=kind.asc`,
  )

export const listServices = (slug?: string) =>
  q<ServiceRow>(
    `bank_services_current?select=bank_slug,service_key,availability,source_url,verified_at,is_stale` +
    `${slug ? `&bank_slug=eq.${slug}` : ''}`,
  )

export async function productDetail(productIds: number[]) {
  if (!productIds.length) return { facts: [] as FactRow[], conditions: [] as ConditionRow[] }
  const inList = `(${productIds.join(',')})`
  const facts = await q<FactRow>(
    `product_facts_current?select=id,product_id,field_key,value_num,value_text,value_text_en,value_bool,unit,state,` +
    `is_conditional,source_key,source_url,source_excerpt,verified_at,label_ar,label_en,is_stale,note` +
    `&product_id=in.${inList}&order=field_key.asc`,
  )
  const ids = facts.filter((f) => f.is_conditional).map((f) => f.id)
  const conditions = ids.length
    ? await q<ConditionRow>(
        `product_conditions?select=fact_id,field_key,op,value_num,value_text,value_bool,value_set&fact_id=in.(${ids.join(',')})`,
      )
    : []
  return { facts, conditions }
}

/* ── Listed-bank financials · read, never copied ────────────────────────── */

export interface BankFinancials {
  ticker: string
  fiscalYear: number
  period: string
  values: Record<string, number>
}

const FIN_KEYS = [
  'total_assets', 'customer_deposits', 'total_equity', 'net_income',
  'paid_capital', 'capital_adequacy_ratio', 'lcr',
] as const

/**
 * Latest reported figures for a listed bank, from the same `financial_facts`
 * rows /c/[sym]/financials renders. The bank page shows a snapshot and links
 * out; it is not a second copy of the statements.
 */
export async function bankFinancials(tickers: string[]): Promise<Map<string, BankFinancials>> {
  if (!tickers.length) return new Map()
  const rows = await q<{
    ticker: string; fiscal_year: number; period: string; line_key: string; value_iqd: number
  }>(
    `financial_facts?select=ticker,fiscal_year,period,line_key,value_iqd` +
    `&ticker=in.(${tickers.join(',')})&line_key=in.(${FIN_KEYS.join(',')})` +
    `&order=fiscal_year.desc&limit=4000`,
  )
  const out = new Map<string, BankFinancials>()
  for (const r of rows) {
    /* One reporting period per bank — the newest. Mixing a 2026 half-year
       asset figure with a 2024 annual profit would be a comparison nobody
       asked for. */
    const cur = out.get(r.ticker)
    if (!cur) {
      out.set(r.ticker, { ticker: r.ticker, fiscalYear: r.fiscal_year, period: r.period, values: { [r.line_key]: r.value_iqd } })
      continue
    }
    if (r.fiscal_year !== cur.fiscalYear || r.period !== cur.period) continue
    cur.values[r.line_key] = r.value_iqd
  }
  return out
}

/* ── Coverage · a count, not a score ────────────────────────────────────── */

export type Coverage = 'rich' | 'partial' | 'named-only' | 'none' | 'unreachable'

/**
 * How much a bank actually publishes.
 *
 * Deliberately NOT a score out of ten. It is a description of what was found,
 * because a bank that publishes little is not thereby a worse bank — Bank of
 * Baghdad has 105 extracted financial facts and no retail terms at all. The
 * labels say what happened, and `unreachable` is kept apart from `none` so the
 * page never implies we read a site we could not open.
 */
export function coverageOf(bank: Bank, products: ProductRow[]): Coverage {
  if (bank.research_state === 'source_unreachable') return 'unreachable'
  if (!products.length) return 'none'
  const known = products.reduce((n, p) => n + p.known_facts, 0)
  if (known === 0) return 'named-only'
  return known >= 8 ? 'rich' : 'partial'
}

/** A profile earns indexing when it says something a reader could not guess. */
export function isSubstantive(bank: Bank, products: ProductRow[]): boolean {
  const cov = coverageOf(bank, products)
  return cov === 'rich' || cov === 'partial'
}
