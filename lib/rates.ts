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
  stale?: boolean         // served from cache · the source could not be read
  /* Evidence, for the observation record. A URL is not durable — the page at
     that address can be edited — so the sentence actually parsed travels with
     the numbers and is fingerprinted on the way into fx_observations. */
  excerpt?: string | null
  publishedAt?: string | null   // the source's own timestamp, where it states one
}

const jina = (url: string) => 'https://r.jina.ai/' + url

// ── Primary source: Alsumaria daily dollar article ──────────────────────────
// Alsumaria posts a "أسعار الدولار مع إغلاق التداولات" article every day. The
// economy listing is JS-rendered, so we discover the latest article through the
// r.jina.ai reader (which executes JS), then parse the buy/sell prices (quoted
// per 100 USD) from the article body.
const ALS_LIST = 'https://www.alsumaria.tv/economy-news'

async function fetchText(url: string, timeout = 12000): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: UA, next: { revalidate: REVALIDATE }, signal: AbortSignal.timeout(timeout) })
    return res.ok ? await res.text() : null
  } catch { return null }
}

// Newest dollar-price article in a listing page. Handles both shapes we read:
// absolute percent-encoded links (r.jina.ai markdown) and the relative, often
// literally-Arabic hrefs in the site's own HTML.
export function pickDollarArticle(text: string): string | null {
  let best: { id: number; url: string } | null = null
  for (const m of Array.from(text.matchAll(/(?:https:\/\/www\.alsumaria\.tv)?\/news\/economy\/(\d+)\/([^\s"'<>)]+)/g))) {
    const id = +m[1]
    const url = `https://www.alsumaria.tv/news/economy/${m[1]}/${m[2]}`
    let slug = m[2]
    try { slug = decodeURIComponent(slug) } catch { /* already literal */ }
    // dollar price articles: title mentions الدولار + a market verb, but NOT gold/oil/other-commodity articles
    /* ⚠ Normalise the alef before testing, and accept VERB forms.
       This filter silently froze the page for two days. The newest article was
       «الدولار-يرتفع-من-جديد-الاسعار-تعود-الى-سابق-عهدها» and it matched
       nothing: the list had the noun «ارتفاع» but the headline used the verb
       «يرتفع», and it had «أسعار» with a hamza where the slug writes «الاسعار»
       without one. Alsumaria's headline wording drifts by design — it is a
       newsroom, not an API — so match on the SHAPE of a dollar-price story
       rather than on a closed list of exact words. */
    const norm = slug.replace(/[أإآٱ]/g, 'ا')
    const aboutPrice = /(اغلاق|التداولات|السوق|الاسواق|ارتفاع|يرتفع|تراجع|يتراجع|انخفاض|ينخفض|يستقر|استقرار|صعود|يصعد|هبوط|يهبط|قفزة|اسعار|سعر|الصرف)/
    /* Not every «دولار» headline is a rate headline. On 1 September this
       picked «أسعار خام برنت تكسر حاجز الـ97 دولارا» — Brent crude at $97 a
       BARREL — because the slug carries both «دولارا» and «أسعار». The parse
       then found no buy/sell pair and returned null, so no wrong rate was
       published, but the picker had already spent the day on the wrong story.
       Commodities and money-amount stories («524 مليون دولار فاتورة البطاطا»)
       are named out. */
    const notARate = /ذهب|نفط|بترول|غاز|برنت|خام|اوبك|مليون|مليار|يورو|بيتكوين|رقمي/
    if (/دولار/.test(norm) && aboutPrice.test(norm) && !notARate.test(norm)) {
      if (!best || id > best.id) best = { id, url }
    }
  }
  return best?.url ?? null
}

// The economy listing serves its article links in static HTML, so read it
// directly; r.jina.ai is only the fallback for when that stops being true.
// (The reader is also rate-limited — it answers 403 often enough that it
// cannot be the primary path.)
const ALS_SITEMAP = 'https://www.alsumaria.tv/sitemap.xml'

async function discoverDollarArticle(): Promise<string | null> {
  const direct = await fetchText(ALS_LIST)
  const fromDirect = direct && pickDollarArticle(direct)
  if (fromDirect) return fromDirect
  const proxied = await fetchText(jina(ALS_LIST))
  const fromProxy = proxied && pickDollarArticle(proxied)
  if (fromProxy) return fromProxy
  /* The listing went client-rendered on 1 September 2026: 1.17 MB of HTML
     carrying exactly one article id, so discovery found nothing and the
     scheduled job recorded nothing. The sitemap is still static XML and still
     lists ~126 economy articles with their ids, which is all the picker needs.
     Kept as the third path rather than the first because the listing is
     ordered by recency and the sitemap is not. */
  const sitemap = await fetchText(ALS_SITEMAP)
  return (sitemap && pickDollarArticle(sitemap)) || null
}

export function parseAlsumaria(raw: string, url: string): FxData | null {
  // Normalize both the direct HTML and the r.jina.ai markdown: strip tags, then
  // collapse markdown links `[text](url)` → text and drop bare URLs. Jina renders
  // "بغداد" as a link, which otherwise injects a long URL between the البيع label
  // and its figure and breaks the bounded-gap match below.
  const t = raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/https?:\/\/\S+/g, ' ')
    // Same alef fold as the discovery filter, for the same reason: the source
    // writes «أسعار» and «اسعار» interchangeably from one day to the next.
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/\s+/g, ' ')
  const n = (s: string) => parseInt(s.replace(/[,،]/g, ''), 10)
  // A parallel-market dollar outside this band is a misparse, not a rate.
  const sane = (v: number | null) => (v != null && v >= 1000 && v <= 2500 ? v : null)

  // Prices are quoted "<label> … NNNNNN ديناراً مقابل/لكل 100 دولار". The label
  // and its figure may be separated by a clause (e.g. البيع "في محال الصيرفة
  // بالأسواق المحلية في بغداد" 156750 …), so allow a bounded gap and anchor on
  // the "… 100 دولار" tail. Non-greedy → takes the figure nearest each label.
  //
  // Alsumaria's wording drifts, though, and the second price often drops the
  // tail entirely: "…البيع 151,000 دينار مقابل 100 دولار. بينما سجل سعر الشراء
  // 150,000 ديناراً." That silently left `buy` null. So fall back to the label
  // and its nearest figure, and read the unit off the magnitude — six figures
  // is per 100 dollars, four is per one.
  const seen: string[] = []
  const price = (label: string) => {
    // «مقابل 100 دولار», «لكل 100 دولار» AND «مقابل كل 100 دولار» — the last
    // of which the source used on 27 August and this pattern did not match.
    const tailed = t.match(new RegExp(label + String.raw`[\s\S]{0,90}?([\d,،]{5,7})\s*دينار\S*\s*(?:مقابل\s*كل|مقابل|لكل)\s*100\s*دولار`))
    if (tailed) { seen.push(tailed[0].trim()); return sane(n(tailed[1]) / 100) }
    const bare = t.match(new RegExp(label + String.raw`[\s\S]{0,90}?([\d,،]{4,7})\s*دينار`))
    if (!bare) return null
    seen.push(bare[0].trim())
    const v = n(bare[1])
    return sane(v >= 10_000 ? v / 100 : v)
  }
  let sell = price('(?:ال)?بيع')
  const buy  = price('(?:ال)?شراء')

  /* Some days the sell side carries no label at all. On 27 August the article
     read «وبلغت اسعار صرف الدولار … 155000 دينار مقابل كل 100 دولار. بينما سجل
     سعر الشراء 154000 دينار» — the buy price is named, the sell price is just
     "the dollar exchange rate". Reading that unlabelled figure as the sell
     price is an inference, so it is GUARDED by the one invariant a currency
     spread always satisfies: an exchange shop sells dearer than it buys. If
     the figure is not above the buy price it is something else — a headline
     number, a total, last week's rate — and is left null rather than guessed. */
  if (sell == null && buy != null) {
    const general = price('(?:اسعار|سعر)\\s*صرف\\s*الدولار')
    if (general != null && general > buy) sell = general
  }
  if (sell == null && buy == null) return null
  // JSON-LD only exists on the raw HTML; through the r.jina.ai reader the page
  // arrives as markdown, where the dateline is plain text ("2026-07-25 | 04:00").
  const date = raw.match(/"datePublished":\s*"([^"]+)"/)?.[1]?.slice(0, 10)
    ?? raw.match(/\b(20\d{2}-\d{2}-\d{2})\b/)?.[1]
    ?? null
  const publishedAt = raw.match(/"datePublished":\s*"([^"]+)"/)?.[1] ?? null
  return {
    buy, sell, change: null, date, source: 'alsumaria.tv', sourceUrl: url,
    fetchedAt: new Date().toISOString(),
    excerpt: seen.length ? seen.join(' · ').slice(0, 600) : null,
    publishedAt,
  }
}

