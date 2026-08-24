import type { Lot, Quote } from '@/lib/portfolio'
import type { CompanyMeta } from '@/types'

/**
 * The view model behind /portfolio.
 *
 * The store is a list of BUY LOTS — ticker, quantity, price paid, optional
 * date and note. Everything the page shows follows from that, and the things
 * it does NOT show follow from it just as directly:
 *
 *   · no realised profit, because there are no sells to realise against
 *   · no transaction ledger, because calling a list of buys a ledger promises
 *     sells, fees and dividends that are not stored
 *   · no performance curve, because lot dates are optional and a curve built
 *     from some of them would be fiction
 *   · no cash balance and no benchmark comparison — neither exists
 *
 * The one rule that shapes the arithmetic: A MISSING PRICE IS NOT ZERO. A
 * position whose company has no current quote is unvalued — excluded from the
 * total, the return and the allocation — and the page says how many it
 * excluded and what they cost.
 */

export type Position = {
  sym: string
  name: string
  sector: string | null
  qty: number
  /** Σ qty·price across the lots. Always known: price paid is stored. */
  cost: number
  /** Weighted average price paid. */
  avg: number
  /** Latest close, or null when the company has no usable quote. */
  price: number | null
  /** qty × price, or null when unvalued. */
  value: number | null
  /** value − cost, or null when unvalued. */
  pl: number | null
  plPct: number | null
  /** qty × (price − prev close), or null when there is no prior close. */
  dayChange: number | null
  dayPct: number | null
  /** Sessions since the company last traded, when the quote is carried. */
  staleDays: number | null
  lots: Lot[]
}

export type Totals = {
  value: number
  cost: number
  pl: number
  plPct: number
  dayChange: number | null
  dayPct: number | null
  holdings: number
  /** Positions excluded for want of a price, and what they cost. */
  unvalued: number
  unvaluedCost: number
}

/** Σ qty·price per ticker, then priced. Nothing is invented for a missing quote. */
export function positions(
  lots: Lot[],
  quotes: Record<string, Quote>,
  metaBy: Map<string, CompanyMeta>,
): Position[] {
  const by = new Map<string, Lot[]>()
  for (const l of lots) {
    if (!l.sym || !(l.qty > 0)) continue
    const g = by.get(l.sym)
    if (g) g.push(l); else by.set(l.sym, [l])
  }

  const out: Position[] = []
  for (const [sym, group] of Array.from(by.entries())) {
    const qty = group.reduce((a, l) => a + l.qty, 0)
    const cost = group.reduce((a, l) => a + l.qty * l.price, 0)
    const q = quotes[sym] ?? null
    const meta = metaBy.get(sym)
    const price = q?.price ?? null
    const value = price == null ? null : qty * price
    const pl = value == null ? null : value - cost
    const dayChange = price == null || q?.prev == null ? null : qty * (price - q.prev)

    out.push({
      sym,
      name: meta?.ar || meta?.en || sym,
      sector: meta?.sec ? String(meta.sec) : null,
      qty, cost,
      avg: qty > 0 ? cost / qty : 0,
      price, value, pl,
      plPct: pl == null || cost <= 0 ? null : (pl / cost) * 100,
      dayChange,
      dayPct: dayChange == null || q?.prev == null || q.prev <= 0
        ? null
        : ((price as number) - q.prev) / q.prev * 100,
      staleDays: q?.staleDays ?? null,
      lots: group,
    })
  }
  return out
}

export function totals(rows: Position[]): Totals {
  const valued = rows.filter(r => r.value != null)
  const value = valued.reduce((a, r) => a + (r.value as number), 0)
  const cost = valued.reduce((a, r) => a + r.cost, 0)
  const pl = value - cost
  // Only positions that actually have a prior close contribute a day change;
  // one that does not must not be read as having moved zero.
  const withDay = valued.filter(r => r.dayChange != null)
  const dayChange = withDay.length ? withDay.reduce((a, r) => a + (r.dayChange as number), 0) : null
  const openedAt = withDay.reduce((a, r) => a + ((r.value as number) - (r.dayChange as number)), 0)
  const unvalued = rows.filter(r => r.value == null)

  return {
    value, cost, pl,
    plPct: cost > 0 ? (pl / cost) * 100 : 0,
    dayChange,
    dayPct: dayChange != null && openedAt > 0 ? (dayChange / openedAt) * 100 : null,
    holdings: rows.length,
    unvalued: unvalued.length,
    unvaluedCost: unvalued.reduce((a, r) => a + r.cost, 0),
  }
}

export type Slice = { key: string; label: string; value: number; pct: number; count: number }

/**
 * Allocation, by sector or by company. Unvalued positions are absent rather
 * than zero-weighted: a position with no price has no weight to give.
 */
export function slices(
  rows: Position[], by: 'sector' | 'company', sectorLabel: (k: string) => string,
): Slice[] {
  const valued = rows.filter(r => r.value != null)
  const total = valued.reduce((a, r) => a + (r.value as number), 0)
  if (!total) return []

  const buckets = new Map<string, { label: string; value: number; count: number }>()
  for (const r of valued) {
    const key = by === 'sector' ? (r.sector ?? 'unknown') : r.sym
    const label = by === 'sector' ? (r.sector ? sectorLabel(r.sector) : 'غير مصنّف') : r.name
    const b = buckets.get(key)
    if (b) { b.value += r.value as number; b.count++ }
    else buckets.set(key, { label, value: r.value as number, count: 1 })
  }
  return Array.from(buckets.entries())
    .map(([key, b]) => ({ key, label: b.label, value: b.value, pct: (b.value / total) * 100, count: b.count }))
    .sort((a, b) => b.value - a.value)
}
