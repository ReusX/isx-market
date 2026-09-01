/**
 * The banking domain model, shared by the seed loader and (later) the app.
 *
 * ── Why the vocabulary lives in code as well as in the database ───────────
 * `fact_policy`, `condition_field` and `condition_operator` are tables so that
 * SQL views can join them — staleness is computed in the view, and a condition
 * naming an unknown field cannot be inserted. These constants mirror them so a
 * seed file is wrong at COMPILE time rather than at insert time. The gate in
 * scripts/banking-gates.mjs asserts the two stay in step; if they ever drift,
 * the database is the authority.
 *
 * ── The four states, and the one distinction that matters ────────────────
 *   KNOWN               published, recorded, with a source and a quote
 *   UNKNOWN             we read the bank's page and it does not publish this —
 *                       so it carries the page we read and the date we read it
 *   SOURCE_UNAVAILABLE  we tried and could not read the source
 *   NOT_APPLICABLE      the field has no meaning for this product
 *   UNVERIFIED          recorded but not yet checked
 *
 * A missing row is a sixth thing: nobody looked. These are kept apart because
 * they say completely different things to a reader. "Bank of Baghdad does not
 * publish its loan rate" is a finding about the Iraqi market; "we could not
 * open the site" is a finding about the source; "we never checked" is a
 * finding about us. An UNKNOWN with no source URL is indistinguishable from a
 * forgotten field, which is why `checkFact` demands one.
 */

export const FACT_STATES = ['KNOWN', 'UNKNOWN', 'NOT_APPLICABLE', 'UNVERIFIED', 'SOURCE_UNAVAILABLE'] as const
export type FactState = (typeof FACT_STATES)[number]

export const PRODUCT_KINDS = [
  'deposit_savings', 'deposit_term', 'account_current',
  'loan_personal', 'loan_auto', 'loan_home', 'loan_business', 'advance',
] as const
export type ProductKind = (typeof PRODUCT_KINDS)[number]

export const SERVICE_KEYS = [
  'atm', 'mobile_banking', 'internet_banking', 'cards',
  'usd_account', 'international_transfer', 'salary_domiciliation',
] as const
export type ServiceKey = (typeof SERVICE_KEYS)[number]

export type Availability = 'available' | 'unavailable' | 'unknown'

/** Mirrors `fact_policy`. Adding a key here means adding it there too. */
export const FACT_KEYS = [
  'rate', 'rate_basis', 'min_amount', 'max_amount', 'min_salary',
  'admin_fee', 'admin_fee_pct',
  'min_term_months', 'max_term_months', 'min_age', 'max_age',
  'down_payment_pct', 'guarantor_required', 'collateral_required',
  'collateral_type', 'salary_domiciliation_required',
  'max_instalment_pct_of_income', 'early_repayment', 'eligibility_note',
  'required_documents', 'application_method',
  'term_months', 'early_break_penalty',
] as const
export type FactKey = (typeof FACT_KEYS)[number]

/** Mirrors `condition_field`. */
export const CONDITION_FIELDS = [
  'salary', 'salary_domiciled', 'employment_type', 'employment_months',
  'age', 'has_guarantor', 'has_collateral', 'collateral_type', 'purpose',
  'deposit_amount', 'term_months',
] as const
export type ConditionField = (typeof CONDITION_FIELDS)[number]

export const CONDITION_OPS = ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in', 'not_in'] as const
export type ConditionOp = (typeof CONDITION_OPS)[number]

/** Enumerated condition values, so a typo cannot become a new category. */
export const CONDITION_ENUMS: Partial<Record<ConditionField, readonly string[]>> = {
  employment_type: ['government', 'private', 'mixed', 'self_employed', 'retired'],
  collateral_type: ['vehicle_lien', 'property', 'gold', 'deposit', 'mastercard'],
  purpose: ['purchase', 'build', 'renovate', 'land', 'vehicle', 'business', 'personal'],
}

export interface Condition {
  field: ConditionField
  op: ConditionOp
  value?: number | string | boolean
  set?: readonly string[]
  noteAr?: string
}

export interface FactSeed {
  key: FactKey
  state: FactState
  num?: number
  text?: string
  bool?: boolean
  /** Conditions that qualify this value. Absent means it applies always. */
  when?: readonly Condition[]
  sourceKey?: string
  sourceUrl?: string
  excerpt?: string
  page?: number
  verifiedAt?: string
  effectiveDate?: string
  note?: string
}

