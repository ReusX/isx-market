import { NextResponse } from 'next/server'
import { loadFinancials } from '@/lib/marketServer'
import { proUntil, userFromRequest } from '@/lib/pro'

/**
 * GET /api/pro/financials/[sym] · the whole financials model, for a reader
 * with a running «برو» pass. The page itself only carries the free part.
 */
export const dynamic = 'force-dynamic'

export async function GET(req: Request, props: { params: Promise<{ sym: string }> }) {
  const user = await userFromRequest(req)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!(await proUntil(user.id))) return NextResponse.json({ error: 'pro required' }, { status: 402 })
  const { sym } = await props.params
  if (!/^[A-Za-z0-9]{2,8}$/.test(sym)) return NextResponse.json({ error: 'bad symbol' }, { status: 400 })
  const r = await loadFinancials(sym)
  return NextResponse.json({ fin: r.fin }, { headers: { 'Cache-Control': 'private, no-store' } })
}
