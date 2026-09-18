import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import companiesData from '@/public/data/companies.json'
import { envelope, JSON_HEADERS } from '@/lib/openData'

/** GET /data/quotes.json · every company's last session: close, change vs the previous session, value, volume, trades. */
export const revalidate = 3600
type Px = { ticker: string; date: string; close: number | null; value: number | null; volume: number | null; trades: number | null }
export async function GET() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } })
  const { data: idx } = await sb.from('daily_index').select('date').gt('isx60', 0).order('date', { ascending: false }).limit(2)
  const dates = ((idx ?? []) as { date: string }[]).map((r) => r.date)
  if (!dates.length) return NextResponse.json(envelope('quotes', null, 'Iraq Stock Exchange daily bulletin', '/market', { companies: [] }), { headers: JSON_HEADERS })
  /* Every listed company: the session's rows carry value/volume/trades for
     the names that traded; company_metrics carries the last known close and
     its date for the ones that did not, so an untraded name still answers
     «what is the price» — with `traded: false` and the date it last did. */
  const [pxRes, cmRes] = await Promise.all([
    sb.from('daily_prices').select('ticker,date,close,value,volume,trades').eq('date', dates[0]).range(0, 1999),
    sb.from('company_metrics').select('ticker,last_close,prev_close,last_date,days_since_trade').range(0, 999),
  ])
  const px = new Map(((pxRes.data ?? []) as Px[]).map((r) => [r.ticker, r]))
  const cm = new Map(((cmRes.data ?? []) as { ticker: string; last_close: number | null; prev_close: number | null; last_date: string | null; days_since_trade: number | null }[]).map((r) => [r.ticker, r]))
  const companies = (companiesData as { sym: string; ar: string; en: string; sec?: string }[]).map((m) => {
    const r = px.get(m.sym), c = cm.get(m.sym)
    const close = r?.close ?? c?.last_close ?? null, p = c?.prev_close ?? null
    const traded = Boolean(r && (r.trades ?? 0) > 0)
    return {
      ticker: m.sym, nameAr: m.ar || null, nameEn: m.en || null, sector: m.sec ?? null,
      close, previousClose: p, changePct: traded && close && p ? +(((close - p) / p) * 100).toFixed(2) : null,
      traded, lastTradeDate: c?.last_date ?? (traded ? dates[0] : null), daysSinceTrade: c?.days_since_trade ?? null,
      valueIqd: r?.value ?? 0, volume: r?.volume ?? 0, trades: r?.trades ?? 0,
      page: `https://iraqsm.com/c/${m.sym}`,
    }
  }).sort((a, b) => a.ticker.localeCompare(b.ticker))
  return NextResponse.json(envelope('quotes', dates[0], 'Iraq Stock Exchange daily bulletin', '/market', { unit: 'IQD per share; value in IQD', companies }), { headers: JSON_HEADERS })
}
