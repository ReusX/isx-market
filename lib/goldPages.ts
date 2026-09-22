import type { GoldData, FxData } from '@/lib/rates'

/**
 * The gold pages that stand on their own — `/gold/{slug}`.
 *
 * Iraqis do not search for "gold"; they search for a unit and a karat. Search
 * Console, week of 2026-09-14: «سعر مثقال الذهب اليوم …عيار 21» and its
 * spellings drew ~9,000 impressions, the gram and the ounce a few thousand
 * more — all of it landing on one page that answers every cut at once and
 * therefore matches none of them closely. So the mithqal, the gram, the ounce
 * and the 21-karat list each get a page whose title, lead figure and table are
 * that one cut.
 *
 * These are different tables of the same published list, not the same page
 * four times: the unit pages read down a column (one unit, every karat), the
 * karat page reads across a row (one karat, every unit), and each carries the
 * conversion its readers actually ask for — «المثقال كم غرام», «الأونصة كم مثقال».
 */
export const MITHQAL_G = 4.608
export const OUNCE_G = 31.1035

export type GoldUnit = 'gram' | 'mithqal' | 'ounce'

export interface GoldPageDef {
  slug: string
  /** A unit page lists every karat in one unit; a karat page lists one karat in every unit. */
  kind: 'unit' | 'karat'
  unit?: GoldUnit
  karat?: number
}

export const GOLD_PAGES: GoldPageDef[] = [
  { slug: 'mithqal', kind: 'unit', unit: 'mithqal' },
  { slug: 'gram', kind: 'unit', unit: 'gram' },
  { slug: '21', kind: 'karat', karat: 21 },
  { slug: 'ounce', kind: 'unit', unit: 'ounce' },
]

export const goldPage = (slug: string) => GOLD_PAGES.find((g) => g.slug === slug.toLowerCase()) ?? null

/** Grams in one of our three units — every price on these pages is the gram price times this. */
export const unitGrams = (u: GoldUnit) => (u === 'gram' ? 1 : u === 'mithqal' ? MITHQAL_G : OUNCE_G)

/** Karats worth a row of their own. The source also publishes 14 and 12; they are noise here. */
export const MAIN_KARATS = [24, 22, 21, 18]

export interface GoldFigures {
  /** The headline: the page's own unit at karat 21, or its karat at the mithqal. */
  lead: number | null
  leadUsd: number | null
  /** Dinars per gram, by karat — the raw published list, filtered to the karats that trade. */
  byKarat: { karat: number; gram: number; usd: number }[]
  ounceUsd: number | null
  market: number | null
  date: string | null
}

export function goldFigures(def: GoldPageDef, gold: GoldData | null, fx: FxData | null): GoldFigures {
  const byKarat = (gold?.grams ?? [])
    .filter((g) => MAIN_KARATS.includes(g.karat))
    .sort((a, b) => b.karat - a.karat)
    .map((g) => ({ karat: g.karat, gram: g.iqd, usd: g.usd }))
  const at = (k: number) => byKarat.find((g) => g.karat === k) ?? byKarat.find((g) => g.karat === 21) ?? byKarat[0] ?? null
  /* A unit page leads with karat 21 — the karat Iraqi shops quote by default.
     A karat page leads with the mithqal, the unit they quote it in. */
  const row = def.kind === 'karat' ? at(def.karat as number) : at(21)
  const mult = unitGrams(def.kind === 'karat' ? 'mithqal' : (def.unit as GoldUnit))
  return {
    lead: row ? row.gram * mult : null,
    leadUsd: row ? row.usd * mult : null,
    byKarat,
    ounceUsd: gold?.ounceSell?.usd ?? gold?.ounceBuy?.usd ?? null,
    market: fx?.sell ?? fx?.buy ?? null,
    date: gold?.date ? gold.date.replace(/\//g, '-') : null,
  }
}

const nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const f0 = (v: number | null | undefined) => (v == null ? '—' : nf0.format(v))

/** The formatted figures the dictionary's sentences and the route's metadata both speak with. */
export function goldUnitVars(def: GoldPageDef, f: GoldFigures, date: string) {
  const g = (k: number) => f.byKarat.find((x) => x.karat === k)?.gram ?? null
  const g21 = g(21)
  return {
    lead: f0(f.lead),
    mithqal21: f0(g21 != null ? g21 * MITHQAL_G : null),
    gram21: f0(g21),
    gram24: f0(g(24)),
    gram22: f0(g(22)),
    gram18: f0(g(18)),
    ounce21: f0(g21 != null ? g21 * OUNCE_G : null),
    ounceUsd: f0(f.ounceUsd),
    date,
  }
}

/** The weights a buyer actually asks a jeweller to price, per page. */
export const GOLD_WEIGHTS: Record<string, { label: number; grams: number }[]> = {
  mithqal: [0.25, 0.5, 1, 2, 5, 10, 20].map((m) => ({ label: m, grams: m * MITHQAL_G })),
  gram: [1, 2, 5, 10, 20, 50, 100].map((x) => ({ label: x, grams: x })),
  ounce: [0.25, 0.5, 1, 2, 5, 10].map((x) => ({ label: x, grams: x * OUNCE_G })),
  '21': [0.25, 0.5, 1, 2, 5, 10, 20].map((m) => ({ label: m, grams: m * MITHQAL_G })),
}
