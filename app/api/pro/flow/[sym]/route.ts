import { NextResponse } from 'next/server'
import { companyFlowHistory } from '@/lib/marketServer'
import { proUntil, userFromRequest } from '@/lib/pro'

/** GET /api/pro/flow/[sym] · a company's whole foreign-flow history, for a reader with a running «برو» pass. */
export const dynamic = 'force-dynamic'

export async function GET(req: Request, props: { params: Promise<{ sym: string }> }) {
  const user = await userFromRequest(req)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!(await proUntil(user.id))) return NextResponse.json({ error: 'pro required' }, { status: 402 })
  const { sym } = await props.params
  if (!/^[A-Za-z0-9]{2,8}$/.test(sym)) return NextResponse.json({ error: 'bad symbol' }, { status: 400 })
  return NextResponse.json({ flow: await companyFlowHistory(sym) }, { headers: { 'Cache-Control': 'private, no-store' } })
}
