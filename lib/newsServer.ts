import { listArticles, stripHtml, articlePath, isOwnArticle } from '@/lib/articles'
import { articleFigures, coverTopic } from '@/lib/articleFigures'
import type { NewsItem } from '@/lib/news'
import { messages } from '@/lib/i18n'
import type { Locale } from '@/lib/i18n/locale'

/**
 * /news · the feed: our own articles only, newest first (user, 2026-10-02).
 *
 * The feed used to merge ISC filings, the outside-news repost feed, the
 * daily session wraps and company results. Those pages still exist where
 * they belong (the wraps under /news/session, linked from the markets rail;
 * results on each company page); the feed is only what IQWealth writes.
 */
export type NewsInitial = {
  items: NewsItem[]
  articlesOk: boolean
}

/**
 * Editorial articles come from content/articles/news — repo files, so this
 * cannot fail the way the old headless CMS did.
 */
async function loadArticles(locale: Locale): Promise<{ items: NewsItem[]; ok: boolean }> {
  const posts = listArticles('news').filter(isOwnArticle)
  return {
    ok: true,
    items: posts.map(p => ({
      id: `a${p.id || p.slug}`,
      kind: 'article' as const,
      at: p.evergreen ? p.modified : p.date,
      headline: p.title,
      excerpt: stripHtml(p.excerpt).slice(0, 180) || null,
      // `tickers:` in the frontmatter names the companies an article is about;
      // the feed shows the first one. Most exported pieces are market-wide.
      symbol: p.tickers[0] ?? null, name: null, sector: null,
      source: p.author || messages(locale).news.sources.article,
      doc: null,
      /*
       * ⚠ ALWAYS the Arabic article URL, in both locales. Articles are written
       * in Arabic only; `/en/news/[slug]` is deliberately not generated
       * (lib/i18n/routes.ts), so the English index links to the canonical
       * Arabic article and marks it as Arabic.
       */
      href: articlePath('news', p.slug),
      external: false,
      cover: { image: p.image || null, topic: coverTopic(articleFigures(`${p.title} ${p.excerpt} ${p.tags.join(' ')}`, p.tickers)) },
      foreignLang: locale === 'en',
    })),
  }
}

export async function loadNews(locale: Locale): Promise<NewsInitial> {
  const articles = await loadArticles(locale)
  return { items: articles.items, articlesOk: articles.ok }
}
