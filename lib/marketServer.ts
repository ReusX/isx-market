import { cache } from 'react'
import { createClient } from '@supabase/supabase-js'
import { fetchLiveWith, mergeCompanies } from '@/lib/market'
import companiesData from '@/public/data/companies.json'
import type { Company, CompanyMeta } from '@/types'
import type { IndexRow } from '@/lib/homeData'

/**
 * What the market page needs on the SERVER, so the session figures and the
 * board are in the HTML — for first paint and for the crawler — rather than
 * arriving after JavaScript.
 *
 * A plain client whose fetches revalidate every 60s: `supabase-js` uses the
 * global fetch, and left to Next's Data Cache the session would freeze for
 * ever (the bug that once froze every company chart at 1 September). Not
 * `no-store`, though — that would opt the ROOT out of prerendering, and the
 * root must stay a static, revalidating page.
 */
export type MarketInitial = {
  session: string | null
  /** Session dates the picker can move between, newest first (≈ two years). */
  sessions: string[]
  companies: Company[]
  /** The last 21 sessions' totals, oldest first. */
  recent: IndexRow[]
  /** 45 days of closes per ticker, for the 7- and 30-day columns. */
  hist: Record<string, { date: string; close: number }[]>
}

function client() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { fetch: (u, i) => fetch(u, { ...i, next: { revalidate: 60 } }) },
    auth: { persistSession: false },
  })
}

/**
 * `date`: a past session for the board; omitted → the latest. A date with no
 * session (a Friday, a holiday) snaps to the last session on or before it.
 * Wrapped in React's `cache` so the page and its metadata share one load.
 */
export const loadMarketInitial = cache(async (date?: string): Promise<MarketInitial> => {
  const sb = client()
  const empty: MarketInitial = { session: null, sessions: [], companies: [], recent: [], hist: {} }
  let until = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined
  if (until) {
    const { data } = await sb.from('daily_prices').select('date').lte('date', until).order('date', { ascending: false }).limit(1)
    until = (data?.[0]?.date as string | undefined) ?? undefined
  }
  try {
    const [live, recentRes, hist, sessionsRes] = await Promise.all([
      fetchLiveWith(sb, until),
      (until
        ? sb.from('daily_index').select('date,isx60,total_value,total_volume,total_trades,traded_companies,listed_companies').gt('isx60', 0).lte('date', until)
        : sb.from('daily_index').select('date,isx60,total_value,total_volume,total_trades,traded_companies,listed_companies').gt('isx60', 0)
      ).order('date', { ascending: false }).limit(21),
      (async () => {
        const end = until ? new Date(until).getTime() : Date.now()
        const since = new Date(end - 45 * 86400_000).toISOString().slice(0, 10)
        const by: MarketInitial['hist'] = {}
        for (let from = 0; ; from += 1000) {
          let q = sb.from('daily_prices').select('ticker,date,close').gte('date', since)
          if (until) q = q.lte('date', until)
          const { data, error } = await q.order('date').range(from, from + 999)
          if (error || !data?.length) break
          for (const r of data as { ticker: string; date: string; close: number | null }[]) {
            if (r.close != null && r.close > 0) (by[r.ticker] ??= []).push({ date: r.date, close: r.close })
          }
          if (data.length < 1000) break
        }
        return by
      })(),
      sb.from('daily_index').select('date').gt('isx60', 0).order('date', { ascending: false }).limit(500),
    ])
    return {
      session: live.updated || null,
      sessions: ((sessionsRes.data ?? []) as { date: string }[]).map((r) => r.date),
      companies: mergeCompanies(companiesData as CompanyMeta[], live.stocks),
      recent: ((recentRes.data ?? []) as IndexRow[]).slice().reverse(),
      hist,
    }
  } catch {
    return empty
  }
})
