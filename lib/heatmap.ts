import type { Locale } from '@/lib/i18n/locale'
import {
  PERIODS as SCREENER_PERIODS, STALE_DAYS, periodChange, sectorLabel,
  type Metric, type ScreenerRow, type PeriodId,
} from '@/lib/screener'

/**
 * خريطة السوق — the heatmap's model.
 *
 * ══ THE ENCODING, STATED ONCE ════════════════════════════════════════════
 *   AREA   = market capitalisation, `last_close × issued shares`
 *   COLOUR = % change over the selected period, in seven discrete bands
 *   GROUP  = sector, two levels — sectors, then one sector's companies
 *
 * A treemap whose encoding you have to infer is decoration, so the page
 * prints all three above the map. None of them is a new measurement: the
 * cap, the change and the sector all come from `lib/screener`, which
 * /screener already ships on, so the two routes cannot disagree.
 *
 * ══ WHY THE SCALE MOVES WITH THE PERIOD ══════════════════════════════════
 * Intensity is scaled against a per-period cap — 3% for a day, 60% for a
 * year. A 3% day is extraordinary and a 3% year is nothing, so one fixed
 * scale would render every long-period map in flat pastel. The cap is
 * printed under the legend, so the scale is never implicit.
 *
 * ══ WHAT IS NOT ON THE MAP ═══════════════════════════════════════════════
 * A company with no computable market cap has no area, and a company priced
 * on a close older than 60 days has a cap that multiplies an old price by a
 * current share count. Both are EXCLUDED and counted, never drawn as an
 * invisible zero-area tile. See docs/HEATMAP_DATA_MAP.md §5.
 */

export type { PeriodId }

/** The six periods, each with the intensity cap the shipped route defined. */
export const PERIODS = SCREENER_PERIODS.map((p) => ({
  ...p,
  cap: ({ '1d': 3, '1w': 6, '1m': 12, '3m': 20, ytd: 40, '52w': 60 } as const)[p.id],
}))

export const capFor = (p: PeriodId) => PERIODS.find((x) => x.id === p)!.cap

/** A company on the map: a screener row that has an area. */
export type MapRow = ScreenerRow & { marketCap: number }

export type Universe = {
  rows: MapRow[]
  /** Rows in `company_metrics` before any filter. */
  total: number
  included: number
  /** No `last_close × shares` — a missing share count is not a zero. */
  excludedNoCap: string[]
  /** Priced on a close older than STALE_DAYS. */
  excludedStale: string[]
  /** `days_since_trade` was null — unknown, so excluded rather than assumed. */
  excludedUnknownAge: string[]
  /** Σ marketCap over the included rows. */
  marketCap: number
}

/**
 * Resolve the map's universe from the metrics rows.
 *
 * Two departures from the shipped page, both recorded in the data map:
 *
 * 1. It computed staleness as `(days_since_trade ?? 0) > STALE_DAYS`, which
 *    reads an UNKNOWN last-trade date as "traded today". Null is unknown, so
 *    the row is excluded and counted.
 * 2. It fell back to the static `mcap` in companies.json when the share count
 *    was missing — a figure in millions, from an older price. `toRow` returns
 *    null there and the row is excluded.
 *
 * Both give the same 80 companies against today's data. The rules are still
 * wrong, so they are not carried forward.
 */
export function universe(rows: ScreenerRow[], metrics: Metric[]): Universe {
  const ageOf = new Map(metrics.map((m) => [m.ticker, m.days_since_trade]))
  const out: MapRow[] = []
  const noCap: string[] = []
  const stale: string[] = []
  const unknownAge: string[] = []

  for (const r of rows) {
    const age = ageOf.get(r.ticker)
    if (age == null) { unknownAge.push(r.ticker); continue }
    if (r.mcap == null || !(r.mcap > 0)) { noCap.push(r.ticker); continue }
    if (age > STALE_DAYS) { stale.push(r.ticker); continue }
    out.push({ ...r, marketCap: r.mcap })
  }

  return {
    rows: out,
    total: rows.length,
    included: out.length,
    excludedNoCap: noCap,
    excludedStale: stale,
    excludedUnknownAge: unknownAge,
    marketCap: out.reduce((a, r) => a + r.marketCap, 0),
  }
}

