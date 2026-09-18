import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { envelope, JSON_HEADERS } from '@/lib/openData'

/** GET /data/index.json · ISX60 and ISX15 closes with session totals, last 60 sessions, newest first. */
export const revalidate = 3600
export async function GET() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } })
  const { data } = await sb.from('daily_index').select('date,isx60,isx15,total_value,total_volume,total_trades,traded_companies,listed_companies')
    .gt('isx60', 0).order('date', { ascending: false }).limit(60)
  const rows = (data ?? []) as { date: string; isx60: number; isx15: number | null; total_value: number; total_volume: number; total_trades: number; traded_companies: number; listed_companies: number }[]
  const body = envelope('index', rows[0]?.date ?? null, 'Iraq Stock Exchange daily bulletin', '/', {
    unit: 'index points; value in IQD',
    sessions: rows.map((r) => ({ date: r.date, isx60: r.isx60, isx15: r.isx15, valueIqd: r.total_value, volume: r.total_volume, trades: r.total_trades, traded: r.traded_companies, listed: r.listed_companies })),
  })
  return NextResponse.json(body, { headers: JSON_HEADERS })
}
