import { NextResponse } from 'next/server'
import { checkoutOpen, proUntil, userFromRequest, waylEnv } from '@/lib/pro'

/** GET /api/pro/status · the signed-in user's pass: {proUntil} (null when none) and whether payments are in Wayl's test mode. */
export const dynamic = 'force-dynamic'

/* «test» only where test payments really run (local, previews); «open» false on the live site until WAYL_ENV=live. */
const flags = () => ({ open: checkoutOpen(), test: checkoutOpen() && waylEnv() === 'test' })

export async function GET(req: Request) {
  const user = await userFromRequest(req)
  if (!user) return NextResponse.json({ proUntil: null, ...flags() })
  return NextResponse.json({ proUntil: await proUntil(user.id), ...flags() }, { headers: { 'Cache-Control': 'private, no-store' } })
}
