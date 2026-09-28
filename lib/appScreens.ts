import 'server-only'
import { fetchCurrencies, fetchFx, fetchGold } from '@/lib/rates'
import { fxLatest, fxSeries } from '@/lib/fxHistory'
import { CBI_OFFICIAL_RATE } from '@/lib/fxOfficial'
import { CURRENCY_CODES, type CurrencyCode } from '@/lib/currencies'
import { currencyHistory, currencyPage } from '@/lib/currencyPages'
import type { FxScreenData, CurrenciesScreenData, CurrencyScreenData } from '@/components/app/AppRates'

/**
 * Data for the app's rate screens (components/app/AppRates), read through
 * the same fetchers as the website's /fx and /currencies pages.
 */
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10)

async function dollar() {
  const [fx, days, off] = await Promise.all([fetchFx(), fxSeries('parallel', { from: daysAgo(45) }), fxLatest('official_cbi').catch(() => null)])
  const closes = days.filter((d) => d.close != null) as { date: string; close: number }[]
  const today = fx?.date ?? null
  const prev = closes.filter((d) => (today ? d.date < today : true)).pop()?.close ?? null
  return { fx, closes, prev, official: off?.close ?? CBI_OFFICIAL_RATE }
}

export async function fxScreen(): Promise<FxScreenData> {
  const { fx, closes, prev, official } = await dollar()
  return {
    buy: fx?.buy ?? null, sell: fx?.sell ?? null, publishedAt: fx?.publishedAt ?? null, date: fx?.date ?? null,
    stale: !!fx?.stale, kifah: fx?.sourceKey === 'kifah-tg', official, prev,
    spark: closes.slice(-30).map((d) => d.close),
  }
}

export async function currenciesScreen(): Promise<CurrenciesScreenData> {
  const [cur, fx] = await Promise.all([fetchCurrencies(), fetchFx()])
  return {
    market: fx?.sell ?? fx?.buy ?? null, official: CBI_OFFICIAL_RATE, updatedAt: cur?.updatedAt ?? null,
    rows: CURRENCY_CODES.filter((c) => cur?.perUsd[c]).map((c) => ({ code: c, perUsd: cur!.perUsd[c] as number })),
  }
}

export const currencyCodes = () => CURRENCY_CODES.map((c) => c.toLowerCase())

export async function currencyScreen(slug: string): Promise<CurrencyScreenData | null> {
  const code = slug.toUpperCase() as CurrencyCode
  if (!CURRENCY_CODES.includes(code)) return null
  const def = currencyPage(slug)
  const [cur, { fx, prev, official }, hist] = await Promise.all([fetchCurrencies(), dollar(), def ? currencyHistory(def, 45) : Promise.resolve([])])
  return {
    code, perUsd: cur?.perUsd[code] ?? null, market: fx?.sell ?? fx?.buy ?? null, official, prevMarket: prev,
    spark: hist.slice(-30).map((p) => p.value), updatedAt: fx?.publishedAt ?? cur?.updatedAt ?? null, stale: !!fx?.stale,
  }
}

export async function goldScreen(): Promise<import('@/components/app/AppGold').GoldScreenData> {
  const g = await fetchGold()
  return {
    date: g?.date ?? null, fetchedAt: g?.fetchedAt ?? null,
    grams: (g?.grams ?? []).map((x) => ({ karat: x.karat, iqd: x.iqd })),
    ounceUsd: g?.ounceSell?.usd ?? null, ounceIqd: g?.ounceSell?.iqd ?? null,
  }
}
