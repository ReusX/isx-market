import 'server-only'
import { fxDayMove } from '@/lib/fxHistory'
import { createClient } from '@supabase/supabase-js'
import companiesData from '@/public/data/companies.json'
import type { MarketScreenData, Quote, Session } from '@/components/app/AppMarket'
import { loadBanksHub } from '@/lib/banksServer'
import type { BanksScreenData } from '@/components/app/AppBanks'
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
  const [fx, days, off] = await Promise.all([fetchFx(), fxSeries('parallel', { from: daysAgo(1100) }), fxLatest('official_cbi').catch(() => null)])
  const closes = days.filter((d) => d.close != null) as { date: string; close: number }[]
  const today = fx?.date ?? null
  const prev = closes.filter((d) => (today ? d.date < today : true)).pop()?.close ?? null
  return { fx, days, closes, prev, official: off?.close ?? CBI_OFFICIAL_RATE }
}

export async function fxScreen(): Promise<FxScreenData> {
  const { fx, days, closes, prev, official } = await dollar()
  return {
    buy: fx?.buy ?? null, sell: fx?.sell ?? null, publishedAt: fx?.publishedAt ?? null, date: fx?.date ?? null,
    stale: !!fx?.stale, kifah: fx?.sourceKey === 'kifah-tg', official, prev,
    /* The day's move on the website's one rule (mid-price vs the previous close), so the app, home and /fx agree. */
    movePct: fx ? fxDayMove({ buy: fx.buy ?? null, sell: fx.sell ?? null, date: fx.date ?? null }, days)?.pct ?? null : null,
    spark: closes.map((d) => ({ date: d.date, value: d.close })),
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
  const [cur, { fx, days, prev, official }, hist] = await Promise.all([fetchCurrencies(), dollar(), def ? currencyHistory(def, 1100) : Promise.resolve([])])
  return {
    code, perUsd: cur?.perUsd[code] ?? null, market: fx?.sell ?? fx?.buy ?? null, official, prevMarket: prev,
    /* Priced through the dollar, so it moves with the dollar's day move. */
    movePct: fx ? fxDayMove({ buy: fx.buy ?? null, sell: fx.sell ?? null, date: fx.date ?? null }, days)?.pct ?? null : null,
    spark: hist.map((p) => ({ date: p.date, value: p.value })), updatedAt: fx?.publishedAt ?? cur?.updatedAt ?? null, stale: !!fx?.stale,
  }
}

export async function goldScreen(): Promise<import('@/components/app/AppGold').GoldScreenData> {
  const g = await fetchGold()
  return {
    date: g?.date ?? null, fetchedAt: g?.fetchedAt ?? null,
    grams: (g?.grams ?? []).map((x) => ({ karat: x.karat, iqd: x.iqd })),
    prev: g?.prev ? { date: g.prev.date, grams: g.prev.grams } : null,
    history: (g?.history ?? []).slice(-30),
    ounceUsd: g?.ounceSell?.usd ?? null, ounceIqd: g?.ounceSell?.iqd ?? null,
  }
}

/* ── Stock market ─────────────────────────────────────────────────────────── */

type Co = { sym: string; ar: string; en: string; sec?: string; logo?: string }
const COS = companiesData as Co[]
const logoOf = (c?: Co) => (c?.logo && !/placeholder/.test(c.logo) ? c.logo : null)

/** Same reads as /data/index.json and /data/quotes.json. */
export async function marketScreen(): Promise<MarketScreenData> {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } })
  const { data: idx } = await sb.from('daily_index').select('date,isx60,isx15,total_value,total_trades,traded_companies,listed_companies')
    .gt('isx60', 0).order('date', { ascending: false }).limit(30)
  const sessions: Session[] = ((idx ?? []) as { date: string; isx60: number; isx15: number | null; total_value: number; total_trades: number; traded_companies: number; listed_companies: number }[])
    .map((r) => ({ date: r.date, isx60: r.isx60, isx15: r.isx15, value: r.total_value, trades: r.total_trades, traded: r.traded_companies, listed: r.listed_companies }))
  if (!sessions.length) return { sessions, quotes: [], history: [] }
  const [pxRes, cmRes, histRes] = await Promise.all([
    sb.from('daily_prices').select('ticker,close,value,trades').eq('date', sessions[0].date).range(0, 1999),
    sb.from('company_metrics').select('ticker,last_close,prev_close').range(0, 999),
    /* The index chart's history (about four years), oldest first after the reverse. */
    sb.from('daily_index').select('date,isx60').gt('isx60', 0).order('date', { ascending: false }).range(0, 999),
  ])
  const history = ((histRes.data ?? []) as { date: string; isx60: number }[]).map((r) => ({ date: r.date, value: r.isx60 })).reverse()
  const px = new Map(((pxRes.data ?? []) as { ticker: string; close: number | null; value: number | null; trades: number | null }[]).map((r) => [r.ticker, r]))
  const cm = new Map(((cmRes.data ?? []) as { ticker: string; last_close: number | null; prev_close: number | null }[]).map((r) => [r.ticker, r]))
  const quotes: Quote[] = COS.map((m) => {
    const r = px.get(m.sym), c = cm.get(m.sym)
    const close = r?.close ?? c?.last_close ?? null, p = c?.prev_close ?? null
    const traded = Boolean(r && (r.trades ?? 0) > 0)
    return {
      t: m.sym, ar: m.ar, en: m.en, sec: m.sec ?? null, logo: logoOf(m), close, traded, value: r?.value ?? 0,
      chg: traded && close && p ? +(((close - p) / p) * 100).toFixed(2) : null,
    }
  })
  return { sessions, quotes, history }
}

export async function banksScreen(): Promise<BanksScreenData> {
  const hub = await loadBanksHub()
  const best = new Map<string, number>()
  for (const d of hub.deposits) best.set(d.slug, Math.max(best.get(d.slug) ?? 0, d.rateTo ?? d.rate))
  return {
    banks: hub.rows.filter((r) => r.type !== 'central').map((r) => ({
      slug: r.slug, ar: r.ar, en: r.en, logo: r.logo, type: r.type, ownership: r.ownership, status: r.status, usd: r.usd,
      listed: !!r.ticker, best: best.get(r.slug) ?? null,
      score: r.score?.score != null && r.score.grade ? { score: r.score.score, grade: r.score.grade } : null,
      why: r.why, reason: r.score && r.score.score == null ? r.score.reason ?? null : null,
    })),
    deposits: hub.deposits.map((d) => ({
      slug: d.slug, ar: d.ar, en: d.en, logo: hub.rows.find((r) => r.slug === d.slug)?.logo ?? null,
      rate: d.rate, rateTo: d.rateTo, term: d.termMonths, currency: d.currency,
    })),
  }
}
