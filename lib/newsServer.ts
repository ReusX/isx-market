import { getPosts, stripHtml, authorName } from '@/lib/cms'
import { createPublicClient } from '@/lib/supabase/server'
import { companyName } from '@/lib/market'
import { usableName } from '@/lib/statistics'
import companiesData from '@/public/data/companies.json'
import { sectorLabel } from '@/lib/screener'
import { PERIOD_LABEL, type NewsItem } from '@/lib/news'
import { messages } from '@/lib/i18n'
import type { Locale } from '@/lib/i18n/locale'
import { wrapVars } from '@/lib/wrapText'
import { loadSessions, loadSessionWrap } from '@/lib/wrapServer'
import { loadResults, loadResultsIndex, resultsSlug } from '@/lib/resultsServer'
import { resultsVars } from '@/lib/resultsText'

/**
 * /news · the feed: CMS articles and ISC filings, merged newest first.
 * Lifted unchanged from the old route's server component so the rebuilt
 * page reads the same rows.
 */
export type NewsInitial = {
  items: NewsItem[]
  sectors: { id: string; label: string }[]
  articlesOk: boolean
  filingsOk: boolean
  filingCoverage: { count: number; oldest: string; newest: string } | null
}

type FilingRow = {
  id: number
  ticker: string
  fiscal_year: number
  period: string
  pdf_url: string
  source_added_date: string
}

/**
 * The two streams load independently and on purpose.
 *
 * The editorial feed is headless WordPress on a different host from the filing
 * index in Supabase, so either can fail while the other is fine. Reporting one
 * outage as "no news" would be a lie about the other, and the approved design
 * has a state for exactly this — the page keeps what loaded and names what did
 * not. As of this writing the CMS host is returning 403 to every request,
 * which is what that state is for.
 */
async function loadArticles(locale: Locale): Promise<{ items: NewsItem[]; ok: boolean }> {
  // Covers the full archive rather than the first page. This index is the only
  // crawlable path to /news/[slug]; capping it left the rest orphaned.
  const { posts } = await getPosts('news', { perPage: 100 })
  if (!posts.length) return { items: [], ok: false }
  return {
    ok: true,
    items: posts.map(p => ({
      id: `a${p.id}`,
      kind: 'article' as const,
      at: p.date,
      headline: stripHtml(p.title.rendered),
      excerpt: stripHtml(p.excerpt.rendered).slice(0, 180) || null,
      // WordPress carries no company relationship here — no ticker field, and
      // nothing reads the tags. An article is a market-wide item until that
      // exists, rather than being guessed at from its title.
      symbol: null, name: null, sector: null,
      source: authorName(p) || messages(locale).news.sources.article,
      doc: null,
      /*
       * ⚠ ALWAYS the Arabic article URL, in both locales.
       *
       * The CMS holds one Arabic body per article and no English translation.
       * `/en/news/[slug]` is deliberately not generated (lib/i18n/routes.ts),
       * so on the English index each item links to its canonical Arabic
       * article and is marked as Arabic. Pointing an English reader at a URL
       * that does not exist, or minting one that serves an Arabic body under
       * an English path, are the two failures this avoids.
       */
      href: `/news/${p.slug}`,
      external: false,
      foreignLang: locale === 'en',
    })),
  }
}

async function loadFilings(locale: Locale): Promise<{ items: NewsItem[]; ok: boolean; oldest: string | null; newest: string | null }> {
  try {
    const sb = createPublicClient()
    const { data } = await sb.from('financial_reports_public')
      .select('id,ticker,fiscal_year,period,pdf_url,source_added_date')
      .order('source_added_date', { ascending: false })
      .limit(1000)
    const rows = (data ?? []) as FilingRow[]
    if (!rows.length) return { items: [], ok: false, oldest: null, newest: null }

    const { data: mData } = await sb.from('company_metrics').select('ticker,sector,name_ar,name_en').limit(2000)
    const metrics = (mData ?? []) as { ticker: string; sector: string | null; name_ar: string | null; name_en: string | null }[]
    const byTicker = new Map(metrics.map(m => [m.ticker, m]))
    // `companies.json` is the canonical name source and beats
    // `company_metrics.name_ar`, whose Arabic is mangled for a good number of
    // tickers — «الخاتم لالتصاالت» where the canonical file has «الخاتم
    // للاتصالات». lib/market's fetchCompanyMeta cannot be used here: it
    // requests the relative path `/data/companies.json`, which has no base URL
    // on the server and throws every time, so this loader was silently falling
    // back to the broken column. The rest of the app imports the file directly
    // on the server; so does this.
    const metaMap = new Map(companiesData.map(x => [x.sym, x]))

    const items = rows.map(r => {
      const m = byTicker.get(r.ticker)
      const mt = metaMap.get(r.ticker)
      const period = PERIOD_LABEL[r.period] ?? r.period
      return {
        id: `f${r.id}`,
        kind: 'filing' as const,
        at: r.source_added_date,
        // Composed from the four fields the source actually has. Nothing is
        // claimed about what the document says.
        headline: `${period} ${r.fiscal_year}`,
        excerpt: null,
        symbol: r.ticker,
        // `usableName` keeps numeric and placeholder junk out of the feed.
        name: companyName({
          ar: usableName(mt?.ar) ? mt!.ar : null,
          en: usableName(mt?.en) ? mt!.en : null,
          name_ar: usableName(m?.name_ar) ? m!.name_ar : null,
          name_en: usableName(m?.name_en) ? m!.name_en : null,
        }, r.ticker, locale),
        sector: m?.sector ?? null,
        source: messages(locale).news.sources.filing,
        doc: { type: messages(locale).news.financialStatements, period: r.period, year: r.fiscal_year },
        href: r.pdf_url,
        external: true,
      }
    })
    const stamps = rows.map(r => r.source_added_date).sort()
    return { items, ok: true, oldest: stamps[0], newest: stamps[stamps.length - 1] }
  } catch {
    return { items: [], ok: false, oldest: null, newest: null }
  }
}