/* ── Sectors ──────────────────────────────────────────────────────────────
   `company_metrics.sector` with `lib/screener`'s labels. A clean ten-key
   vocabulary with none of `sector_monthly`'s duplicates, so the Phase 4 alias
   table is neither needed nor used. Verified: 0 unmapped keys and 0
   disagreements with companies.json across the map's 80 companies. */

export type SectorNode = {
  id: string
  label: string
  list: MapRow[]
  marketCap: number
  /** Cap-weighted move across the names that HAVE a reading. Null if none do. */
  pct: number | null
  /** How many of its companies have no reading for this period. */
  missing: number
}

export function sectorNodes(rows: MapRow[], period: PeriodId, locale: Locale = 'ar'): SectorNode[] {
  const by = new Map<string, MapRow[]>()
  for (const r of rows) {
    const list = by.get(r.sector)
    if (list) list.push(r)
    else by.set(r.sector, [r])
  }
  return Array.from(by.entries()).map(([id, list]) => {
    let wsum = 0, w = 0, missing = 0
    for (const r of list) {
      const p = periodChange(r, period)
      if (p == null) { missing++; continue }
      wsum += p * r.marketCap
      w += r.marketCap
    }
    return {
      id,
      label: sectorLabel(id, locale),
      list,
      marketCap: list.reduce((s, r) => s + r.marketCap, 0),
      /* Cap-weighted, not the mean: a sector's move is what its money did, and
         an equal-weighted average lets the smallest bank in the country
         outvote the largest. Companies with no reading are counted, never
         folded in as zero. */
      pct: w ? wsum / w : null,
      missing,
    }
  }).sort((a, b) => b.marketCap - a.marketCap)
}

/* ── Squarified treemap (Bruls, Huizing & van Wijk) ───────────────────────
   Laid out in a 0–100 unit box, so tiles are percentage boxes and the browser
   reflows the map on resize without a single JS re-layout pass. Squarified
   rather than slice-and-dice because a treemap communicates AREA, and a
   400×6px sliver reads as a line rather than a quantity. */

export type Box = { x: number; y: number; w: number; h: number }

export function squarify<T>(
  input: { item: T; value: number }[],
  X: number, Y: number, W: number, H: number,
): { item: T; box: Box }[] {
  /* Weights ≤ 0 are dropped before layout, so no tile can have zero or
     negative area. Anything filtered here was already excluded upstream by
     `universe`; this is the invariant, not a second policy. */
  const sorted = input.filter((i) => i.value > 0).sort((a, b) => b.value - a.value)
  const sum = sorted.reduce((s, i) => s + i.value, 0)
  if (!sum || W <= 0 || H <= 0) return []
  const nodes = sorted.map((i) => ({ item: i.item, area: (i.value / sum) * (W * H) }))
  const out: { item: T; box: Box }[] = []

  let x = X, y = Y, w = W, h = H
  let row: typeof nodes = []
  const rowSum = (r: typeof nodes) => r.reduce((s, n) => s + n.area, 0)
  const side = () => Math.min(w, h)

  /** Worst aspect ratio in a row laid along the shorter side. */
  const worst = (r: typeof nodes, extra?: number) => {
    const areas = extra != null ? [...r.map((n) => n.area), extra] : r.map((n) => n.area)
    if (!areas.length) return Infinity
    const s = areas.reduce((a, b) => a + b, 0)
    const side2 = side() * side()
    return Math.max((side2 * Math.max(...areas)) / (s * s), (s * s) / (side2 * Math.min(...areas)))
  }

  const flush = () => {
    const s = rowSum(row)
    const thickness = s / side()
    let off = 0
    for (const n of row) {
      const len = (n.area / s) * side()
      out.push(w >= h
        ? { item: n.item, box: { x, y: y + off, w: thickness, h: len } }
        : { item: n.item, box: { x: x + off, y, w: len, h: thickness } })
      off += len
    }
    if (w >= h) { x += thickness; w -= thickness } else { y += thickness; h -= thickness }
    row = []
  }

  for (const n of nodes) {
    if (row.length && worst(row, n.area) > worst(row)) flush()
    row.push(n)
  }
  if (row.length) flush()
  return out
}

