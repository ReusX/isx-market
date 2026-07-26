/**
 * Last seven closes per ticker, for the 7D sparkline column shared by the
 * homepage list and /market. Pulls 21 calendar days so a short trading week
 * (or a name that skipped a session) still yields seven points.
 */
export async function fetchSparklines(): Promise<Record<string, number[]>> {
  // Dynamic import so the Supabase client stays out of the initial bundle —
  // the sparklines are an enhancement, the table renders without them.
  const { createClient } = await import('@/lib/supabase/client')
  const sb = createClient()
  const since = new Date(Date.now() - 21 * 86400_000).toISOString().slice(0, 10)

  const { data } = await sb.from('daily_prices')
    .select('ticker,date,close').gte('date', since).order('date')

  const by: Record<string, number[]> = {}
  for (const r of (data ?? []) as { ticker: string; close: number | null }[]) {
    if (r.close == null) continue
    ;(by[r.ticker] ??= []).push(r.close)
  }
  for (const k of Object.keys(by)) by[k] = by[k].slice(-7)
  return by
}
