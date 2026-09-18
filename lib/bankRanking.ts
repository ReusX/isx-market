import 'server-only'
import { listBanks, type Bank } from '@/lib/banks'
import { normalizedValuesTrusted } from '@/lib/financials'

/**
 * Listed banks ranked on their latest ANNUAL filing — the table behind
 * «أفضل البنوك في العراق».
 *
 * Annual only, on purpose: a Q1 balance sheet beside a full-year profit is
 * not a ranking, it is a coincidence of filing dates. Every bank is placed on
 * the same kind of statement, and the year column says which one.
 *
 * Tickers on the unit-defect list (`lib/financials`) are NOT ranked. Their
 * extracted figures are off by a factor of 1,000 in one direction or the
 * other, and a bank ranked first on a mis-scaled asset total would be the
 * exact lie this page exists to avoid. They are named under the table.
 */
export interface RankedBank {
  bank: Bank
  year: number
  assets: number
  netIncome: number | null
  deposits: number | null
  equity: number | null
  /** net income / equity, when both are known and equity is positive. */
  roe: number | null
}

const KEYS = ['total_assets', 'customer_deposits', 'total_equity', 'net_income'] as const

const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export async function loadBankRanking(): Promise<{ ranked: RankedBank[]; withheld: Bank[]; unfiled: Bank[] }> {
  const banks = (await listBanks()).filter((b) => b.ticker)
  const trusted = banks.filter((b) => normalizedValuesTrusted(b.ticker as string))
  const withheld = banks.filter((b) => !normalizedValuesTrusted(b.ticker as string))
  if (!URL_BASE || !ANON || !trusted.length) return { ranked: [], withheld, unfiled: [] }

  const tickers = trusted.map((b) => b.ticker as string)
  const res = await fetch(
    `${URL_BASE}/rest/v1/financial_facts?select=ticker,fiscal_year,line_key,value_iqd` +
    `&ticker=in.(${tickers.join(',')})&period=eq.ANNUAL&line_key=in.(${KEYS.join(',')})` +
    `&order=fiscal_year.desc&limit=4000`,
    { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` }, next: { revalidate: 3600 } },
  )
  if (!res.ok) return { ranked: [], withheld, unfiled: [] }
  const rows = (await res.json()) as { ticker: string; fiscal_year: number; line_key: string; value_iqd: number }[]

  const latest = new Map<string, { year: number; v: Record<string, number> }>()
  for (const r of rows) {
    const cur = latest.get(r.ticker)
    if (!cur) { latest.set(r.ticker, { year: r.fiscal_year, v: { [r.line_key]: r.value_iqd } }); continue }
    if (r.fiscal_year !== cur.year) continue
    cur.v[r.line_key] = r.value_iqd
  }

  const ranked: RankedBank[] = []
  const unfiled: Bank[] = []
  for (const bank of trusted) {
    const f = latest.get(bank.ticker as string)
    if (!f || !(f.v.total_assets > 0)) { unfiled.push(bank); continue }
    const equity = f.v.total_equity ?? null, net = f.v.net_income ?? null
    ranked.push({
      bank, year: f.year, assets: f.v.total_assets,
      netIncome: net, deposits: f.v.customer_deposits ?? null, equity,
      roe: net != null && equity != null && equity > 0 ? net / equity : null,
    })
  }
  ranked.sort((a, b) => b.assets - a.assets)
  return { ranked, withheld, unfiled }
}
