import { NextResponse } from 'next/server'
import { fxSeries } from '@/lib/fxHistory'
import { envelope, JSON_HEADERS } from '@/lib/openData'

/**
 * GET /data/fx-history.json · the dollar in Baghdad, one row per day.
 *
 *   parallel — our own daily record of the Baghdad (Kifah) close: open/high/
 *              low/close and the buy/sell at close. Starts 2026-08-27, the day
 *              this product began recording; grows by one row a trading day.
 *   official — the Central Bank's published rate, back to 2003.
 *
 * `?from=YYYY-MM-DD` trims both series. Free with attribution (see envelope).
 */
export const revalidate = 900
export async function GET(req: Request) {
  const from = new URL(req.url).searchParams.get('from') ?? undefined
  const ok = from && /^\d{4}-\d{2}-\d{2}$/.test(from) ? from : undefined
  const [parallel, official] = await Promise.all([fxSeries('parallel', { from: ok }), fxSeries('official_cbi', { from: ok })])
  const body = envelope('fx-history', parallel.at(-1)?.date ?? null, 'IQWealth daily record of the Baghdad market close (alsumaria.tv) · Central Bank of Iraq', '/fx', {
    unit: 'IQD per 1 USD',
    parallel: { since: parallel[0]?.date ?? null, rows: parallel.map((d) => ({ date: d.date, open: d.open, high: d.high, low: d.low, close: d.close, buy: d.buy, sell: d.sell })) },
    official: { since: official[0]?.date ?? null, rows: official.map((d) => ({ date: d.date, rate: d.close })) },
  })
  return NextResponse.json(body, { headers: JSON_HEADERS })
}
