import { liveMcap, SECTORS } from '@/lib/market'
import { localeDateOrDash } from '@/lib/date'
import type { Locale } from '@/lib/i18n/locale'
import type { Company } from '@/types'

/**
 * The homepage's data shapes, and the one rule that governs them.
 *
 * ══ ONE CANONICAL SESSION ═════════════════════════════════════════════════
 * The homepage draws on three independent tables — `daily_prices`,
 * `daily_index` and `foreign_flow_company_daily` — and each defines "latest"
 * for itself. They agree today (all on 2026-08-13, verified against
 * production), but the pipelines are separate and can diverge.
 *
 * So the page resolves ONE session and labels every module with it, rather
 * than each module saying «اليوم» and quietly meaning its own window. Where a
 * module's own source is behind, that is stated instead of hidden.
 *
 * ⚠ Sessions are NOT consecutive calendar days — the last three are 08-13,
 * 08-11, 08-10. Nothing here may say "yesterday"; the comparison is against
 * the PRIOR SESSION and the date is always available.
 *
 * See docs/HOMEPAGE_DATA_MAP.md for the full element → source table.
 */

export type IndexRow = {
  date: string
  isx60: number
  total_value: number | null
  total_volume: number | null
  total_trades: number | null
  traded_companies: number | null
  listed_companies: number | null
}

/**
 * Market breadth · FOUR categories, not three.
 *
 * A company with no valid prior close has an UNKNOWN change. The old homepage
 * counted those 8 companies as «ثابت», which asserts something about the
 * market that is not in the data — the `—` versus `0` rule, broken in the one
 * place it most visibly matters.
 *
 * `traded` and `listed` come from `daily_index` and give the honest
 * denominator: 49 of 103 listed companies traded, so "14 advancing" is 14 out
 * of 49, not out of 103.
 */
export type Breadth = {
  advancing: number
  declining: number
  unchanged: number
  /** No valid prior close. Change is unknown, NOT zero. */
  unavailable: number
  traded: number
  listed: number | null
}

export type Flow = {
  buy: number
  sell: number
  net: number
  date: string
  /** Share of the buy+sell total. Zero-safe. */
  buyShare: number
  sellShare: number
}

export type SectorMove = {
  id: string
  label: string
  /** Market-cap-weighted mean change across the sector's traded names. */
  pct: number
  value: number
  count: number
}

/* Full sector names, both languages, keyed by id. `arFull`/`enFull` rather
   than the short chip forms: the homepage sector rows have room for «الفنادق
   والسياحة» and «Hotels & tourism», and the abbreviated pair reads as a
   different taxonomy from the one the market board and the screener use. */
const SECTOR_NAME = new Map(
  SECTORS.filter((s) => s.id !== 'all')
    .map((s) => [s.id, { ar: s.arFull ?? s.ar, en: s.enFull ?? s.en }]),
)

/**
 * Breadth from the merged company list.
 *
 * `pct` is NEVER null on this type — it is held at 0 when the prior close is
 * missing, so `pct === 0` cannot distinguish "measured flat" from "unknown".
 * `noPrior` is the only honest signal, and it is what this reads.
 */
export function computeBreadth(traded: Company[], index: IndexRow | null): Breadth {
  let advancing = 0, declining = 0, unchanged = 0, unavailable = 0
  for (const c of traded) {
    /* `noPrior` is the signal, NOT `pct === 0`. pct is held at 0 for these
       companies so every surface typing it as `number` keeps working; only
       the flag distinguishes "measured flat" from "nobody knows". */
    if (c.noPrior) { unavailable++; continue }
    if (c.pct > 0) advancing++
    else if (c.pct < 0) declining++
    else unchanged++
  }
  return {
    advancing,
    declining,
    unchanged,
    unavailable,
    traded: traded.length,
    listed: index?.listed_companies ?? null,
  }
}

/** Foreign flow for one session. `net` is always `buy − sell`. */
export function computeFlow(
  rows: { date: string; side: string; value: number | null }[],
  session: string,
): Flow | null {
  const day = rows.filter((r) => r.date === session)
  if (!day.length) return null
  const buy = day.filter((r) => r.side === 'buy').reduce((s, r) => s + (r.value ?? 0), 0)
  const sell = day.filter((r) => r.side === 'sell').reduce((s, r) => s + (r.value ?? 0), 0)
  const total = buy + sell
  return {
    buy,
    sell,
    net: buy - sell,
    date: session,
    buyShare: total ? (buy / total) * 100 : 0,
    sellShare: total ? (sell / total) * 100 : 0,
  }
}

