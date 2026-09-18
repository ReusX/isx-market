import { MetadataRoute } from 'next'
import companiesData from '@/public/data/companies.json'
import { listBanks, listProducts, listServices, bankFinancials, indexability } from '@/lib/banks'
import { editorialFor } from '@/lib/bankEditorial'
import { listArticles, articlePath, type Section } from '@/lib/articles'
import { getLastSessionDate } from '@/lib/freshness'
import { absUrl } from '@/lib/seo'
import { loadSessions, sessionIndexable } from '@/lib/wrapServer'
import { loadResultsIndex, resultsSlug } from '@/lib/resultsServer'
import { isPaired } from '@/lib/i18n/routes'


// Regenerate the sitemap hourly so new sessions/filings get picked up without
// a redeploy. Articles are repo files, so they change only with a deploy.
export const revalidate = 3600

const allPosts = (section: Section) =>
  listArticles(section).map((a) => ({ slug: a.slug, modified: a.modified || a.date }))

/*
 * ⚠ No `<priority>` and no `<changefreq>`. Google ignores both and has said so
 * for years; all they did here was assert 304 confident-looking numbers that
 * no crawler reads. `<lastmod>` stays, because Google DOES use it — which is
 * exactly why it has to be honest, and why market pages carry the real ISX
 * session date rather than the moment of the build.
 */
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
    { url: absUrl('/'),            lastModified: dataDate },
    { url: absUrl('/market'),     lastModified: dataDate },
    { url: absUrl('/screener'),   lastModified: dataDate },
    { url: absUrl('/heatmap'),    lastModified: dataDate },
    { url: absUrl('/pulse'),      lastModified: dataDate },
    { url: absUrl('/companies'),  lastModified: dataDate },
    { url: absUrl('/news'),       lastModified: now },
    // Rates tools — high-traffic SEO landing pages
    { url: absUrl('/gold'),       lastModified: now },
    { url: absUrl('/silver'),     lastModified: dataDate },
    { url: absUrl('/currencies'), lastModified: dataDate },
    ...['try', 'sar', 'irr', 'eur', 'aed', 'kwd', 'jod', 'gbp'].map((c) => ({ url: absUrl(`/currencies/${c}`), lastModified: dataDate })),
    { url: absUrl('/oil'),        lastModified: now },
    { url: absUrl('/policy-rate'), lastModified: new Date('2024-10-24') },
    { url: absUrl('/cbi-window'), lastModified: new Date('2025-02-27') },
    { url: absUrl('/inflation'),  lastModified: new Date('2026-07-01') },
    { url: absUrl('/fx'),         lastModified: now },
    // Statistics hub + dedicated panels
    { url: absUrl('/statistics'),              lastModified: dataDate },
    { url: absUrl('/statistics/foreign-flow'), lastModified: dataDate },
    { url: absUrl('/statistics/ownership'),    lastModified: dataDate },
    { url: absUrl('/statistics/shareholders'), lastModified: dataDate },
    // Content hubs
    { url: absUrl('/research'),   lastModified: now },
    { url: absUrl('/analysis'),   lastModified: now },
    { url: absUrl('/learn'),      lastModified: now },
    { url: absUrl('/learn/trading-from-zero'), lastModified: staticDate },
    /* /banks is listed with the bank block below, dated by the data. */
    // Info / legal
    { url: absUrl('/about'),      lastModified: staticDate },
    { url: absUrl('/widget'),     lastModified: new Date('2026-09-18') },
    { url: absUrl('/contact'),    lastModified: staticDate },
    { url: absUrl('/privacy'),    lastModified: staticDate },
    { url: absUrl('/legal'),      lastModified: staticDate },
  ]

  // ── Per-company pages (server-rendered SEO content + live price) ──
  // Only /c/[sym]; the /financials sub-page is client-rendered and is reached via
  // links from here, so we don't list it separately (avoids thin-page signals).
  const companies: MetadataRoute.Sitemap = (companiesData as { sym: string }[]).map(c => ({
    url:             absUrl(`/c/${c.sym}`),
    lastModified:    dataDate,
  }))

  // ── Articles (news / research / learn) ──
  const [news, research, learn] = [allPosts('news'), allPosts('research'), allPosts('learn')]
  const article = (section: string, p: { slug: string; modified: string }): MetadataRoute.Sitemap[number] => ({
    url:             absUrl(articlePath(section as Section, p.slug)),
    lastModified:    p.modified ? new Date(p.modified) : now,
  })
  /* Daily session wraps: one URL per trading day, generated from the
     session tables. The archive page plus every session on record. */
  const sessions = await loadSessions(600)
  const filings = await loadResultsIndex()
  const articles: MetadataRoute.Sitemap = [
    ...news.map(p => article('news', p)),
    ...research.map(p => article('research', p)),
    ...learn.map(p => article('learn', p)),
    { url: absUrl('/news/session'), lastModified: sessions[0] ? new Date(sessions[0]) : now },
    /* Recent wraps only — the older ones carry noindex (lib/wrapServer). */
    ...sessions.filter(sessionIndexable).map((d) => ({ url: absUrl(`/news/session/${d}`), lastModified: new Date(d) })),
    /* Company results: one URL per trusted filing. */
    ...filings.map((k) => ({ url: absUrl(`/c/${k.sym}/results/${resultsSlug(k)}`), lastModified: k.addedAt ? new Date(k.addedAt) : now })),
  ]

  /* Bank profiles are indexed on SUBSTANCE, not on existence.
     79 directory entries have a prepared page; the sitemap carries the ones
     that say something verified — a product with published terms, or a listed
     bank with financials and confirmed services. A bank in liquidation or
     under guardianship is never listed: the page exists so the status is
     findable on the site, not so it competes for searches about a bank a
     reader cannot bank with. `indexability()` is the same call the page's
     robots meta makes, so the two cannot disagree. */
  const [allBanks, allProducts, allServices] = await Promise.all([listBanks(), listProducts(), listServices()])
  const fin = await bankFinancials(allBanks.map((b) => b.ticker).filter(Boolean) as string[])
  const banks: MetadataRoute.Sitemap = [
    { url: absUrl('/banks'), lastModified: dataDate },
    { url: absUrl('/banks/deposits'), lastModified: dataDate },
    { url: absUrl('/banks/loans'), lastModified: dataDate },
    ...allBanks
      .filter((b) => indexability(
        b,
        allProducts.filter((p) => p.bank_slug === b.slug),
        allServices.filter((s) => s.bank_slug === b.slug),
        Boolean(b.ticker && fin.get(b.ticker)),
        editorialFor(b.slug),
      ).indexable)
      .map((b) => ({ url: absUrl(`/banks/${b.slug}`), lastModified: dataDate })),
  ]

  const arabic = [...statics, ...companies, ...articles, ...banks]

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
   *   · `/research`, `/analysis` and `/alerts` are `ar-only` —
   *     compatibility routes open under the
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