/* The daily session wraps as feed rows: the last thirty sessions, each a
   headline with the close and the move. Arabic pages, so on /en/news they
   carry the foreign-language mark like the CMS articles do. */
async function loadWraps(locale: Locale): Promise<NewsItem[]> {
  try {
    const t = messages(locale)
    const dates = (await loadSessions(30))
    const wraps = await Promise.all(dates.map((d) => loadSessionWrap(d)))
    return wraps.flatMap((s) => {
      if (!s) return []
      const v = wrapVars(s, t, locale)
      return [{
        id: `w${s.date}`, kind: 'wrap' as const, at: `${s.date}T14:00:00+03:00`,
        headline: t.wrap.feedHeadline(v.dateShort, v.close, v.pct, v.dir),
        excerpt: `${t.wrap.breadth(v)} ${t.wrap.liquidity(v)}`,
        symbol: null, name: null, sector: null, source: t.wrap.source, doc: null,
        href: `/news/session/${s.date}`, external: false, foreignLang: locale !== 'ar',
      }]
    })
  } catch { return [] }
}

/* Company results as feed rows: the forty most recent trusted filings. */
async function loadResultRows(locale: Locale): Promise<NewsItem[]> {
  try {
    const t = messages(locale)
    const keys = (await loadResultsIndex()).slice(0, 40)
    const all = await Promise.all(keys.map((k) => loadResults(k.sym, resultsSlug(k))))
    return all.flatMap((x) => {
      if (!x) return []
      const v = resultsVars(x, t, locale)
      const sec = (companiesData as { sym: string; sec?: string }[]).find((c) => c.sym === x.key.sym)?.sec ?? null
      return [{
        id: `r${x.key.sym}${x.slug}`, kind: 'results' as const, at: x.addedAt ?? `${x.key.year}-12-31T00:00:00Z`,
        headline: t.results.feedHeadline(v), excerpt: t.results.revenue(v) || t.results.balance(v) || null,
        symbol: x.key.sym, name: locale === 'ar' ? x.ar : x.en, sector: sec, source: t.results.sourceName, doc: null,
        href: `/c/${x.key.sym}/results/${x.slug}`, external: false, foreignLang: locale !== 'ar',
      }]
    })
  } catch { return [] }
}

/* The aggregator feed: headlines the GitHub job collected from the press
   and the institutions (news_feed). Each links out; nothing is rewritten.
   A missing table (before the migration runs) simply contributes nothing. */
async function loadExternal(locale: Locale): Promise<NewsItem[]> {
  try {
    const t = messages(locale)
    const sb = createPublicClient()
    const since = new Date(Date.now() - 14 * 86400_000).toISOString()
    const { data, error } = await sb.from('news_feed').select('url,source,title,summary,lang,ticker,published_at')
      .gte('published_at', since).order('published_at', { ascending: false }).limit(300)
    if (error || !data) return []
    const names = t.news.sources as Record<string, string>
    return (data as { url: string; source: string; title: string; summary: string | null; lang: string; ticker: string | null; published_at: string }[]).map((r) => ({
      id: `x${r.url}`, kind: 'external' as const, at: r.published_at,
      headline: r.title, excerpt: r.summary, symbol: r.ticker, name: null, sector: null,
      source: names[r.source] ?? r.source, doc: null, href: r.url, external: true,
      foreignLang: r.lang !== locale,
    }))
  } catch { return [] }
}

export async function loadNews(locale: Locale): Promise<NewsInitial> {
  const [articles, filings, wraps, results, external] = await Promise.all([loadArticles(locale), loadFilings(locale), loadWraps(locale), loadResultRows(locale), loadExternal(locale)])
  const items = [...articles.items, ...filings.items, ...wraps, ...results, ...external]
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))
  return {
    items,
    sectors: Array.from(new Set(filings.items.map(i => i.sector).filter(Boolean) as string[]))
      .map(id => ({ id, label: sectorLabel(id, locale) }))
      .sort((a, b) => a.label.localeCompare(b.label, 'ar')),
    articlesOk: articles.ok,
    filingsOk: filings.ok,
    filingCoverage: filings.oldest && filings.newest
      ? { count: filings.items.length, oldest: filings.oldest, newest: filings.newest }
      : null,
  }
}
