import 'server-only'
import { fetchFx, fetchGold } from '@/lib/rates'
import { getQuote } from '@/lib/quote'
import { loadBanksHub } from '@/lib/banksServer'
import { GOLD_USD_JAN } from '@/lib/goldHistory'
import { MITHQAL_G } from '@/lib/goldPages'
import companiesData from '@/public/data/companies.json'

/**
 * «شارع المال» (/learn/invest) · every number the street shows, real.
 *
 * The walk begins in January of a year the reader picks (FIRST_YEAR…the last
 * complete year) holding 1,000,000 dinars, and each shop answers «what would
 * that million be worth today if you had come here then?».
 *
 *   then, dollar   CBI official rate, January average (fx_observations,
 *                  series official_cbi). Before 2020 the street rate sat
 *                  within a few percent of it.
 *   today, dollar  the market (Kifah) buy rate: what a changer pays you now.
 *   gold           lib/goldHistory January ounce, then the live /gold ounce.
 *   ISX60          first session of that year, then the latest session.
 *                  A price index: dividends are not in it, and the page says so.
 *
 * Nothing is simulated that we do not hold: bank deposits have no rate
 * history here, so the bank stop shows today's published rates and a plain
 * calculator, and it is left out of the time machine rather than guessed.
 */
const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const DAY = 86_400

export const FIRST_YEAR = 2016
const OZ_G = 31.1035

async function rest<T>(path: string): Promise<T[]> {
  if (!URL_BASE || !ANON) return []
  try {
    const res = await fetch(`${URL_BASE}/rest/v1/${path}`, {
      headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
      next: { revalidate: DAY },
    })
    return res.ok ? ((await res.json()) as T[]) : []
  } catch { return [] }
}

export interface StreetYear {
  year: number
  /** Dinars per dollar, CBI official, January average. */
  usd: number
  /** Dollars per troy ounce, January average. */
  goldUsd: number
  /** ISX60 at the first session of the year. */
  isx60: number
}

export interface StreetData {
  years: StreetYear[]
  now: {
    /** What a changer pays for a dollar now (market buy), and sells one for. */
    usdBuy: number | null
    usdSell: number | null
    usdOfficial: number | null
    usdDate: string | null
    goldOunceUsd: number | null
    /** Dinars per mithqal, 21 and 24 karat, from the /gold source. */
    mithqal21: number | null
    mithqal24: number | null
    goldDate: string | null
    isx60: number | null
    isx60Date: string | null
  }
  /** Asiacell, the company every Iraqi phone knows, for the «what is a share» stop. */
  share: { sym: string; nameAr: string; price: number | null; date: string | null; shares: number } | null
  /** Published dinar term-deposit rates, best first. */
  deposits: { bank: string; slug: string; rate: number; months: number | null }[]
}

export async function loadStreet(): Promise<StreetData> {
  const last = new Date().getUTCFullYear() - 1
  const years = Array.from({ length: last - FIRST_YEAR + 1 }, (_, i) => FIRST_YEAR + i)

  const [fxRows, idxRows, latestIdx, officialNow, fx, gold, quote, hub] = await Promise.all([
    Promise.all(years.map((y) => rest<{ mid: number | null; sell: number | null; buy: number | null }>(
      `fx_observations?select=mid,sell,buy&series=eq.official_cbi&observed_date=gte.${y}-01-01&observed_date=lt.${y}-02-01`))),
    Promise.all(years.map((y) => rest<{ isx60: number }>(
      `daily_index?select=isx60&isx60=not.is.null&date=gte.${y}-01-01&order=date.asc&limit=1`))),
    rest<{ isx60: number; date: string }>('daily_index?select=isx60,date&isx60=not.is.null&order=date.desc&limit=1'),
    rest<{ mid: number | null; sell: number | null; observed_date: string }>(
      'fx_observations?select=mid,sell,observed_date&series=eq.official_cbi&order=observed_date.desc&limit=1'),
    fetchFx(),
    fetchGold(),
    getQuote('TASC'),
    loadBanksHub().catch(() => null),
  ])

  const rows: StreetYear[] = []
  years.forEach((year, i) => {
    const vals = fxRows[i].map((r) => r.mid ?? r.sell ?? r.buy).filter((v): v is number => v != null && v > 0)
    const usd = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
    const isx60 = idxRows[i][0]?.isx60 ?? null
    const goldUsd = GOLD_USD_JAN[year] ?? null
    if (usd && isx60 && goldUsd) rows.push({ year, usd: Math.round(usd * 10) / 10, goldUsd, isx60 })
  })

  const karat = (k: number) => gold?.grams.find((g) => g.karat === k)?.iqd ?? null
  const perMithqal = (k: number) => { const g = karat(k); return g ? Math.round(g * MITHQAL_G) : null }
  const tasc = (companiesData as { sym: string; ar: string; shares?: number }[]).find((c) => c.sym === 'TASC')
  const off = officialNow[0]

  return {
    years: rows,
    now: {
      usdBuy: fx?.buy ?? fx?.sell ?? null,
      usdSell: fx?.sell ?? null,
      usdOfficial: off ? (off.mid ?? off.sell) : null,
      usdDate: fx?.publishedAt ?? fx?.date ?? null,
      goldOunceUsd: gold?.ounceSell?.usd ?? (karat(24) && fx?.sell ? Math.round((karat(24)! * OZ_G) / fx.sell) : null),
      mithqal21: perMithqal(21),
      mithqal24: perMithqal(24),
      goldDate: gold?.date ?? null,
      isx60: latestIdx[0]?.isx60 ?? null,
      isx60Date: latestIdx[0]?.date ?? null,
    },
    share: tasc?.shares ? {
      sym: 'TASC', nameAr: tasc.ar, shares: tasc.shares,
      price: quote && !quote.suspended ? quote.close : null, date: quote?.date ?? null,
    } : null,
    deposits: (hub?.deposits ?? [])
      .filter((d) => d.currency === 'IQD' && !d.rateTo)
      .map((d) => ({ bank: d.ar, slug: d.slug, rate: d.rate, months: d.termMonths })),
  }
}
