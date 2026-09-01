/**
 * The four dollar rates Iraq actually has, and which one the page may call
 * «السعر الرسمي».
 *
 * ── Why this file exists ──────────────────────────────────────────────────
 * `lib/fxOfficial.ts` used to export one constant, `CBI_OFFICIAL_RATE = 1320`,
 * and `/fx` printed it under the label «السعر الرسمي» and computed the gap
 * from it. Three different figures are in circulation and 1,320 is not the one
 * the Central Bank publishes:
 *
 *   1,300  the statutory rate, set in the federal budget. A legislated figure.
 *   1,310  what the CBI itself publishes, and the rate at which it sells
 *          dollars to commercial banks. This is what «رسمي» should mean.
 *   1,320  what a person effectively pays at a bank counter once compliance
 *          costs land. Real, widely quoted — but not the CBI's number, and
 *          labelling it as such attributes to the issuer something it did not
 *          say.
 *
 * The gap on the live page was +225 / +17.0% computed against 1,320; against
 * the rate the CBI actually publishes it is +235 / +17.9%.
 *
 * So they are four series, not one number with a rounding argument. Each is
 * recorded separately, each carries its own label and its own source, and the
 * headline spread has exactly one definition — stated below and used
 * everywhere, so a spread series years long never rests on an ambiguous
 * denominator.
 */

/** The series stored in `fx_observations.series`. */
export const FX_SERIES = ['parallel', 'official_cbi', 'official_statutory', 'effective_bank'] as const
export type FxSeries = (typeof FX_SERIES)[number]

/** Where a quote was taken. Baghdad only for now — a city is added when a
 *  source for it exists, never to lengthen the list. */
export type FxLocation = 'baghdad'

/** How a row got into the table. `imported` is history loaded from a published
 *  dataset; `recorded` is an observation this system made itself. The chart
 *  must never imply we were watching the market in 2009. */
export type FxOrigin = 'recorded' | 'imported'

export interface FxObservation {
  series: FxSeries
  location: FxLocation
  buy: number | null
  sell: number | null
  mid: number | null
  observedAt: string
  observedDate: string
  origin: FxOrigin
  sourceKey: string
  sourceUrl?: string | null
  sourceEvent: string
  sourceTs?: string | null
  rawExcerpt?: string | null
}

/**
 * THE spread definition. Parallel midpoint minus the CBI-published rate.
 *
 * Not the statutory rate (which the market does not transact against) and not
 * the effective bank rate (which is itself partly a market outcome, so the
 * difference would compare a market number to a market number). One definition,
 * one denominator, used by the headline figure and by every historical point.
 */
export const SPREAD_NUMERATOR: FxSeries = 'parallel'
export const SPREAD_DENOMINATOR: FxSeries = 'official_cbi'

export function spreadOf(parallelMid: number | null, officialCbi: number | null) {
  if (parallelMid == null || officialCbi == null || officialCbi <= 0) return null
  const abs = parallelMid - officialCbi
  return { abs, pct: (abs / officialCbi) * 100 }
}

/**
 * Iraq is UTC+3 year-round with no daylight saving, so the trading date is a
 * fixed offset from UTC and needs no timezone database. The database column is
 * written rather than generated because `at time zone` is only STABLE in
 * Postgres and cannot appear in a generated column.
 */
export const BAGHDAD_OFFSET_MS = 3 * 60 * 60 * 1000

export function baghdadDate(at: Date | string): string {
  const d = typeof at === 'string' ? new Date(at) : at
  return new Date(d.getTime() + BAGHDAD_OFFSET_MS).toISOString().slice(0, 10)
}

/**
 * The source-event key: the identity of the *published thing* an observation
 * came from, which is what makes repeated fetches idempotent.
 *
 * Two source shapes, one rule. Alsumaria publishes an article per event, so its
 * key is the article id and several may legitimately land in one day. The CBI
 * homepage is a standing table with no event at all, so its key is scoped to
 * the day: fetching it hourly collapses to one row, while a mid-day change to
 * the rate still records, because the stored value is part of the dedupe key.
 */
export function alsumariaEvent(url: string): string {
  const id = url.match(/\/news\/[a-z]+\/(\d+)/)?.[1]
  return `alsumaria:${id ?? url.slice(-40)}`
}

export const cbiWebEvent = (day: string) => `cbi-web:${day}`

/**
 * ⚠ Scoped to the DAY, not the workbook or the year.
 *
 * This was `cbi-xlsx:${year}` and it silently discarded 96% of the history.
 * The dedupe key is (source, event, series, location, buy, sell), and the
 * official rate is flat for years at a time — so every day of 2014 produced
 * the identical key `3|cbi-xlsx:2014|official_cbi|baghdad|~|1166.000`, and
 * only the first day of each (year, rate) pair could ever be stored. 5,497
 * days became 267 rows and the importer reported the rest as "already held".
 *
 * For an event-shaped source the event is the article. For a published
 * dataset, the thing that makes one row distinct from the next is the date its
 * value applies to. Re-running the import still dedupes exactly; a value the
 * bank later revises inserts alongside the original instead of vanishing.
 */
export const cbiXlsxEvent = (day: string) => `cbi-xlsx:${day}`
