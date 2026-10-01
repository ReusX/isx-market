import 'server-only'
import { fetchFx, fetchGold } from '@/lib/rates'
import { GOLD_USD_JAN } from '@/lib/goldHistory'

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
 * Nothing is simulated that we do not hold: there is no deposit-rate
 * history, so the lesson has no bank door rather than a guessed one.
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
    goldDate: string | null
    isx60: number | null
    isx60Date: string | null
  }
}

export async function loadStreet(): Promise<StreetData> {
  const last = new Date().getUTCFullYear() - 1
  const years = Array.from({ length: last - FIRST_YEAR + 1 }, (_, i) => FIRST_YEAR + i)

  const [fxRows, idxRows, latestIdx, officialNow, fx, gold] = await Promise.all([
    Promise.all(years.map((y) => rest<{ mid: number | null; sell: number | null; buy: number | null }>(
      `fx_observations?select=mid,sell,buy&series=eq.official_cbi&observed_date=gte.${y}-01-01&observed_date=lt.${y}-02-01`))),
    Promise.all(years.map((y) => rest<{ isx60: number }>(
      `daily_index?select=isx60&isx60=not.is.null&date=gte.${y}-01-01&order=date.asc&limit=1`))),
    rest<{ isx60: number; date: string }>('daily_index?select=isx60,date&isx60=not.is.null&order=date.desc&limit=1'),
    rest<{ mid: number | null; sell: number | null; observed_date: string }>(
      'fx_observations?select=mid,sell,observed_date&series=eq.official_cbi&order=observed_date.desc&limit=1'),
    fetchFx(),
    fetchGold(),
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
  const off = officialNow[0]

  return {
    years: rows,
    now: {
      usdBuy: fx?.buy ?? fx?.sell ?? null,
      usdSell: fx?.sell ?? null,
      usdOfficial: off ? (off.mid ?? off.sell) : null,
      usdDate: fx?.publishedAt ?? fx?.date ?? null,
      goldOunceUsd: gold?.ounceSell?.usd ?? (karat(24) && fx?.sell ? Math.round((karat(24)! * OZ_G) / fx.sell) : null),
      goldDate: gold?.date ?? null,
      isx60: latestIdx[0]?.isx60 ?? null,
      isx60Date: latestIdx[0]?.date ?? null,
    },
  }
}
