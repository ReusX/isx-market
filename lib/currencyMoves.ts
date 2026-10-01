import { CURRENCY_CODES, type CurrencyCode } from '@/lib/currencies'
import { fxDayMove, fxSeries } from '@/lib/fxHistory'
import type { FxData } from '@/lib/rates'

/**
 * Each currency's move in DINARS since the previous day, for the up/down
 * chips on /currencies and /currencies/[code].
 *
 * A dinar price here is the parallel dollar rate ÷ the currency's dollar cross,
 * so its move has two parts, and each comes from a source compared only with
 * itself:
 *  - the dollar: our own recorded Baghdad close (lib/fxHistory · fxDayMove);
 *  - the cross: two dated daily snapshots of the same keyless feed.
 * The cross is NOT taken as "today's open.er-api vs yesterday's snapshot":
 * the two feeds disagree on currencies like the Syrian pound by a factor of
 * 100 (one has the redenominated pound, one doesn't), which would print a
 * nonsense move. A ratio from one feed cancels whatever unit it uses.
 */
export interface CurrencyMoves {
  /** Percent change of the dinar price, per currency. Missing = no answer. */
  pct: Partial<Record<CurrencyCode, number>>
  prevDate: string
}

const FEEDS = [
  (d: string) => `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${d}/v1/currencies/usd.json`,
  (d: string) => `https://${d}.currency-api.pages.dev/v1/currencies/usd.json`,
]

async function snapshot(day: string): Promise<{ date: string; usd: Record<string, number> } | null> {
  for (const url of FEEDS) {
    try {
      const res = await fetch(url(day), { next: { revalidate: 10800 }, signal: AbortSignal.timeout(8000) })
      if (!res.ok) continue
      const j = (await res.json()) as { date?: string; usd?: Record<string, number> }
      if (j.date && j.usd) return { date: j.date, usd: j.usd }
    } catch { /* next mirror */ }
  }
  return null
}

const dayBefore = (iso: string) => new Date(Date.parse(`${iso}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10)

export async function currencyMoves(fx: FxData | null): Promise<CurrencyMoves | null> {
  const from = new Date(Date.now() - 14 * 86_400_000).toISOString().slice(0, 10)
  /* Dated snapshots only: the CDN's «latest» alias is cached a day behind,
     which silently compared the wrong pair of days. Today's file appears
     shortly after midnight UTC, so yesterday's is the fallback. */
  const today = new Date().toISOString().slice(0, 10)
  const [days, now] = await Promise.all([
    fxSeries('parallel', { from }),
    snapshot(today).then((s) => s ?? snapshot(dayBefore(today))),
  ])
  const dollar = fxDayMove(fx, days)
  /* Without the dollar's own move, the cross alone would be a wrong answer
     dressed as a right one: say nothing instead. */
  if (!dollar || !now) return null
  const prev = await snapshot(dayBefore(now.date))
  if (!prev) return null

  const pct: CurrencyMoves['pct'] = {}
  for (const c of CURRENCY_CODES) {
    const a = now.usd[c.toLowerCase()], b = prev.usd[c.toLowerCase()]
    if (!(a > 0) || !(b > 0)) continue
    const cross = b / a
    /* Past ±10% in a day is the feed, not the market: it switched the rial's
       source on 2026-09-29 and "moved" it 23% overnight. */
    if (cross < 0.9 || cross > 1.1) continue
    pct[c] = ((1 + dollar.pct / 100) * cross - 1) * 100
  }
  return { pct, prevDate: dollar.prevDate }
}
