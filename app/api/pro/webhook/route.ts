import { NextResponse } from 'next/server'
import { confirmPaid, signatureOk } from '@/lib/pro'

/**
 * POST /api/pro/webhook · Wayl's payment-status callback.
 *
 * The signature is checked, but it is not what grants anything: the order is
 * re-read from Wayl with our key (confirmPaid), so a forged or replayed call
 * can at most make us ask Wayl again.
 */
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const raw = await req.text()
  if (!signatureOk(raw, req.headers.get('x-wayl-signature-256'))) return NextResponse.json({ error: 'bad signature' }, { status: 401 })
  let ref: string | undefined
  try { ref = (JSON.parse(raw) as { referenceId?: string; data?: { referenceId?: string } }).referenceId ?? JSON.parse(raw).data?.referenceId } catch { /* below */ }
  if (!ref || !/^pro-(month|year)-[a-z0-9]+-[a-f0-9]{12}$/.test(ref)) return NextResponse.json({ error: 'bad reference' }, { status: 400 })
  const r = await confirmPaid(ref)
  return NextResponse.json({ ok: true, paid: r.paid })
}
