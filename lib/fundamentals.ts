import type { SupabaseClient } from '@supabase/supabase-js'

export interface PeResult {
  pe: number
  ttmNi: number      // IQD
  shares: number     // IQD (= number of shares at 1 IQD par)
  eps: number        // IQD per share
  label: string      // e.g. "TTM (Q1 2026)"
}

/**
 * Fetch TTM P/E for every ticker that has sufficient data.
 *
 * TTM formula (Yahoo Finance style):
 *   TTM NI = Q1_2026 + Annual_2025 - Q1_2025
 *   Falls back to: Q1_2026 + Q4_2025 - Q1_2025 when Annual_2025 is absent.
 *
 * Shares = paid_capital (IQD) — ISX par value is 1 IQD/share.
 * P/E    = price / (TTM NI / shares)
 *
 * @param sb   Supabase client (anon or service role)
 * @param prices  map of ticker → current close price (IQD)
 */
export async function fetchTtmPe(
  sb: SupabaseClient,
  prices: Record<string, number>,
): Promise<Record<string, PeResult>> {

  // Pull net_income + paid_capital for the four periods we need
  const { data, error } = await sb
    .from('financial_facts_public')
    .select('ticker,fiscal_year,period,line_key,value_iqd')
    .in('line_key', ['net_income', 'pretax_income', 'paid_capital'])
    .in('period', ['ANNUAL', 'Q4', 'Q1'])
    .gte('fiscal_year', 2024)
    .order('fiscal_year', { ascending: false })

  if (error || !data?.length) return {}

  // Build lookup: ticker → period-key → { net_income, paid_capital }
  type PeriodKey = 'q1_26' | 'a25' | 'q4_25' | 'q1_25'
  const lookup: Record<string, Partial<Record<PeriodKey, { ni?: number; cap?: number }>>> = {}

  for (const r of data as any[]) {
    const { ticker, fiscal_year: fy, period, line_key, value_iqd } = r
    if (value_iqd == null) continue

    let key: PeriodKey | null = null
    if (fy === 2026 && period === 'Q1')     key = 'q1_26'
    else if (fy === 2025 && period === 'ANNUAL') key = 'a25'
    else if (fy === 2025 && period === 'Q4')     key = 'q4_25'
    else if (fy === 2025 && period === 'Q1')     key = 'q1_25'
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

    const ni_q1_26 = periods.q1_26?.ni
    const ni_q1_25 = periods.q1_25?.ni
    // Prefer Annual_2025; fall back to Q4_2025
    const ni_annual = periods.a25?.ni ?? periods.q4_25?.ni
    const label_base = periods.a25?.ni != null ? 'Annual 2025' : 'Q4 2025'

    if (ni_q1_26 == null || ni_q1_25 == null || ni_annual == null) continue

    const ttmNi = ni_q1_26 + ni_annual - ni_q1_25
    if (ttmNi <= 0) continue

    // paid_capital: prefer Q1_2026, then any available period
    const shares =
      periods.q1_26?.cap ??
      periods.a25?.cap ??
      periods.q4_25?.cap ??
      periods.q1_25?.cap
    if (!shares || shares <= 0) continue

    const eps = ttmNi / shares
    if (eps <= 0) continue

    const pe = price / eps

    result[ticker] = {
      pe,
      ttmNi,
      shares,
      eps,
      label: `TTM (Q1 2026 + ${label_base} − Q1 2025)`,
    }
  }

  return result
}