/* ── Colour ───────────────────────────────────────────────────────────────
   Seven discrete bands, not a continuous ramp. A gradient is the obvious
   choice and the wrong one: it makes +0.4% and +0.9% indistinguishable while
   implying a precision the eye cannot read back. Bands are legible, they
   match the legend exactly, and that makes the legend a control. */

export const BANDS = [-3, -2, -1, 0, 1, 2, 3] as const
export type Band = (typeof BANDS)[number]

/** Fractions of the period's cap at which the bands change. */
const EDGES = [0.06, 0.28, 0.62] as const

/**
 * Which band a move falls in, scaled by the period's own cap.
 *
 * `null` in means `null` out — no reading is its own state, never band 0.
 * Band 0 means MEASURED flat, which is a fact about the market and, at 41 of
 * 80 companies on the day, the most common one on this page.
 */
export function bandOf(pct: number | null, cap: number): Band | null {
  if (pct == null) return null
  const r = pct / cap
  const a = Math.abs(r)
  if (a < EDGES[0]) return 0
  const step = a < EDGES[1] ? 1 : a < EDGES[2] ? 2 : 3
  return (r > 0 ? step : -step) as Band
}

/** The band's own edges, in real percent, computed from the same constants
 *  the colouring uses — so the legend cannot drift from the map. */
export function bandLabel(b: Band, cap: number): string {
  const edge = EDGES.map((f) => f * cap)
  if (b === 0) return `±${edge[0].toFixed(1)}%`
  const s = b < 0 ? '−' : '+'
  const i = Math.abs(b)
  if (i === 3) return `${s}${edge[2].toFixed(0)}%+`
  return `${s}${edge[i - 1].toFixed(i === 1 ? 1 : 0)} … ${s}${edge[i].toFixed(0)}%`
}

/* ── Formatting ───────────────────────────────────────────────────────────── */

export const iqdShort = (v: number) => {
  const a = Math.abs(v)
  if (a >= 1e12) return (v / 1e12).toFixed(2) + 'T'
  if (a >= 1e9) return (v / 1e9).toFixed(1) + 'B'
  if (a >= 1e6) return (v / 1e6).toFixed(0) + 'M'
  return Math.round(v).toLocaleString('en-US')
}

/** `—` for no reading, a signed figure otherwise. `0` keeps no sign: it is a
 *  measured balance, not a direction. */
export const pctText = (pct: number | null) =>
  pct == null ? '—' : `${pct > 0 ? '+' : pct < 0 ? '−' : ''}${Math.abs(pct).toFixed(2)}%`

export const arrowOf = (pct: number | null) =>
  pct == null ? null : pct > 0 ? '↗' : pct < 0 ? '↘' : '→'

/** Normalised for search: fold the alef/ya/ta-marbuta variants and drop
 *  harakat, so «الاهلي» finds «الأهلي». Same rule `lib/market` uses to match
 *  scanned company names. */
export function normalizeAr(s: string): string {
  return s
    .replace(/[ً-ْـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/[ىئ]/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, '')
}

export function matchesQuery(r: MapRow, query: string): boolean {
  const q = query.trim()
  if (!q) return true
  const lower = q.toLowerCase()
  if (r.ticker.toLowerCase().includes(lower)) return true
  if (r.name_en && r.name_en.toLowerCase().includes(lower)) return true
  const nq = normalizeAr(q)
  return normalizeAr(r.name).includes(nq)
}
