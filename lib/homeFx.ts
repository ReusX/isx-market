import { getFx } from '@/lib/fxCopy'
import { fxSeries } from '@/lib/fxHistory'

/**
 * The homepage's dollar card: the live Baghdad market price (Kifah floor,
 * the same read as /fx) and the previous day's close for the change chip.
 * The previous close is the last fx_daily row dated before the live quote's
 * own day, so a quote read at 9am is compared with yesterday, not with itself.
 */
export type HomeFx = { rate: number; prev: number | null; date: string | null; stale: boolean }

export async function loadHomeFx(): Promise<HomeFx | null> {
  const from = new Date(Date.now() - 14 * 86400_000).toISOString().slice(0, 10)
  const [fx, days] = await Promise.all([getFx(), fxSeries('parallel', { from }).catch(() => [])])
  const rate = fx?.sell ?? fx?.buy ?? null
  if (rate == null) return null
  const today = fx?.date ?? new Date().toISOString().slice(0, 10)
  const before = days.filter((d) => d.date < today && (d.sell ?? d.close) != null)
  const last = before[before.length - 1]
  return { rate, prev: last ? (last.sell ?? last.close) : null, date: fx?.date ?? null, stale: !!fx?.stale }
}