async function tryFetch(url: string, parse: (raw: string, url: string) => FxData | null): Promise<FxData | null> {
  const raw = await fetchText(url)
  return raw ? parse(raw, url) : null
}

/* ── Who writes what ──────────────────────────────────────────────────────
   `fetchFx` serves a rate and keeps the fallback fresh. It does NOT write
   history.

   It used to: an `archive()` call appended an observation on every ISR
   revalidation. Dedupe made that safe, but it put a service-role write inside
   the page-rendering path for no coverage gain — /fx is `force-static` with a
   3-hour revalidate, and scripts/fx-record.ts already runs five times through
   the trading day on a deterministic schedule. Ingestion belongs to the job;
   presentation reads. `writeFxCache` stays here because the cache IS
   presentation resilience — it is what the page serves when the source is
   down, and it is one row, not a record. */
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
    // Admin client: rates_cache is not writable by the anon role, so the
    // ordinary server client failed silently and left the fallback frozen at
    // whatever rate was current when the row was last written by hand.
    const { createAdminClient } = await import('@/lib/supabase/server')
    await createAdminClient()
      .from('rates_cache')
      .upsert({ key: CACHE_KEY, data: fx, updated_at: new Date().toISOString() })
  } catch { /* best-effort */ }
}

export async function fetchFx(): Promise<FxData | null> {
  const article = await discoverDollarArticle()
  if (article) {
    // NOT encodeURI(article): the listing already hands us a percent-encoded
    // URL, so re-encoding turned every %D8 into %25D8 and the article 404'd —
    // which is how this page came to serve a month-old rate from cache.
    const direct = await tryFetch(article, parseAlsumaria)
    if (direct) { await writeFxCache(direct); return direct }
    const viaProxy = await tryFetch(jina(article), (raw) => parseAlsumaria(raw, article))
    if (viaProxy) { await writeFxCache(viaProxy); return viaProxy }
  }
  // Alsumaria unavailable · serve the last known rate, but say so. Serving a
  // month-old dollar rate as if it were today's is worse than showing nothing.
  const cached = await readFxCache()
  return cached ? { ...cached, stale: true } : null
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
