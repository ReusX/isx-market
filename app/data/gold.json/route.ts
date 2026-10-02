import { NextResponse } from 'next/server'
import { fetchGold } from '@/lib/rates'
import { envelope, JSON_HEADERS } from '@/lib/openData'

/** GET /data/gold.json · gold in Iraq per gram by carat, the mithqal (4.608 g), the ounce. */
export const revalidate = 3600
export async function GET() {
  const g = await fetchGold()
  const body = envelope('gold', g?.date ?? null, g ? `${g.source} (${g.sourceUrl})` : 'unavailable', '/gold', {
    unit: 'IQD and USD',
    gramByCarat: (g?.grams ?? []).map((k) => ({ karat: k.karat, iqd: k.iqd, usd: k.usd, mithqalIqd: Math.round(k.iqd * 4.608) })),
    ounce: { sell: g?.ounceSell ?? null, buy: g?.ounceBuy ?? null },
    /* The previous day's prices from the same source, for the day's change. */
    previous: g?.prev ? { date: g.prev.date, gramByCarat: g.prev.grams.map((k) => ({ karat: k.karat, iqd: k.iqd, mithqalIqd: Math.round(k.iqd * 4.608) })) } : null,
  })
  return NextResponse.json(body, { headers: JSON_HEADERS })
}
