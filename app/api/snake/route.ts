import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 10

const PTS_PER_FOOD = 100
const DAILY_CAP    = 2000  // max 2000 pts/day from snake (20 foods)

function baghdadDayStart() {
  const now   = new Date()
  const bStr  = now.toLocaleString('en-US', { timeZone: 'Asia/Baghdad' })
  const bDate = new Date(bStr)
  bDate.setHours(0, 0, 0, 0)
  return new Date(bDate.getTime() - 3 * 60 * 60 * 1000).toISOString()
}

// GET — how many pts left today
export async function GET() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ ptsLeft: DAILY_CAP })

  const { data } = await sb
    .from('snake_scores')
    .select('points_awarded')
    .eq('user_id', user.id)
    .gte('created_at', baghdadDayStart())

  const used = (data ?? []).reduce((s, r) => s + (r.points_awarded ?? 0), 0)
  return NextResponse.json({ ptsLeft: Math.max(0, DAILY_CAP - used) })
}

// POST — submit score after game over
export async function POST(req: Request) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const score = Number(body.score)
  if (!Number.isInteger(score) || score < 1 || score > 5000)
    return NextResponse.json({ error: 'Invalid score' }, { status: 400 })

  // Check how many pts already earned today
  const { data: todayRows } = await sb
    .from('snake_scores')
    .select('points_awarded')
    .eq('user_id', user.id)
    .gte('created_at', baghdadDayStart())

  const usedToday     = (todayRows ?? []).reduce((s, r) => s + (r.points_awarded ?? 0), 0)
  const remaining     = Math.max(0, DAILY_CAP - usedToday)
  const rawPts        = score * PTS_PER_FOOD
  const pointsAwarded = Math.min(rawPts, remaining)

  // Award points to profile
  if (pointsAwarded > 0) {
    const { data: profile } = await sb
      .from('profiles').select('points').eq('id', user.id).single()
    if (profile) {
      await sb.from('profiles')
        .update({ points: (profile.points ?? 0) + pointsAwarded })
        .eq('id', user.id)
    }
  }

  // Log the game
  await sb.from('snake_scores').insert({
    user_id:        user.id,
    score,
    points_awarded: pointsAwarded,
  })

  return NextResponse.json({
    pointsAwarded,
    ptsLeft: Math.max(0, remaining - pointsAwarded),
  })
}
