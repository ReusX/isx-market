// ── Live gold & FX scrapers ─────────────────────────────────────────────────
// Server-side scrapers for the gold and USD/IQD black-market pages. Both
// sources serve their numbers in static HTML, so a tag-strip + regex pass is
// enough. Results are cached for REVALIDATE seconds (Next data cache), which
// gives us the requested "updated daily" behaviour without a DB or cron.

const UA = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36 (+iraqsm.com)',
}
const REVALIDATE = 60 * 60 * 3 // 3 hours — picks up the daily update reliably

const intNum = (s: string) => parseInt(s.replace(/[^\d]/g, ''), 10)
const floatNum = (s: string | undefined | null) =>
  s ? parseFloat(s.replace(/,/g, '')) : null

function strip(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ')
}

// ── Gold ────────────────────────────────────────────────────────────────────
export interface GoldKarat { karat: number; iqd: number; usd: number }
export interface GoldData {
  date: string | null
  grams: GoldKarat[]
  ounceSell: { iqd: number; usd: number } | null
  ounceBuy:  { iqd: number; usd: number } | null
  source: string
  sourceUrl: string
  fetchedAt: string
}

const GOLD_URL = 'https://iraqgoldprice.com/'

export async function fetchGold(): Promise<GoldData | null> {
  try {
    const res = await fetch(GOLD_URL, { headers: UA, next: { revalidate: REVALIDATE } })
    if (!res.ok) return null
    const t = strip(await res.text())

    const grams: GoldKarat[] = []
    const re = /جرام\s*الذهب\s*عيار\s*(\d{2})\s*([\d,]+)\s+([\d,]+)/g
    let m: RegExpExecArray | null
    while ((m = re.exec(t))) grams.push({ karat: +m[1], iqd: intNum(m[2]), usd: intNum(m[3]) })
    if (!grams.length) return null

    const ounce = (label: string) => {
      const mm = t.match(new RegExp('أونصة\\s*الذهب\\s*' + label + '\\s*([\\d,]+)\\s+([\\d,]+)'))
      return mm ? { iqd: intNum(mm[1]), usd: intNum(mm[2]) } : null
    }
    const date = t.match(/\((\d{4}\/\d{2}\/\d{2})\)/)?.[1] ?? null

    return {
      date, grams,
      ounceSell: ounce('بيع'),
      ounceBuy:  ounce('شراء'),
      source: 'iraqgoldprice.com',
      sourceUrl: GOLD_URL,
      fetchedAt: new Date().toISOString(),
    }
  } catch {
    return null
  }
}

// ── USD / IQD (black market) ─────────────────────────────────────────────────
export interface FxData {
  buy: number | null
  sell: number | null
  change: number | null   // vs yesterday's last price
  date: string | null
  source: string
  sourceUrl: string
  fetchedAt: string
}

const FX_URL = 'https://egcurrency.com/en/currency/USD-to-IQD/blackMarket'
// egcurrency is behind Cloudflare and blocks datacenter IPs (e.g. Vercel), so a
// direct fetch works locally but 403s in production. r.jina.ai fetches the page
// from its own infra and returns clean text — a reliable proxy fallback.
const FX_PROXY = 'https://r.jina.ai/' + FX_URL

// Handles both the raw egcurrency HTML and the r.jina.ai markdown rendering.
function parseFx(raw: string): Omit<FxData, 'source' | 'sourceUrl' | 'fetchedAt'> | null {
  const t = raw.replace(/<[^>]+>/g, ' ').replace(/\*\*/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ')
  const date = t.match(/Black Market,\s*([A-Za-z]+,\s*[\d.]+\s+[\d:]+)/)?.[1] ?? null
  const buy  = floatNum(t.match(/Black Market,\s*[A-Za-z]+,\s*[\d.]+\s+[\d:]+\s+([\d,]+(?:\.\d+)?)/)?.[1])
  const sell = floatNum(t.match(/Sell Price:?\s*([\d,]+(?:\.\d+)?)/)?.[1])
  const change = floatNum(t.match(/Sell Price:?\s*[\d,.]+\s*([\-+]?[\d,]+\.?\d*)\s*Compared/i)?.[1])
  if (buy == null && sell == null) return null
  return { buy, sell, change, date }
}

export async function fetchFx(): Promise<FxData | null> {
  const base = { source: 'egcurrency.com', sourceUrl: FX_URL, fetchedAt: new Date().toISOString() }
  // 1) direct (fast, works where egcurrency isn't IP-blocked)
  try {
    const res = await fetch(FX_URL, { headers: UA, next: { revalidate: REVALIDATE } })
    if (res.ok) {
      const parsed = parseFx(await res.text())
      if (parsed) return { ...parsed, ...base }
    }
  } catch { /* fall through to proxy */ }
  // 2) proxy fallback (works from datacenter IPs)
  try {
    const res = await fetch(FX_PROXY, { headers: UA, next: { revalidate: REVALIDATE } })
    if (res.ok) {
      const parsed = parseFx(await res.text())
      if (parsed) return { ...parsed, ...base }
    }
  } catch { /* give up */ }
  return null
}
