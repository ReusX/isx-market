/**
 * How a trailing P/E was derived. An ID rather than a phrase, so both
 * languages can render it — see the note inside `fetchTtmPe`.
 */
export type PeBasis = { kind: 'ttm' } | { kind: 'fy'; year: number }

import type { SupabaseClient } from '@supabase/supabase-js'

export interface PeResult {
  pe: number
  ttmNi: number      // IQD
  shares: number     // IQD (= number of shares at 1 IQD par)
  eps: number        // IQD per share
  /** How the figure was derived. An ID — the caller renders it. */
  basis: PeBasis
}

/**
 * Fetch TTM P/E for every ticker that has sufficient data.
 *
 * TTM formula (Yahoo Finance style):
 *   TTM NI = Q1_2026 + Annual_2025 - Q1_2025
 *   Falls back to: Q1_2026 + Q4_2025 - Q1_2025 when Annual_2025 is absent.
 *
 * Shares = paid_capital (IQD) · ISX par value is 1 IQD/share.
 * P/E    = price / (TTM NI / shares)
 *
 * @param sb   Supabase client (anon or service role)
 * @param prices  map of ticker → current close price (IQD)
 */
export async function fetchTtmPe(
  sb: SupabaseClient,
  prices: Record<string, number>,
): Promise<Record<string, PeResult>> {

  // Pull net_income + paid_capital for the periods we need. Annuals go back to
  // 2023 so we always have a latest-annual fallback when the TTM combo is absent.
  const { data, error } = await sb
    .from('financial_facts_public')
    .select('ticker,fiscal_year,period,line_key,value_iqd')
    .in('line_key', ['net_income', 'pretax_income', 'paid_capital'])
    .in('period', ['ANNUAL', 'Q4', 'Q1'])
    .gte('fiscal_year', 2023)
    .order('fiscal_year', { ascending: false })

  if (error || !data?.length) return {}

  // Build lookup: ticker → period-key → { net_income, paid_capital }
  type PeriodKey = 'q1_26' | 'a25' | 'q4_25' | 'q1_25' | 'a24' | 'a23'
  const lookup: Record<string, Partial<Record<PeriodKey, { ni?: number; cap?: number }>>> = {}

  for (const r of data as any[]) {
    const { ticker, fiscal_year: fy, period, line_key, value_iqd } = r
    if (value_iqd == null) continue

    let key: PeriodKey | null = null
    if (fy === 2026 && period === 'Q1')     key = 'q1_26'
    else if (fy === 2025 && period === 'ANNUAL') key = 'a25'
    else if (fy === 2025 && period === 'Q4')     key = 'q4_25'
    else if (fy === 2025 && period === 'Q1')     key = 'q1_25'
    else if (fy === 2024 && period === 'ANNUAL') key = 'a24'
    else if (fy === 2023 && period === 'ANNUAL') key = 'a23'
    if (!key) continue

    if (!lookup[ticker]) lookup[ticker] = {}
    if (!lookup[ticker][key]) lookup[ticker][key] = {}

    if (line_key === 'paid_capital') {
      lookup[ticker][key]!.cap = value_iqd
    } else {
      // net_income preferred; pretax_income as fallback (only set if net_income not yet set)
      if (line_key === 'net_income' || lookup[ticker][key]!.ni == null) {
        lookup[ticker][key]!.ni = value_iqd
      }
    }
  }

  const result: Record<string, PeResult> = {}

  for (const [ticker, periods] of Object.entries(lookup)) {
    const price = prices[ticker]
    if (!price || price <= 0) continue

    // paid_capital: any period that reported it (shares are stable year to year)
    const shares =
      periods.q1_26?.cap ?? periods.a25?.cap ?? periods.q4_25?.cap ??
      periods.q1_25?.cap ?? periods.a24?.cap ?? periods.a23?.cap
    if (!shares || shares <= 0) continue

    // 1) Preferred: trailing-twelve-months net income (most current).
    const ni_q1_26 = periods.q1_26?.ni
    const ni_q1_25 = periods.q1_25?.ni
    const ni_ttm_annual = periods.a25?.ni ?? periods.q4_25?.ni
    let ni: number | null = null
    /*
     * ⚠ `basis` is an ID, not a label.
     *
     * This function is called from both locales. It used to bake the Arabic
     * words into its result, which meant the English screener and statistics
     * pages showed «TTM (آخر 12 شهراً)» beside an English P/E. The caller
     * renders the id through its own dictionary.
     */
    let basis: PeBasis | null = null
    if (ni_q1_26 != null && ni_q1_25 != null && ni_ttm_annual != null) {
      const ttm = ni_q1_26 + ni_ttm_annual - ni_q1_25
      if (ttm > 0) { ni = ttm; basis = { kind: 'ttm' } }
    }
    // 2) Fallback: latest reported FULL-YEAR net income.
    if (ni == null) {
      const annual: [number | undefined, number][] = [
        [periods.a25?.ni, 2025],
        [periods.a24?.ni, 2024],
        [periods.a23?.ni, 2023],
      ]
      const hit = annual.find(([v]) => v != null && v > 0)
      if (hit) { ni = hit[0]!; basis = { kind: 'fy', year: hit[1] } }
    }
    if (ni == null || ni <= 0 || !basis) continue

    const eps = ni / shares
    if (eps <= 0) continue

    result[ticker] = { pe: price / eps, ttmNi: ni, shares, eps, basis }
  }

  return result
}
