import { NextResponse } from 'next/server'
import { fetchFx } from '@/lib/rates'
import { CBI_OFFICIAL_RATE, CBI_RATE_CONFIRMED } from '@/lib/fxOfficial'
import { envelope, JSON_HEADERS } from '@/lib/openData'

/** GET /data/fx.json · the dollar in Baghdad: parallel buy/sell, the CBI official rate, the gap. */
export const revalidate = 900
export async function GET() {
  const fx = await fetchFx()
  const sell = fx?.sell ?? null, buy = fx?.buy ?? null
  const body = envelope('fx', fx?.date ?? null, fx ? `${fx.source} (${fx.sourceUrl})` : 'unavailable', '/fx', {
    unit: 'IQD per 1 USD',
    parallel: { buy, sell, stale: Boolean(fx?.stale) },
    official: { cbi: CBI_OFFICIAL_RATE, confirmed: CBI_RATE_CONFIRMED },
    gapPct: sell ? +(((sell - CBI_OFFICIAL_RATE) / CBI_OFFICIAL_RATE) * 100).toFixed(2) : null,
  })
  return NextResponse.json(body, { headers: JSON_HEADERS })
}
