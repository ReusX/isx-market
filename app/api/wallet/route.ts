import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

  const [{ data: profile }, { data: holdings }, { data: txs }] = await Promise.all([
    sb.from('profiles').select('points, cash_balance, streak, spin_cooldown_ends_at').eq('id', user.id).single(),
    sb.from('holdings').select('*').eq('user_id', user.id),
    sb.from('transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
  ])

  return NextResponse.json({ ok: true, profile, holdings, transactions: txs })
}

export async function POST(req: NextRequest) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { action, amount, sym, qty, price } = body

  if (action === 'deposit_request') {
    if (!amount || amount <= 0) return NextResponse.json({ ok: false, error: 'Invalid amount' })
    await sb.from('wallet_requests').insert({
      user_id: user.id,
      kind: 'deposit',
      amount,
      status: 'pending',
    })
    return NextResponse.json({ ok: true })
  }

  if (action === 'buy_with_points') {
    if (!sym || !qty || !price) return NextResponse.json({ ok: false, error: 'Missing fields' })
    const { data: prof } = await sb.from('profiles').select('points').eq('id', user.id).single()
    const currentPoints = (prof as any)?.points ?? 0
    const costInPoints = Math.round(qty * price) // 1 point = 1 IQD

    if (currentPoints < costInPoints) {
      return NextResponse.json({ ok: false, error: 'Insufficient points' })
    }

    const { data: existing } = await sb.from('holdings').select('*').eq('user_id', user.id).eq('sym', sym).maybeSingle()
    if (existing) {
      const newQty = existing.qty + qty
      const newAvg = (existing.avg_price * existing.qty + price * qty) / newQty
      await sb.from('holdings').update({ qty: newQty, avg_price: newAvg }).eq('id', existing.id)
    } else {
      await sb.from('holdings').insert({ user_id: user.id, sym, qty, avg_price: price })
    }

    await sb.from('profiles').update({ points: currentPoints - costInPoints }).eq('id', user.id)
    await sb.from('transactions').insert({
      user_id: user.id, kind: 'buy', sym, qty,
      amount: costInPoints, notes: 'points_purchase',
    })

    return NextResponse.json({ ok: true, pointsSpent: costInPoints, remainingPoints: currentPoints - costInPoints })
  }

  if (action === 'buy' || action === 'sell') {
    if (!sym || !qty || !price) return NextResponse.json({ ok: false, error: 'Missing fields' })

    const { data: profile } = await sb.from('profiles').select('cash_balance').eq('id', user.id).single()
    const cash = (profile as any)?.cash_balance ?? 10_000_000
    const total = qty * price

    if (action === 'buy') {
      if (cash < total) return NextResponse.json({ ok: false, error: 'Insufficient funds' })

      // Upsert holding
      const { data: existing } = await sb.from('holdings').select('*').eq('user_id', user.id).eq('sym', sym).single()
      if (existing) {
        const newQty = existing.qty + qty
        const newAvg = (existing.avg_price * existing.qty + price * qty) / newQty
        await sb.from('holdings').update({ qty: newQty, avg_price: newAvg }).eq('id', existing.id)
      } else {
        await sb.from('holdings').insert({ user_id: user.id, sym, qty, avg_price: price })
      }

      await sb.from('profiles').update({ cash_balance: cash - total }).eq('id', user.id)
    }

    if (action === 'sell') {
      const { data: holding } = await sb.from('holdings').select('*').eq('user_id', user.id).eq('sym', sym).single()
      if (!holding || holding.qty < qty) return NextResponse.json({ ok: false, error: 'Insufficient shares' })

      const newQty = holding.qty - qty
      if (newQty === 0) {
        await sb.from('holdings').delete().eq('id', holding.id)
      } else {
        await sb.from('holdings').update({ qty: newQty }).eq('id', holding.id)
      }
      await sb.from('profiles').update({ cash_balance: cash + total }).eq('id', user.id)
    }

    await sb.from('transactions').insert({
      user_id: user.id,
      kind: action,
      sym, qty, amount: total,
    })

    // Award points for trading
    const { data: prof } = await sb.from('profiles').select('points').eq('id', user.id).single()
    const bonusPts = Math.floor(total / 100000) // 1 pt per 100K IQD traded
    if (bonusPts > 0) {
      await sb.from('profiles').update({ points: (prof?.points ?? 0) + bonusPts }).eq('id', user.id)
    }

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ ok: false, error: 'Unknown action' })
}
