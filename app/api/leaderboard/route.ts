import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const sb = await createClient()
  const { data, error } = await sb
    .from('profiles')
    .select('username, points, streak')
    .order('points', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  const entries = (data ?? []).map(row => ({
    username: row.username ?? 'Anonymous',
    points:   row.points ?? 0,
    streak:   row.streak ?? 0,
  }))

  return NextResponse.json({ ok: true, entries })
}
