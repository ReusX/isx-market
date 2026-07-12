// ── Live gold & FX scrapers ─────────────────────────────────────────────────
// Server-side scrapers for the gold and USD/IQD black-market pages. Both
// sources serve their numbers in static HTML, so a tag-strip + regex pass is
// enough. Results are cached for REVALIDATE seconds (Next data cache), which
// gives us the requested "updated daily" behaviour without a DB or cron.

const UA = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36 (+iraqsm.com)',
}
const REVALIDATE = 60 * 60 * 3 // 3 hours · picks up the daily update reliably

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
    const res = await fetch(GOLD_URL, { headers: UA, next: { revalidate: REVALIDATE }, signal: AbortSignal.timeout(9000) })
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
  buy: number | null      // شراء · what changers pay for a dollar
  sell: number | null     // بيع  · what changers sell a dollar for (the quoted price)
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
    const res = await fetch(jina(ALS_LIST), { headers: UA, next: { revalidate: REVALIDATE }, signal: AbortSignal.timeout(9000) })
    if (!res.ok) return null
    const md = await res.text()
    let best: { id: number; url: string } | null = null
    const matches = Array.from(md.matchAll(/\((https:\/\/www\.alsumaria\.tv\/news\/economy\/(\d+)\/[^)]+)\)/g))
    for (const m of matches) {
      const url = m[1], id = +m[2]
      const dec = decodeURIComponent(url)
      // dollar price articles: title mentions الدولار + a market verb, but NOT gold/oil/other-commodity articles
      if (/دولار/.test(dec) && /(إغلاق|التداولات|السوق|الأسواق|ارتفاع|تراجع|يستقر|قفزة|أسعار|الصرف)/.test(dec) && !/ذهب|نفط|بترول/.test(dec)) {
        if (!best || id > best.id) best = { id, url }
      }
    }
    return best?.url ?? null
  } catch {
    return null
  }
}

function parseAlsumaria(raw: string, url: string): FxData | null {
  // Normalize both the direct HTML and the r.jina.ai markdown: strip tags, then
  // collapse markdown links `[text](url)` → text and drop bare URLs. Jina renders
  // "بغداد" as a link, which otherwise injects a long URL between the البيع label
  // and its figure and breaks the bounded-gap match below.
  const t = raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/\s+/g, ' ')
  const n = (s: string) => parseInt(s.replace(/[,،]/g, ''), 10)
  // Prices are quoted "<label> … NNNNNN ديناراً مقابل/لكل 100 دولار". The label
  // and its figure may be separated by a clause (e.g. البيع "في محال الصيرفة
  // بالأسواق المحلية في بغداد" 156750 …), so allow a bounded gap and anchor on
  // the "… 100 دولار" tail. Non-greedy → takes the figure nearest each label.
  const per100 = (label: string) => {
    const m = t.match(new RegExp(label + String.raw`[\s\S]{0,90}?([\d,،]{5,7})\s*دينار\S*\s*(?:مقابل|لكل)\s*100\s*دولار`))
    return m ? n(m[1]) / 100 : null
  }
  const sell = per100('(?:ال)?بيع')
  const buy  = per100('(?:ال)?شراء')
  if (sell == null && buy == null) return null
  const date = raw.match(/"datePublished":\s*"([^"]+)"/)?.[1]?.slice(0, 10) ?? null
  return { buy, sell, change: null, date, source: 'alsumaria.tv', sourceUrl: url, fetchedAt: new Date().toISOString() }
}

async function tryFetch(url: string, parse: (raw: string, url: string) => FxData | null): Promise<FxData | null> {
  try {
    const res = await fetch(url, { headers: UA, next: { revalidate: REVALIDATE }, signal: AbortSignal.timeout(9000) })
    if (res.ok) return parse(await res.text(), url)
  } catch { /* ignore */ }
  return null
}

const CACHE_KEY = 'fx'

