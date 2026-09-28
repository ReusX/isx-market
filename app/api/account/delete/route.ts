import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * POST /api/account/delete · the signed-in user deletes their own account.
 *
 * Authorised by the caller's Supabase access token (Authorization: Bearer …),
 * verified server-side; the id to delete is taken from that verified token and
 * never from the request body, so a caller can only ever delete themselves.
 * Deletes the user's rows (chat_messages, profiles — which holds the synced
 * watchlist, portfolio and alerts) and then the Supabase Auth user (email,
 * phone, password). Google Play's account-deletion policy; privacy policy
 * section «حذف الحساب والبيانات».
 */
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const token = /^Bearer\s+(.+)$/.exec(req.headers.get('authorization') ?? '')?.[1]
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const db = createAdminClient()
  const { data, error } = await db.auth.getUser(token)
  const id = data?.user?.id
  if (error || !id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const chat = await db.from('chat_messages').delete().eq('user_id', id)
  const prof = await db.from('profiles').delete().eq('id', id)
  if (chat.error || prof.error) return NextResponse.json({ error: 'delete failed' }, { status: 500 })
  const { error: authErr } = await db.auth.admin.deleteUser(id)
  if (authErr) return NextResponse.json({ error: 'delete failed' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
