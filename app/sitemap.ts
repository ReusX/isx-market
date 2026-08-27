import { MetadataRoute } from 'next'
import companiesData from '@/public/data/companies.json'
import { getPosts, type Section } from '@/lib/cms'
import { getLastSessionDate } from '@/lib/freshness'
import { absUrl } from '@/lib/seo'
import { isPaired } from '@/lib/i18n/routes'


// Regenerate the sitemap hourly so new articles/companies get picked up without
// a redeploy (the WP fetches inside getPosts cache for 5 min on their own).
export const revalidate = 3600

// Pull every published post slug for a CMS section (news / research / learn),
// paging through the WP REST API. Falls back to whatever we have if WP is down.
async function allPosts(section: Section): Promise<{ slug: string; modified: string }[]> {
  const out: { slug: string; modified: string }[] = []
  try {
    const first = await getPosts(section, { page: 1, perPage: 100 })
    const take = (posts: typeof first.posts) =>
      out.push(...posts.map(p => ({ slug: p.slug, modified: p.modified || p.date })))
    take(first.posts)
    for (let page = 2; page <= Math.min(first.totalPages, 10); page++) {
      take((await getPosts(section, { page, perPage: 100 })).posts)
    }
  } catch { /* WP unavailable — ship the static + company URLs anyway */ }
  return out
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  /*
   * Market pages are stamped with the real date of the latest ISX bulletin, not
   * `now`. A sitemap that claims every URL changed this minute, on every fetch,
   * is a signal Google discounts — and it did: the SERP was showing crawl dates
   * three weeks stale on pages headlined اليوم. Pages whose content genuinely
   * does not change (legal, about) keep their own honest dates below.
   */
  const session = await getLastSessionDate()
  const dataDate = session ? new Date(session) : now

  // Static copy. Claiming these changed today, every day, is the same false
  // signal in miniature — bump this by hand when the text actually changes.
  const staticDate = new Date('2026-06-24')

  // ── Public, indexable static pages ──
  const statics: MetadataRoute.Sitemap = [
    { url: absUrl('/'),            lastModified: dataDate, changeFrequency: 'hourly',  priority: 1.0 },
    { url: absUrl('/market'),     lastModified: dataDate, changeFrequency: 'hourly',  priority: 1.0 },
    { url: absUrl('/charts'),     lastModified: dataDate, changeFrequency: 'daily',   priority: 0.9 },
    { url: absUrl('/screener'),   lastModified: dataDate, changeFrequency: 'daily',   priority: 0.9 },
    { url: absUrl('/heatmap'),    lastModified: dataDate, changeFrequency: 'daily',   priority: 0.9 },
    { url: absUrl('/pulse'),      lastModified: dataDate, changeFrequency: 'daily',   priority: 0.9 },
    { url: absUrl('/companies'),  lastModified: dataDate, changeFrequency: 'daily',   priority: 0.9 },
    { url: absUrl('/news'),       lastModified: now, changeFrequency: 'hourly',  priority: 0.9 },
    // Rates tools — high-traffic SEO landing pages
    { url: absUrl('/gold'),       lastModified: now, changeFrequency: 'hourly',  priority: 0.9 },
    { url: absUrl('/oil'),        lastModified: now, changeFrequency: 'hourly',  priority: 0.9 },
    { url: absUrl('/fx'),         lastModified: now, changeFrequency: 'daily',   priority: 0.8 },
    // Statistics hub + dedicated panels
    { url: absUrl('/statistics'),              lastModified: dataDate, changeFrequency: 'weekly', priority: 0.8 },
    { url: absUrl('/statistics/foreign-flow'), lastModified: dataDate, changeFrequency: 'weekly', priority: 0.7 },
    { url: absUrl('/statistics/ownership'),    lastModified: dataDate, changeFrequency: 'weekly', priority: 0.7 },
    { url: absUrl('/statistics/shareholders'), lastModified: dataDate, changeFrequency: 'weekly', priority: 0.7 },
    // Content hubs
    { url: absUrl('/research'),   lastModified: now, changeFrequency: 'daily',   priority: 0.8 },
    { url: absUrl('/analysis'),   lastModified: now, changeFrequency: 'daily',   priority: 0.8 },
    { url: absUrl('/learn'),      lastModified: now, changeFrequency: 'weekly',  priority: 0.8 },
    { url: absUrl('/learn/trading-from-zero'), lastModified: staticDate, changeFrequency: 'monthly', priority: 0.7 },
    { url: absUrl('/banks'),      lastModified: staticDate, changeFrequency: 'monthly', priority: 0.7 },
    // Info / legal
    { url: absUrl('/about'),      lastModified: staticDate, changeFrequency: 'monthly', priority: 0.5 },
    { url: absUrl('/contact'),    lastModified: staticDate, changeFrequency: 'monthly', priority: 0.4 },
    { url: absUrl('/privacy'),    lastModified: staticDate, changeFrequency: 'yearly',  priority: 0.3 },
    { url: absUrl('/legal'),      lastModified: staticDate, changeFrequency: 'yearly',  priority: 0.3 },
  ]

  // ── Per-company pages (server-rendered SEO content + live price) ──
  // Only /c/[sym]; the /financials sub-page is client-rendered and is reached via
  // links from here, so we don't list it separately (avoids thin-page signals).
  const companies: MetadataRoute.Sitemap = (companiesData as { sym: string }[]).map(c => ({
    url:             absUrl(`/c/${c.sym}`),
    lastModified:    dataDate,
    changeFrequency: 'hourly' as const,
    priority:        0.8,
  }))

  // ── CMS articles (news / research / learn) ──
  const [news, research, learn] = await Promise.all([
    allPosts('news'), allPosts('research'), allPosts('learn'),
  ])
  const article = (section: string, p: { slug: string; modified: string }, priority: number): MetadataRoute.Sitemap[number] => ({
    url:             absUrl(`/${section}/${p.slug}`),
    lastModified:    p.modified ? new Date(p.modified) : now,
    changeFrequency: 'weekly',
    priority,
  })
  const articles: MetadataRoute.Sitemap = [
    ...news.map(p => article('news', p, 0.7)),
    ...research.map(p => article('research', p, 0.7)),
    ...learn.map(p => article('learn', p, 0.6)),
  ]

  const arabic = [...statics, ...companies, ...articles]

  /*
   * ── The English half ────────────────────────────────────────────────────
   *
   * Derived, never typed by hand: an entry gets an `/en` twin if — and ONLY
   * if — `lib/i18n/routes.ts` says the route exists in both languages. That
   * single check enforces every exclusion the brief asks for, without a
   * second list to keep in step:
   *
   *   · `/news/[slug]` and `/learn/[slug]` are `ar-only`, so no English
   *     article URL is minted for content that has no English translation.
   *   · `/research`, `/analysis`, `/banks`, `/charts`, `/companies` and
   *     `/alerts` are `ar-only` — compatibility routes open under the
   *     retirement matrix. They keep their Arabic entry and gain no English
   *     twin, because minting one creates a second URL to retire.
   *   · `/portfolio`, `/watchlist`, `/profile` and the auth family are
   *     `private`: absent from BOTH halves, as they already are.
   *
   * `/learn/trading-from-zero` IS mirrored, because that guide is authored in
   * this repo and genuinely translated.
   *
   * No `/ar` alias and no locale query parameter appears anywhere: Arabic is
   * the site root, and that is the only address it has.
   */
  const english: MetadataRoute.Sitemap = arabic
    .filter((entry) => {
      const route = entry.url.replace(absUrl('/'), '') || '/'
      return isPaired(route)
    })
    .map((entry) => {
      const route = entry.url.replace(absUrl('/'), '') || '/'
      return { ...entry, url: absUrl(route, 'en') }
    })

  return [...arabic, ...english]
}
