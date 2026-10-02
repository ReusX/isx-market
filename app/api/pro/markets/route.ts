import { NextResponse } from 'next/server'
import { fetchFx } from '@/lib/rates'
import { proUntil, userFromRequest } from '@/lib/pro'

/**
 * GET /api/pro/markets · the dollar's latest bid/ask on the six exchanges the
 * Kifah channel posts besides Kifah (lib/rates parseKifahChannel), for a
 * reader with a running «برو» pass. Pages never carry these numbers.
 */
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const user = await userFromRequest(req)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!(await proUntil(user.id))) return NextResponse.json({ error: 'pro required' }, { status: 402 })
  const fx = await fetchFx()
  const kifah = fx?.markets?.find((m) => m.market === 'kifah') ?? null
  return NextResponse.json({
    kifah: kifah ? { bid: kifah.bid, ask: kifah.ask } : null,
    markets: (fx?.markets ?? []).filter((m) => m.market !== 'kifah').map((m) => ({ market: m.market, bid: m.bid, ask: m.ask, at: m.at })),
  }, { headers: { 'Cache-Control': 'private, no-store' } })
}