export interface ProductSeed {
  slug: string
  kind: ProductKind
  nameAr: string
  nameEn: string
  currency?: string
  financingType?: 'conventional' | 'islamic'
  facts: readonly FactSeed[]
}

export interface BankSeed {
  slug: string
  nameAr: string
  nameEn: string
  shortAr?: string
  shortEn?: string
  bankType: 'commercial' | 'islamic' | 'investment' | 'specialised' | 'central'
  ownership: 'state' | 'private' | 'mixed' | 'foreign'
  founded?: number
  hqCity?: string
  website?: string | null
  swift?: string
  /** The bridge to the curated company roster. Null for non-listed banks. */
  ticker?: string | null
  /* How far research on this bank actually got. A bank with no products looks
     identical whether we checked and found nothing published or never looked;
     this is what tells them apart. */
  researchState: 'researched' | 'source_unreachable' | 'not_researched'
  researchNote?: string
  researchCheckedAt?: string
  cbiLicensed?: boolean
  licenceSourceKey?: string
  licenceVerifiedAt?: string
  services?: readonly {
    key: ServiceKey
    availability: Availability
    sourceKey?: string
    sourceUrl?: string
    excerpt?: string
    verifiedAt?: string
    note?: string
  }[]
  products?: readonly ProductSeed[]
  /** Why this bank is in the pilot — which edge case it exercises. */
  pilotReason: string
}

/**
 * Canonical fingerprint of a condition set.
 *
 * The database enforces "one current value per product per field per condition
 * set" with a unique index on (product_id, field_key, condition_hash). That
 * only works if the same set always hashes the same way, so conditions are
 * sorted and serialised deterministically. Unconditional facts hash to '' —
 * which is also what the typed read view filters on when it pivots, since a
 * conditional maximum flattened into a plain column would mislead.
 */
export function conditionHash(when?: readonly Condition[]): string {
  if (!when || !when.length) return ''
  const parts = when
    .map((c) => {
      const v = c.set ? `[${[...c.set].sort().join(',')}]` : String(c.value)
      return `${c.field}${c.op}${v}`
    })
    .sort()
  return parts.join('&')
}

/** Validate one condition against the vocabulary. Returns problems, not throws. */
export function checkCondition(c: Condition): string[] {
  const out: string[] = []
  if (!(CONDITION_FIELDS as readonly string[]).includes(c.field)) out.push(`unknown condition field '${c.field}'`)
  if (!(CONDITION_OPS as readonly string[]).includes(c.op)) out.push(`unknown operator '${c.op}'`)
  const setOp = c.op === 'in' || c.op === 'not_in'
  if (setOp && !c.set) out.push(`operator '${c.op}' needs a set`)
  if (!setOp && c.value === undefined) out.push(`operator '${c.op}' needs a value`)
  const allowed = CONDITION_ENUMS[c.field]
  if (allowed) {
    const vals = c.set ?? (c.value === undefined ? [] : [String(c.value)])
    for (const v of vals) if (!allowed.includes(String(v))) out.push(`'${v}' is not a permitted ${c.field}`)
  }
  return out
}

/** Validate one fact. The rules the database also enforces, checked earlier. */
export function checkFact(f: FactSeed): string[] {
  const out: string[] = []
  if (!(FACT_KEYS as readonly string[]).includes(f.key)) out.push(`unknown fact key '${f.key}'`)
  if (!(FACT_STATES as readonly string[]).includes(f.state)) out.push(`unknown state '${f.state}'`)
  const hasValue = f.num !== undefined || f.text !== undefined || f.bool !== undefined
  if (f.state === 'KNOWN') {
    if (!hasValue) out.push(`${f.key}: KNOWN with no value`)
    if (!f.sourceKey) out.push(`${f.key}: KNOWN without a source`)
    if (!f.verifiedAt) out.push(`${f.key}: KNOWN without a verified date`)
  } else if (hasValue) {
    out.push(`${f.key}: ${f.state} must not carry a value`)
  }
  /* UNKNOWN is a claim about the SOURCE — "we read this page and the term is
     not on it" — so it has to name the page and the date. Without that it is
     just an empty field wearing a state. */
  if (f.state === 'UNKNOWN') {
    if (!f.sourceKey) out.push(`${f.key}: UNKNOWN without the source that was checked`)
    if (!f.sourceUrl) out.push(`${f.key}: UNKNOWN without the URL that was checked`)
    if (!f.verifiedAt) out.push(`${f.key}: UNKNOWN without the date it was checked`)
  }
  for (const c of f.when ?? []) out.push(...checkCondition(c).map((m) => `${f.key}: ${m}`))
  return out
}
