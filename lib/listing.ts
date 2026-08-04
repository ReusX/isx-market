/**
 * Suspended-listing rule · the single definition of what counts as a live
 * price. Shared by /market, /companies, /screener, the homepage top list and
 * the server-side company quote, so they cannot disagree.
 *
 * 34 of 124 tickers last traded more than a year ago and a handful last printed
 * in 2010-2013, most of them parked at the 1 IQD par value. Their last close is
 * a real number but not a current one, and because market cap is close x share
 * count, those dead prices produced dead market caps that outranked live
 * companies in the default mcap sort — a bank that had not traded since 2024
 * was sitting at #9 on the board.
 *
 * 60 days matches the threshold /screener already shipped with.
 *
 * Deliberately free of imports: `lib/market` pulls in the *browser* Supabase
 * client, so anything server-side that needed this rule would have dragged that
 * along with it. Kept standalone, and re-exported from lib/market so existing
 * callers are unaffected.
 */
export const STALE_DAYS = 60

const DAY_MS = 86_400_000

/** Days since the row's last real trade · 0 for anything that traded today. */
export function daysSinceTrade(c: { stale?: boolean; lastTrade?: string }): number {
  if (!c.stale) return 0
  if (!c.lastTrade) return Number.POSITIVE_INFINITY
  return Math.max(0, Math.round((Date.now() - new Date(c.lastTrade).getTime()) / DAY_MS))
}

/** True when the last close is too old to be presented as a price. */
export function isSuspended(c: { stale?: boolean; lastTrade?: string }): boolean {
  return daysSinceTrade(c) > STALE_DAYS
}
