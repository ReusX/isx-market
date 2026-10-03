import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * GET /api/flow/market · the market-wide foreign flow per session (buy and
 * sell summed over every company), last 20 sessions, for the homepage ring.
 *
 * The per-company table is «برو» data and is not readable with the public
 * key, so the homepage no longer reads it from the browser: the server sums
 * it here and only the market totals leave.
 */
export const revalidate = 600

export async function GET() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  const by = new Map<string, { buy: number; sell: number }>()
  for (let f = 0; f < 6000; f += 1000) {
    const { data, error } = await sb.from('foreign_flow_company_daily').select('date,side,value').order('date', { ascending: false }).range(f, f + 999)
    if (error || !data?.length) break
    for (const r of data as { date: string; side: string; value: number | null }[]) {
      const d = by.get(r.date) ?? { buy: 0, sell: 0 }
      if (r.side === 'buy') d.buy += Number(r.value ?? 0); else if (r.side === 'sell') d.sell += Number(r.value ?? 0)
      by.set(r.date, d)
    }
    if (by.size > 21 || data.length < 1000) break
  }
  /* The oldest date may be cut mid-way by the paging; drop it when there are enough. */
  const dates = Array.from(by.keys()).sort().reverse().slice(0, 20)
  const rows = dates.flatMap((date) => [{ date, side: 'buy', value: by.get(date)!.buy }, { date, side: 'sell', value: by.get(date)!.sell }])
  return NextResponse.json({ rows }, { headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600' } })
}
