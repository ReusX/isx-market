import { NextResponse } from 'next/server'
import { PLANS, checkoutOpen, createCheckout, userFromRequest, type Plan } from '@/lib/pro'

/**
 * POST /api/pro/checkout {plan: 'month' | 'year'} · the signed-in user starts
 * a purchase. The user comes from the verified access token, never the body;
 * the price comes from PLANS on the server, never the client.
 */
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  if (!checkoutOpen()) return NextResponse.json({ error: 'not open yet' }, { status: 503 })
  const user = await userFromRequest(req)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const body = (await req.json().catch(() => null)) as { plan?: string } | null
  const plan = body?.plan as Plan
  if (!plan || !(plan in PLANS)) return NextResponse.json({ error: 'bad plan' }, { status: 400 })
  try {
    const url = await createCheckout(user.id, plan, new URL(req.url).origin)
    return NextResponse.json({ url })
  } catch (e) {
    if ((e as Error).message === 'rate') return NextResponse.json({ error: 'too many' }, { status: 429 })
    return NextResponse.json({ error: 'checkout failed' }, { status: 502 })
  }
}
