import type { Bar } from '@/components/design/ChartEngine'

/**
 * The bridge from `/api/chart/[sym]` into the shape ChartEngine draws.
 *
 * The route pages `daily_prices` past PostgREST's 1,000-row cap and returns
 * `date, open, high, low, close, volume, value` in ascending date order —
 * real daily OHLCV, back to 2010 for the oldest names. There is no intraday
 * data anywhere in the product: the ISX publishes one bulletin per session.
 *
 * Nothing here fabricates. A row missing a usable close is dropped rather
 * than carried forward or interpolated, and a session the exchange did not
 * hold simply is not in the series — ChartEngine indexes by bar, not by
 * calendar day, so a gap never becomes a flat line.
 */

export type ChartRow = {
  date: string
  open: number | null
  high: number | null
  low: number | null
  close: number | null
  volume: number | null
  value: number | null
}

/**
 * A bar needs a close to exist at all. Open/high/low are carried through as
 * they come; where they are missing the bar falls back to the close on all
 * four, which is only ever read in line mode — `hasOhlc` below decides
 * whether candles are offered, so a close-only series never renders as a
 * candle with three invented sides.
 */
export function toBars(rows: ChartRow[]): Bar[] {
  const out: Bar[] = []
  for (const r of rows) {
    const c = r.close
    if (c == null || !(c > 0)) continue
    const t = Date.parse(r.date + 'T00:00:00Z')
    if (!Number.isFinite(t)) continue
    out.push({
      t,
      o: r.open != null && r.open > 0 ? r.open : c,
      h: r.high != null && r.high > 0 ? r.high : c,
      l: r.low != null && r.low > 0 ? r.low : c,
      c,
      v: r.volume ?? 0,
    })
  }
  return out
}

/**
 * True when the series can honestly be drawn as candles.
 *
 * Measured on the SOURCE rows, not the bars, because `toBars` has already
 * substituted the close for anything missing — asking the bars would always
 * say yes. A single flat session (open = high = low = close) is real and
 * common on this exchange, so the test is presence, not variation.
 */
export function hasFullOhlc(rows: ChartRow[]): boolean {
  let usable = 0
  for (const r of rows) {
    if (r.close == null || !(r.close > 0)) continue
    usable++
    if (r.open == null || r.high == null || r.low == null) return false
    if (!(r.open > 0) || !(r.high > 0) || !(r.low > 0)) return false
  }
  return usable > 0
}

/** Whether any session carries a volume figure. Drives the volume pane. */
export const hasAnyVolume = (rows: ChartRow[]) =>
  rows.some(r => r.volume != null && r.volume > 0)
