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
  buy: number | null      // شراء — what changers pay for a dollar
  sell: number | null     // بيع  — what changers sell a dollar for (the quoted price)
  change: number | null   // vs yesterday's last price (egcurrency only)
  date: string | null
  source: string
  sourceUrl: string
  fetchedAt: string
}

const jina = (url: string) => 'https://r.jina.ai/' + url

// ── Primary source: Alsumaria daily dollar article ──────────────────────────
// Alsumaria posts a "أسعار الدولار مع إغلاق التداولات" article every day. The
// economy listing is JS-rendered, so we discover the latest article through the
// r.jina.ai reader (which executes JS), then parse the buy/sell prices (quoted
// per 100 USD) from the article body.
const ALS_LIST = 'https://www.alsumaria.tv/economy-news'

async function discoverDollarArticle(): Promise<string | null> {
  try {
    const res = await fetch(jina(ALS_LIST), { headers: UA, next: { revalidate: REVALIDATE } })
    if (!res.ok) return null
    const md = await res.text()
    let best: { id: number; url: string } | null = null
    const matches = Array.from(md.matchAll(/\((https:\/\/www\.alsumaria\.tv\/news\/economy\/(\d+)\/[^)]+)\)/g))
    for (const m of matches) {
      const url = m[1], id = +m[2]
      const dec = decodeURIComponent(url)
      // dollar price articles: title mentions الدولار + a market verb
      if (/دولار/.test(dec) && /(إغلاق|التداولات|السوق|الأسواق|ارتفاع|تراجع|يستقر|قفزة|أسعار)/.test(dec)) {
        if (!best || id > best.id) best = { id, url }
      }
    }
    return best?.url ?? null
  } catch {
    return null
  }
}

function parseAlsumaria(raw: string, url: string): FxData | null {
  const t = raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
  const n = (s: string) => parseInt(s.replace(/[,،]/g, ''), 10)
  const per100 = (re: RegExp) => { const m = t.match(re); return m ? n(m[1]) / 100 : null }
  // Prices are quoted "… ديناراً مقابل/لكل 100 دولار" — take the first (wholesale Baghdad) pair.
  const sell = per100(/بيع[:\s"]*([\d,،]+)\s*دينار\S*\s*(?:مقابل|لكل)\s*100\s*دولار/)
  const buy  = per100(/(?:ال)?شراء[:\s"]*([\d,،]+)\s*دينار\S*\s*(?:مقابل|لكل)\s*100\s*دولار/)
  if (sell == null && buy == null) return null
  const date = raw.match(/"datePublished":\s*"([^"]+)"/)?.[1]?.slice(0, 10) ?? null
  return { buy, sell, change: null, date, source: 'alsumaria.tv', sourceUrl: url, fetchedAt: new Date().toISOString() }
}

// ── Fallback source: egcurrency black-market page ───────────────────────────
const EG_URL = 'https://egcurrency.com/en/currency/USD-to-IQD/blackMarket'

function parseEgcurrency(raw: string): FxData | null {
  const t = raw.replace(/<[^>]+>/g, ' ').replace(/\*\*/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ')
  const date = t.match(/Black Market,\s*([A-Za-z]+,\s*[\d.]+\s+[\d:]+)/)?.[1] ?? null
  const buy  = floatNum(t.match(/Black Market,\s*[A-Za-z]+,\s*[\d.]+\s+[\d:]+\s+([\d,]+(?:\.\d+)?)/)?.[1])
  const sell = floatNum(t.match(/Sell Price:?\s*([\d,]+(?:\.\d+)?)/)?.[1])
  const change = floatNum(t.match(/Sell Price:?\s*[\d,.]+\s*([\-+]?[\d,]+\.?\d*)\s*Compared/i)?.[1])
  if (buy == null && sell == null) return null
  return { buy, sell, change, date, source: 'egcurrency.com', sourceUrl: EG_URL, fetchedAt: new Date().toISOString() }
}

async function tryFetch(url: string, parse: (raw: string, url: string) => FxData | null): Promise<FxData | null> {
  try {
    const res = await fetch(url, { headers: UA, next: { revalidate: REVALIDATE } })
    if (res.ok) return parse(await res.text(), url)
  } catch { /* ignore */ }
  return null
}

export async function fetchFx(): Promise<FxData | null> {
  // 1) Alsumaria (primary): discover latest article, then read it (direct, then proxy)
  const article = await discoverDollarArticle()
  if (article) {
    const direct = await tryFetch(encodeURI(article), parseAlsumaria)
    if (direct) return direct
    const viaProxy = await tryFetch(jina(article), (raw) => parseAlsumaria(raw, article))
    if (viaProxy) return viaProxy
  }
  // 2) egcurrency (fallback): direct, then proxy
  return (await tryFetch(EG_URL, (raw) => parseEgcurrency(raw)))
      ?? (await tryFetch(jina(EG_URL), (raw) => parseEgcurrency(raw)))
}
