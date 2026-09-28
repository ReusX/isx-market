import { NextResponse } from 'next/server'
import { fetchCurrencies, fetchFx } from '@/lib/rates'
import { envelope, JSON_HEADERS } from '@/lib/openData'

/**
 * GET /data/currencies.json · units of each currency per US dollar (world
 * cross rates) and the Baghdad dollar, so dinars per unit = parallelUsd ÷ perUsd.
 * Read by the app's home-screen widgets.
 */
export const revalidate = 3600
export async function GET() {
  const [cur, fx] = await Promise.all([fetchCurrencies(), fetchFx()])
  const body = envelope('currencies', cur?.updatedAt?.slice(0, 10) ?? null, cur ? `${cur.source} (${cur.sourceUrl})` : 'unavailable', '/currencies', {
    unit: 'units per 1 USD; IQD per unit = parallelUsd / perUsd',
    parallelUsd: fx?.sell ?? fx?.buy ?? null,
    perUsd: cur?.perUsd ?? {},
  })
  return NextResponse.json(body, { headers: JSON_HEADERS })
}
