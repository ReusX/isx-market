import { fetchFx, fetchGold } from '@/lib/rates'
import { fxDayMove, fxSeries, type DayMove } from '@/lib/fxHistory'
import { goldMove, MITHQAL_G } from '@/lib/goldPages'

/**
 * The homepage's world cards (identity v3): the dollar and 21-karat gold,
 * each with its move since the previous close. ISX60 comes from the market
 * loader the page already runs, so it is not fetched twice.
 *
 * Every move follows lib/fxHistory's rule: no earlier close, no move (null),
 * never a zero. The page then drops that clause from «مانشيت اليوم».
 */
export interface HomeWorlds {
  dollar: { sell: number; date: string | null; move: DayMove | null } | null
  gold: { mithqal21: number; date: string | null; move: DayMove | null } | null
}

export async function loadHomeWorlds(): Promise<HomeWorlds> {
  const from = new Date(Date.now() - 14 * 86_400_000).toISOString().slice(0, 10)
  const [fx, days, gold] = await Promise.all([fetchFx(), fxSeries('parallel', { from }), fetchGold()])

  const sell = fx?.sell ?? fx?.buy ?? null
  const k21 = gold?.grams.find((g) => g.karat === 21)?.iqd ?? null
  const gm = goldMove(gold, 21)

  return {
    dollar: sell != null ? { sell, date: fx?.date ?? null, move: fxDayMove(fx, days) } : null,
    gold: k21 != null
      ? { mithqal21: k21 * MITHQAL_G, date: gold?.date ? gold.date.replace(/\//g, '-') : null, move: gm ? { ...gm, abs: gm.abs * MITHQAL_G } : null }
      : null,
  }
}
