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

  // Check cooldown
  const { data: profile } = await sb.from('profiles').select('points, spin_cooldown_ends_at').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ ok: false, error: 'Profile not found' }, { status: 404 })

  if (profile.spin_cooldown_ends_at) {
    const ends = new Date(profile.spin_cooldown_ends_at)
    if (ends > new Date()) {
      return NextResponse.json({ ok: false, error: 'on_cooldown', cooldown_ends: profile.spin_cooldown_ends_at })
    }
  }

  const prize     = pickPrize()
  const newPts    = (profile.points ?? 0) + prize.pts
  const cooldown  = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  await sb.from('profiles').update({
    points: newPts,
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

  return NextResponse.json({ ok: true, prize_pts: prize.pts, special: prize.special, new_points: newPts })
}
