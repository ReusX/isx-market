import { MetadataRoute } from 'next'
import companiesData from '@/public/data/companies.json'
import { getPosts, type Section } from '@/lib/cms'

const BASE = 'https://iraqsm.com'

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

  // ── Public, indexable static pages ──
  const statics: MetadataRoute.Sitemap = [
    { url: `${BASE}`,            lastModified: now, changeFrequency: 'hourly',  priority: 1.0 },
    { url: `${BASE}/market`,     lastModified: now, changeFrequency: 'hourly',  priority: 1.0 },
    { url: `${BASE}/charts`,     lastModified: now, changeFrequency: 'daily',   priority: 0.9 },
    { url: `${BASE}/screener`,   lastModified: now, changeFrequency: 'daily',   priority: 0.9 },
    { url: `${BASE}/heatmap`,    lastModified: now, changeFrequency: 'daily',   priority: 0.9 },
    { url: `${BASE}/pulse`,      lastModified: now, changeFrequency: 'daily',   priority: 0.9 },
    { url: `${BASE}/companies`,  lastModified: now, changeFrequency: 'daily',   priority: 0.9 },
    { url: `${BASE}/news`,       lastModified: now, changeFrequency: 'hourly',  priority: 0.9 },
    // Rates tools — high-traffic SEO landing pages
    { url: `${BASE}/gold`,       lastModified: now, changeFrequency: 'hourly',  priority: 0.9 },
    { url: `${BASE}/oil`,        lastModified: now, changeFrequency: 'hourly',  priority: 0.9 },
    { url: `${BASE}/fx`,         lastModified: now, changeFrequency: 'daily',   priority: 0.8 },
    // Statistics hub + dedicated panels
    { url: `${BASE}/statistics`,              lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE}/statistics/foreign-flow`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE}/statistics/ownership`,    lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE}/statistics/shareholders`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    // Content hubs
    { url: `${BASE}/research`,   lastModified: now, changeFrequency: 'daily',   priority: 0.8 },
    { url: `${BASE}/analysis`,   lastModified: now, changeFrequency: 'daily',   priority: 0.8 },
    { url: `${BASE}/learn`,      lastModified: now, changeFrequency: 'weekly',  priority: 0.8 },
    { url: `${BASE}/learn/trading-from-zero`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/banks`,      lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    // Info / legal
    { url: `${BASE}/about`,      lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/contact`,    lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE}/privacy`,    lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${BASE}/legal`,      lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
  ]

  // ── Per-company pages (server-rendered SEO content + live price) ──
  // Only /c/[sym]; the /financials sub-page is client-rendered and is reached via
  // links from here, so we don't list it separately (avoids thin-page signals).
  const companies: MetadataRoute.Sitemap = (companiesData as { sym: string }[]).map(c => ({
    url:             `${BASE}/c/${c.sym}`,
    lastModified:    now,
    changeFrequency: 'hourly' as const,
    priority:        0.8,
  }))

  // ── CMS articles (news / research / learn) ──
  const [news, research, learn] = await Promise.all([
    allPosts('news'), allPosts('research'), allPosts('learn'),
  ])
  const article = (section: string, p: { slug: string; modified: string }, priority: number): MetadataRoute.Sitemap[number] => ({
    url:             `${BASE}/${section}/${p.slug}`,
    lastModified:    p.modified ? new Date(p.modified) : now,
    changeFrequency: 'weekly',
    priority,
  })
  const articles: MetadataRoute.Sitemap = [
    ...news.map(p => article('news', p, 0.7)),
    ...research.map(p => article('research', p, 0.7)),
    ...learn.map(p => article('learn', p, 0.6)),
  ]

  return [...statics, ...companies, ...articles]
}