/**
 * Sector movement · market-cap-weighted mean change.
 *
 * Weighted rather than a plain mean because an unweighted average lets a
 * thinly-traded micro-cap move a sector as much as a bank. Companies with an
 * unknown change are excluded from the mean rather than treated as zero —
 * the same rule as breadth.
 */
export function computeSectors(traded: Company[], locale: Locale): SectorMove[] {
  const acc = new Map<string, { wsum: number; w: number; value: number; count: number }>()
  for (const c of traded) {
    if (!SECTOR_NAME.has(c.sec)) continue
    const e = acc.get(c.sec) ?? { wsum: 0, w: 0, value: 0, count: 0 }
    e.value += c.vol ?? 0   // `vol` is traded VALUE in IQD, despite the name
    e.count += 1
    if (!c.noPrior && Number.isFinite(c.pct)) {
      const weight = liveMcap(c) || 1
      e.wsum += c.pct * weight
      e.w += weight
    }
    acc.set(c.sec, e)
  }
  return Array.from(acc.entries())
    .map(([id, e]) => ({
      id,
      label: SECTOR_NAME.get(id)?.[locale] ?? id,
      pct: e.w ? e.wsum / e.w : 0,
      value: e.value,
      count: e.count,
    }))
    .sort((a, b) => b.value - a.value)
}

/**
 * Freshness for a session date.
 *
 * ISX publishes one bulletin per trading day, so "live" is not a thing this
 * product has. The verdict is stated against that cadence rather than against
 * the clock, and nothing here ever returns «مباشر».
 */
export function sessionFreshness(date: string | null, locale: Locale): {
  tone: 'live' | 'recent' | 'stale' | 'unknown'
  label: string
} {
  const ar = locale === 'ar'
  if (!date) return { tone: 'unknown', label: ar ? 'لا توجد بيانات' : 'No data' }
  const days = Math.floor((Date.now() - new Date(`${date}T00:00:00Z`).getTime()) / 86400_000)
  /* ISX trades Sunday–Thursday, so a Friday/Saturday gap is normal and a
     4-day-old bulletin on a Sunday is not late. Beyond that it is.

     ⚠ `tone: 'live'` is in the union and is never returned. That is deliberate
     and it stays that way: the product has no intraday feed, so nothing here
     may ever render as «مباشر» / «Live». */
  if (days <= 4) return { tone: 'recent', label: ar ? 'آخر جلسة' : 'Latest session' }
  return {
    tone: 'stale',
    label: ar ? `متأخرة ${days} يوماً` : `${days} days behind`,
  }
}

/**
 * «13 أغسطس 2026» / «13 August 2026» — an exact date, never «اليوم»/«today».
 *
 * The site shows the last PUBLISHED session. Writing «today» over it would be
 * a claim about freshness that the bulletin does not support, in either
 * language, and it is the one thing the whole freshness system exists to
 * prevent.
 *
 * Returns «—» for a missing date rather than an empty string, so the absence
 * is visible instead of collapsing the line it sits on.
 */
export function sessionDate(date: string | null, locale: Locale): string {
  return localeDateOrDash(date, locale)
}

/**
 * A signed percentage, and its verdict, decided from the ROUNDED figure.
 *
 * Taking the sign from the raw value and the digits from `toFixed` disagree at
 * the boundary: a sector sitting at −0.0009% is negative to `pct < 0` and
 * "0.00" to `toFixed(2)`, and the page prints «−0.00%». That is not a small
 * cosmetic slip — it shows a direction the displayed number explicitly denies.
 *
 * So round first, then read the sign off what the reader will actually see.
 */
export function signed(pct: number, digits = 2): {
  text: string
  tone: 'up' | 'down' | 'flat'
} {
  const rounded = Number(pct.toFixed(digits))
  const tone = rounded > 0 ? 'up' : rounded < 0 ? 'down' : 'flat'
  const sign = rounded > 0 ? '+' : rounded < 0 ? '−' : ''
  return { text: `${sign}${Math.abs(rounded).toFixed(digits)}%`, tone }
}

/* ── One reference decision this application has already overruled ──────────
   The reference homepage's intro reads «نظرة السوق · ٢٤ تموز ٢٠٢٦» in
   Arabic-Indic numerals. This repo bans them outright — `no-restricted-syntax`
   in the ESLint config, with the reason stated in the rule itself: the design
   and every figure beside them use Latin digits, so a lone Arabic-Indic date
   sitting above a page of Latin measurements reads as a different product.

   That is a standing, deliberate product standard and it outranks one line of
   the reference. The intro's structure, size, weight and colour are ported
   exactly; only its digits stay Latin. Recorded in the completion report. */
