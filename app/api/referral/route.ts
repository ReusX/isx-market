import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await sb.from('profiles').select('referral_code').eq('id', user.id).single()
  const { data: referrals } = await sb.from('referrals').select('*').eq('referrer_id', user.id)

  return NextResponse.json({
    ok: true,
    referral_code: profile?.referral_code,
    total_referrals: referrals?.length ?? 0,
    total_earned: (referrals?.length ?? 0) * 500,
  })
}

export async function POST(req: NextRequest) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

  const { code } = await req.json()
  if (!code) return NextResponse.json({ ok: false, error: 'Missing code' })

  // Find referrer
  const { data: referrer } = await sb.from('profiles').select('id, points').eq('referral_code', code.toUpperCase()).single()
  if (!referrer) return NextResponse.json({ ok: false, error: 'Invalid code' })
  if (referrer.id === user.id) return NextResponse.json({ ok: false, error: 'Cannot use own code' })

  // Check not already referred
  const { data: existing } = await sb.from('referrals').select('id').eq('referred_id', user.id).single()
  if (existing) return NextResponse.json({ ok: false, error: 'Already referred' })

  // Award referrer
  await sb.from('profiles').update({ points: (referrer.points ?? 0) + 500 }).eq('id', referrer.id)
  await sb.from('referrals').insert({ referrer_id: referrer.id, referred_id: user.id })

  // Award new user
  const { data: myProf } = await sb.from('profiles').select('points').eq('id', user.id).single()
  await sb.from('profiles').update({ points: (myProf?.points ?? 0) + 250, referred_by: referrer.id }).eq('id', user.id)

  return NextResponse.json({ ok: true, bonus: 250 })
}