async function readFxCache(): Promise<FxData | null> {
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const sb = await createClient()
    const { data } = await sb.from('rates_cache').select('data').eq('key', CACHE_KEY).single()
    return (data?.data as FxData) ?? null
  } catch { return null }
}

async function writeFxCache(fx: FxData): Promise<void> {
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const sb = await createClient()
    await sb.from('rates_cache').upsert({ key: CACHE_KEY, data: fx, updated_at: new Date().toISOString() })
  } catch { /* best-effort */ }
}

export async function fetchFx(): Promise<FxData | null> {
  const article = await discoverDollarArticle()
  if (article) {
    const direct = await tryFetch(encodeURI(article), parseAlsumaria)
    if (direct) { await writeFxCache(direct); return direct }
    const viaProxy = await tryFetch(jina(article), (raw) => parseAlsumaria(raw, article))
    if (viaProxy) { await writeFxCache(viaProxy); return viaProxy }
  }
  // Alsumaria unavailable · serve last known rate from cache
  return readFxCache()
}

// ── Oil prices ───────────────────────────────────────────────────────────────
// oilprice.com/ar serves the full quote tables in static HTML (each blend is a
// <tr data-name=…> with a data-price cell, a signed change/percent cell, and a
// data-stamp), so a per-row regex pass is enough · no JS reader needed. We keep
// every blend; the page curates which to feature (Iraq's Basrah crude first).
export interface OilBlend {
  key: string            // oilprice slug, e.g. "Brent-Crude"
  name: string           // Arabic blend name as published
  country: string | null // flag code, e.g. "iraq", "uk", "usa"
  usd: number            // last price, USD per barrel (gas blends per MMBtu/gal)
  change: number         // signed daily change
  pct: number            // signed daily change, %
  stamp: number | null   // unix seconds of the source's last update
}
export interface OilData {
  blends: OilBlend[]
  source: string
  sourceUrl: string
  fetchedAt: string
}

const OIL_URL = 'https://oilprice.com/ar/oil-price-charts'

export async function fetchOil(): Promise<OilData | null> {
  try {
    const res = await fetch(OIL_URL, { headers: UA, next: { revalidate: REVALIDATE }, signal: AbortSignal.timeout(9000) })
    if (!res.ok) return null
    const html = await res.text()

    const blends: OilBlend[] = []
    const seen = new Set<string>()
    const sign = (cls?: string) => (cls === 'change_down' ? -1 : 1)
    const mag  = (s?: string) => (s ? Math.abs(parseFloat(s.replace(/[^\d.]/g, ''))) : 0)

    // Each quote row starts at `data-name='…'` and runs until the next row /
    // table close. Pull the fields out of that bounded chunk.
    const rowRe = /data-name='([^']+)'([\s\S]*?)(?=data-name='|<\/table>)/g
    let m: RegExpExecArray | null
    while ((m = rowRe.exec(html))) {
      const key = m[1], chunk = m[2]
      if (seen.has(key)) continue
      const name  = chunk.match(/blend_name_span">([^<]+)</)?.[1]?.trim()
      const price = chunk.match(/last_price'\s*data-price='([\d.]+)'/)?.[1]
      if (!name || !price) continue
      const country = chunk.match(/<div class='flag_(\w+)'/)?.[1] ?? null
      const ch  = chunk.match(/class='(change_up|change_down|no_change)(?:\s+flat_change_cell)?'>([^<]+)</)
      const pc  = chunk.match(/class='(change_up|change_down|no_change)_percent[^']*'>([^<%]+)%/)
      const st  = chunk.match(/data-stamp='(\d+)'/)?.[1]
      seen.add(key)
      blends.push({
        key, name, country,
        usd: parseFloat(price),
        change: ch ? sign(ch[1]) * mag(ch[2]) : 0,
        pct:    pc ? sign(pc[1]) * mag(pc[2]) : 0,
        stamp:  st ? +st : null,
      })
    }
    if (!blends.length) return null
    return { blends, source: 'oilprice.com', sourceUrl: OIL_URL, fetchedAt: new Date().toISOString() }
  } catch {
    return null
  }
}
