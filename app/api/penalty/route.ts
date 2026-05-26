import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const maxDuration = 10

const POINTS_PER_GOAL  = 100
const MAX_SHOTS_PER_DAY = 10
const KEEPER_SIDES = ['L', 'C', 'R'] as const
const ZONE_TO_SIDE: Record<string, 'L' | 'C' | 'R'> = {
  TL: 'L', TC: 'C', TR: 'R',
  ML: 'L', MC: 'C', MR: 'R',
  BL: 'L', BC: 'C', BR: 'R',
}

function baghdadDayStart() {
  const now     = new Date()
  const bStr    = now.toLocaleString('en-US', { timeZone: 'Asia/Baghdad' })
  const bDate   = new Date(bStr)
  bDate.setHours(0, 0, 0, 0)
  return new Date(bDate.getTime() - 3 * 60 * 60 * 1000).toISOString()
}

function makeClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  )
}

// GET — how many shots left today
export async function GET() {
  const sb = makeClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ shotsLeft: MAX_SHOTS_PER_DAY })

  const { count } = await sb
    .from('penalty_shots')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', baghdadDayStart())

  return NextResponse.json({ shotsLeft: MAX_SHOTS_PER_DAY - (count ?? 0) })
}

// POST — take a shot
export async function POST(req: Request) {
  const sb = makeClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { zone } = await req.json()
  if (!zone || !ZONE_TO_SIDE[zone])
    return NextResponse.json({ error: 'Invalid zone' }, { status: 400 })

  // Check daily limit
  const { count } = await sb
    .from('penalty_shots')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', baghdadDayStart())

  const shotsTaken = count ?? 0
  if (shotsTaken >= MAX_SHOTS_PER_DAY) {
    return NextResponse.json({ error: 'daily_limit', shotsLeft: 0 }, { status: 429 })
  }

  // Keeper randomly dives to L, C, or R
  const keeperSide = KEEPER_SIDES[Math.floor(Math.random() * 3)]
  const shotSide   = ZONE_TO_SIDE[zone]
  const scored     = shotSide !== keeperSide

  // Award points if goal
  if (scored) {
    const { data: profile } = await sb
      .from('profiles').select('points').eq('id', user.id).single()
    if (profile) {
      await sb.from('profiles')
        .update({ points: (profile.points ?? 0) + POINTS_PER_GOAL })
        .eq('id', user.id)
    }
  }

  // Log the shot
  await sb.from('penalty_shots').insert({
    user_id: user.id, scored, shot_zone: zone, keeper_side: keeperSide,
  })

  return NextResponse.json({
    scored,
    keeperSide,
    shotSide,
    shotsLeft: MAX_SHOTS_PER_DAY - shotsTaken - 1,
    points: scored ? POINTS_PER_GOAL : 0,
  })
}
