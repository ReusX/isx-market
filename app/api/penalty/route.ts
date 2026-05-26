import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const maxDuration = 10

const POINTS_PER_GOAL   = 100
const MAX_SHOTS_PER_DAY = 10

// Keeper now dives to one of 6 zones (top/bottom × left/center/right)
type KeeperDive = 'TL' | 'TC' | 'TR' | 'BL' | 'BC' | 'BR'
const KEEPER_DIVES: KeeperDive[] = ['TL', 'TC', 'TR', 'BL', 'BC', 'BR']

// Middle zones share a side with two keeper dive positions
const MIDDLE_SAME_SIDE: Record<string, KeeperDive[]> = {
  ML: ['TL', 'BL'],
  MC: ['TC', 'BC'],
  MR: ['TR', 'BR'],
}

function calcScored(zone: string, keeperDive: KeeperDive): boolean {
  // Exact zone match → always saved
  if (zone === keeperDive) return false

  // Middle zones: keeper on same side (top or bottom) → 50 % save chance
  const sameSide = MIDDLE_SAME_SIDE[zone]
  if (sameSide?.includes(keeperDive)) return Math.random() >= 0.5

  // Any other case → goal
  return true
}

function baghdadDayStart() {
  const now   = new Date()
  const bStr  = now.toLocaleString('en-US', { timeZone: 'Asia/Baghdad' })
  const bDate = new Date(bStr)
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

// GET — shots left today
export async function GET() {
  const sb = makeClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ shotsLeft: MAX_SHOTS_PER_DAY })

  const { data: profile } = await sb
    .from('profiles').select('unlimited_games').eq('id', user.id).single()
  if (profile?.unlimited_games) return NextResponse.json({ shotsLeft: 999 })

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
  const validZones = ['TL','TC','TR','ML','MC','MR','BL','BC','BR']
  if (!zone || !validZones.includes(zone))
    return NextResponse.json({ error: 'Invalid zone' }, { status: 400 })

  const { data: profile } = await sb
    .from('profiles').select('points, unlimited_games').eq('id', user.id).single()
  const unlimited = profile?.unlimited_games ?? false

  if (!unlimited) {
    const { count } = await sb
      .from('penalty_shots')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', baghdadDayStart())

    if ((count ?? 0) >= MAX_SHOTS_PER_DAY)
      return NextResponse.json({ error: 'daily_limit', shotsLeft: 0 }, { status: 429 })
  }

  // Keeper picks one of 6 dive directions
  const keeperDive = KEEPER_DIVES[Math.floor(Math.random() * KEEPER_DIVES.length)]
  const scored = calcScored(zone, keeperDive)

  if (scored && profile) {
    await sb.from('profiles')
      .update({ points: (profile.points ?? 0) + POINTS_PER_GOAL })
      .eq('id', user.id)
  }

  const { count: newCount } = unlimited ? { count: 0 } : await sb
    .from('penalty_shots')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', baghdadDayStart())

  await sb.from('penalty_shots').insert({
    user_id: user.id, scored, shot_zone: zone, keeper_side: keeperDive,
  })

  return NextResponse.json({
    scored,
    keeperDive,           // e.g. "TL", "BR" — used by page for animation
    shotsLeft: unlimited ? 999 : MAX_SHOTS_PER_DAY - ((newCount ?? 0) + 1),
    points: scored ? POINTS_PER_GOAL : 0,
  })
}
