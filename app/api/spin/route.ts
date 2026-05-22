import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const PRIZES = [
  { pts: 50,   special: '',   prob: 30 },
  { pts: 100,  special: '',   prob: 25 },
  { pts: 200,  special: '',   prob: 18 },
  { pts: 500,  special: '',   prob: 12 },
  { pts: 0,    special: 'x2', prob: 8  },
  { pts: 1000, special: '',   prob: 5  },
  { pts: 5000, special: '',   prob: 2  },
]

function pickPrize() {
  const total = PRIZES.reduce((s, p) => s + p.prob, 0)
  let roll = Math.random() * total
  for (const p of PRIZES) {
    roll -= p.prob
    if (roll <= 0) return p
  }
  return PRIZES[0]
}

export async function POST() {
  const sb   = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

  // Check cooldown + load streak
  const { data: profile } = await sb.from('profiles').select('points, streak, spin_cooldown_ends_at').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ ok: false, error: 'Profile not found' }, { status: 404 })

  if (profile.spin_cooldown_ends_at) {
    const ends = new Date(profile.spin_cooldown_ends_at)
    if (ends > new Date()) {
      return NextResponse.json({ ok: false, error: 'on_cooldown', cooldown_ends: profile.spin_cooldown_ends_at })
    }
  }

  // ── Streak logic ─────────────────────────────────────────────────────────────
  // spin_cooldown_ends_at = last_spin_at + 24h
  // If user spins within the 24h–48h window after last spin → streak continues
  // If they missed a day (>48h gap) → streak resets to 1
  let newStreak = 1
  if (profile.spin_cooldown_ends_at) {
    const lastSpinAt  = new Date(profile.spin_cooldown_ends_at).getTime() - 24 * 3600 * 1000
    const hoursSince  = (Date.now() - lastSpinAt) / 3600000
    // Window: cooldown just ended (24h) up to 48h → consecutive day
    if (hoursSince >= 24 && hoursSince < 48) {
      newStreak = (profile.streak ?? 0) + 1
    }
    // > 48h means they skipped a day → streak resets to 1
  }

  const prize    = pickPrize()
  const newPts   = (profile.points ?? 0) + prize.pts
  const cooldown = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  await sb.from('profiles').update({
    points: newPts,
    streak: newStreak,
    spin_cooldown_ends_at: cooldown,
  }).eq('id', user.id)

  // Log transaction
  await sb.from('transactions').insert({
    user_id:    user.id,
    kind:       'spin',
    amount:     prize.pts,
    sym:        null,
    qty:        null,
    notes:      prize.special || null,
  })

  return NextResponse.json({ ok: true, prize_pts: prize.pts, special: prize.special, new_points: newPts, new_streak: newStreak })
}
