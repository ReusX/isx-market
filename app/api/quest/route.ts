import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 10

// ── Quest config ─────────────────────────────────────────────────────────────
const QUESTS: Record<string, { pts: number; daily: boolean }> = {
  market_visit:     { pts: 10,  daily: true  },
  chart_view:       { pts: 15,  daily: true  },
  currency_convert: { pts: 10,  daily: true  },
  spin_wheel:       { pts: 50,  daily: true  },
  watchlist_3:      { pts: 20,  daily: false },
  first_trade:      { pts: 100, daily: false },
  streak_7:         { pts: 300, daily: false },
}

function baghdadDayStart() {
  const now   = new Date()
  const bStr  = now.toLocaleString('en-US', { timeZone: 'Asia/Baghdad' })
  const bDate = new Date(bStr)
  bDate.setHours(0, 0, 0, 0)
  return new Date(bDate.getTime() - 3 * 60 * 60 * 1000).toISOString()
}

// GET — return today's completed quest IDs (and all-time for one-time quests)
export async function GET() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ completed: [] })

  const dayStart = baghdadDayStart()

  // Fetch all completions (we'll filter client-side by daily/one-time)
  const { data } = await sb
    .from('quest_completions')
    .select('quest_id, completed_at')
    .eq('user_id', user.id)
    .order('completed_at', { ascending: false })

  const completed: string[] = []
  const seen = new Set<string>()

  for (const row of data ?? []) {
    const cfg = QUESTS[row.quest_id]
    if (!cfg) continue
    if (seen.has(row.quest_id)) continue
    // Daily quests: only count if completed today
    if (cfg.daily && row.completed_at < dayStart) continue
    completed.push(row.quest_id)
    seen.add(row.quest_id)
  }

  return NextResponse.json({ completed })
}

// POST — complete a quest and award points
export async function POST(req: Request) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

  const { quest_id } = await req.json()
  const cfg = QUESTS[quest_id]
  if (!cfg) return NextResponse.json({ ok: false, error: 'Unknown quest' }, { status: 400 })

  const dayStart = baghdadDayStart()

  // Check if already completed (today for daily, ever for one-time)
  const query = sb
    .from('quest_completions')
    .select('id')
    .eq('user_id', user.id)
    .eq('quest_id', quest_id)
  if (cfg.daily) query.gte('completed_at', dayStart)

  const { data: existing } = await query.limit(1)
  if (existing && existing.length > 0) {
    return NextResponse.json({ ok: false, error: 'already_done' })
  }

  // Extra server-side validation for one-time quests
  if (quest_id === 'first_trade') {
    const { count } = await sb
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
    if (!count || count < 1) return NextResponse.json({ ok: false, error: 'condition_not_met' })
  }

  if (quest_id === 'streak_7') {
    const { data: profile } = await sb
      .from('profiles').select('streak').eq('id', user.id).single()
    if (!profile || (profile.streak ?? 0) < 7)
      return NextResponse.json({ ok: false, error: 'condition_not_met' })
  }

  if (quest_id === 'watchlist_3') {
    const { data: profile } = await sb
      .from('profiles').select('watchlist').eq('id', user.id).single()
    const wl = profile?.watchlist ?? []
    if (!Array.isArray(wl) || wl.length < 3)
      return NextResponse.json({ ok: false, error: 'condition_not_met' })
  }

  // Award points
  const { data: profile } = await sb
    .from('profiles').select('points').eq('id', user.id).single()
  if (profile) {
    await sb.from('profiles')
      .update({ points: (profile.points ?? 0) + cfg.pts })
      .eq('id', user.id)
  }

  // Log completion
  await sb.from('quest_completions').insert({
    user_id:  user.id,
    quest_id,
    pts_awarded: cfg.pts,
  })

  return NextResponse.json({ ok: true, pts: cfg.pts })
}
