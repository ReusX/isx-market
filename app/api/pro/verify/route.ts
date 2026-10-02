import { NextResponse } from 'next/server'
import { confirmPaid, proUntil, userFromRequest } from '@/lib/pro'

/**
 * POST /api/pro/verify {referenceId} · the return page asks whether its
 * order went through (in case the webhook is late). Only the order's owner
 * may ask; the answer comes from Wayl, through confirmPaid.
 */
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const user = await userFromRequest(req)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const ref = ((await req.json().catch(() => null)) as { referenceId?: string } | null)?.referenceId ?? ''
  if (!/^pro-(month|year)-[a-z0-9]+-[a-f0-9]{12}$/.test(ref)) return NextResponse.json({ error: 'bad reference' }, { status: 400 })
  const r = await confirmPaid(ref)
  if (r.userId !== user.id) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json({ paid: r.paid, status: r.status, proUntil: await proUntil(user.id) })
}
