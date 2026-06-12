import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// Fetch all daily_prices for a ticker with pagination to bypass the 1000-row default.
export async function GET(req: NextRequest, { params }: { params: { sym: string } }) {
  const ticker = params.sym.toUpperCase()
  const all: unknown[] = []
  const PAGE = 1000
  let offset = 0

  while (true) {
    const { data, error } = await sb
      .from('daily_prices')
      .select('date,open,high,low,close,volume,value')
      .eq('ticker', ticker)
      .order('date')
      .range(offset, offset + PAGE - 1)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data || data.length === 0) break
    all.push(...data)
    if (data.length < PAGE) break
    offset += PAGE
  }

  return NextResponse.json(all, {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
  })
}
