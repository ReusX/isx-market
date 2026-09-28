import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * POST /api/account/delete · the signed-in user deletes their own account.
 *
 * Authorised by the caller's Supabase access token (Authorization: Bearer …),
 * verified server-side; the id to delete is taken from that verified token and
 * never from the request body, so a caller can only ever delete themselves.
 * Deletes the user's rows (profiles — which holds the synced watchlist,
 * portfolio and alerts — and every other per-user table below) and then the
 * Supabase Auth user (email, phone, password). Google Play's account-deletion policy; privacy policy
 * section «حذف الحساب والبيانات».
 */
export const dynamic = 'force-dynamic'

const USER_TABLES = ['chat_messages', 'penalty_shots', 'holdings', 'transactions', 'wallet_requests', 'snake_scores', 'quest_completions'] as const

export async function POST(req: Request) {
  const token = /^Bearer\s+(.+)$/.exec(req.headers.get('authorization') ?? '')?.[1]
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const db = createAdminClient()
  const { data, error } = await db.auth.getUser(token)
  const id = data?.user?.id
  if (error || !id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  /* Every table that holds a row per user. chat_messages and penalty_shots
     reference auth.users without ON DELETE CASCADE, so a row left in either
     makes deleteUser fail; the others (the retired games and wallet) have no
     foreign key and would otherwise outlive the account. */
  const results = await Promise.all([
    ...USER_TABLES.map((t) => db.from(t).delete().eq('user_id', id)),
    db.from('referrals').delete().or(`referrer_id.eq.${id},referred_id.eq.${id}`),
    db.from('profiles').update({ referred_by: null }).eq('referred_by', id),
  ])
  if (results.some((r) => r.error)) return NextResponse.json({ error: 'delete failed' }, { status: 500 })
  const prof = await db.from('profiles').delete().eq('id', id)
  if (prof.error) return NextResponse.json({ error: 'delete failed' }, { status: 500 })
  const { error: authErr } = await db.auth.admin.deleteUser(id)
  if (authErr) return NextResponse.json({ error: 'delete failed' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
