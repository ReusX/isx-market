import { getPosts, stripHtml, authorName } from '@/lib/cms'
import { createPublicClient } from '@/lib/supabase/server'
import { companyName } from '@/lib/market'
import { usableName } from '@/lib/statistics'
import companiesData from '@/public/data/companies.json'
import { sectorLabel } from '@/lib/screener'
import { PERIOD_LABEL, type NewsItem } from '@/lib/news'
import { NewsClient } from './NewsClient'

export const revalidate = 300

// Title/description live in ./layout.tsx · a page-level `metadata` export wins
// over the layout's, so duplicating them here quietly discarded the canonical
// URL and OG tags the layout sets.

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
async function loadArticles(): Promise<{ items: NewsItem[]; ok: boolean }> {
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
      source: authorName(p) || 'تحرير IQWealth',
      doc: null,
      href: `/news/${p.slug}`,
      external: false,
    })),
  }
}

async function loadFilings(): Promise<{ items: NewsItem[]; ok: boolean; oldest: string | null; newest: string | null }> {
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
        }, r.ticker),
        sector: m?.sector ?? null,
        source: 'هيئة الأوراق المالية',
        doc: { type: 'البيانات المالية', period: r.period, year: r.fiscal_year },
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

export default async function NewsPage() {
  const [articles, filings] = await Promise.all([loadArticles(), loadFilings()])
  const items = [...articles.items, ...filings.items]
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))

  return (
    <NewsClient
      items={items}
      sectors={Array.from(new Set(filings.items.map(i => i.sector).filter(Boolean) as string[]))
        .map(id => ({ id, label: sectorLabel(id, 'ar') }))
        .sort((a, b) => a.label.localeCompare(b.label, 'ar'))}
      articlesOk={articles.ok}
      filingsOk={filings.ok}
      filingCoverage={filings.oldest && filings.newest
        ? { count: filings.items.length, oldest: filings.oldest, newest: filings.newest }
        : null}
    />
  )
}
