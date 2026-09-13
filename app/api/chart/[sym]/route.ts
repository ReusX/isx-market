import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/* The route is served from the CDN for a minute at a time (see the response
   headers below); what it must NOT do is answer from Next's data cache. An
   unqualified `fetch` inside a route handler is cached indefinitely, and
   supabase-js goes through that fetch — so the series froze on the day of the
   last deploy while the header, which reads the same table from the browser,
   kept moving. `force-dynamic` plus `no-store` is the same pair
   /api/cron/daily-prices already uses. */
export const dynamic = 'force-dynamic'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { global: { fetch: (url, init) => fetch(url, { ...init, cache: 'no-store' }) } },
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

  /* The CDN may hold this for a minute; the BROWSER may not hold it at all.
     `public` with no max-age lets a browser cache heuristically, which is how
     a returning reader could keep an old series after the CDN had a new one.
     s-maxage + stale-while-revalidate bound the lag behind a new session at
     three minutes. */
  return NextResponse.json(all, {
    headers: {
      'Cache-Control':
        'public, max-age=0, must-revalidate, s-maxage=60, stale-while-revalidate=120',
    },
  })
}
