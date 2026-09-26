import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getArticle, listArticles, stripHtml, articlePath } from '@/lib/articles'
import { plainText } from '@/lib/article'
import { loadArticle } from '@/lib/articleLoad'
import { ArticlePage } from '@/components/site/ArticlePage'
import { absUrl, seoAlternates } from '@/lib/seo'
import { BankRankingBlock } from '@/components/site/BankRankingBlock'
import { DeadlineBlock } from '@/components/site/DeadlineBlock'
import { articleJsonLd } from '@/lib/articleSeo'

/* The canonical is built with articlePath — lowercase percent-encoding, the form
   the sitemap, every internal link and the original WordPress URLs use. Next
   hands `params.slug` over decoded and would re-encode it in UPPERCASE, so the
   page used to canonicalise to a URL the sitemap never lists. */
function canonicalPath(section: 'news' | 'research' | 'learn', slug: string) {
  let s = slug
  try { s = decodeURIComponent(slug) } catch { /* already decoded */ }
  return articlePath(section, s)
}

/**
 * /news/[slug] — the article detail, in the approved long-form chrome.
 *
 * This route closes the seam the News index opened: the index was transplanted
 * in Batch A while its articles still rendered `components/cms/ArticlePage`,
 * the pre-redesign template. The design app's own `news/[slug]` is a stale
 * `terminal-shell` file and was not ported; the approved surface of this shape
 * is the Learn article template, and `ArticleView` is that template.
 *
 * Everything editorial is preserved: the WordPress body is rendered as it
 * arrives, with its own headings, links, images and tables, and the title,
 * excerpt, author, publication date, featured image, canonical slug and
 * structured metadata are unchanged from the previous template.
 */
function buildDesc(raw: string): string {
  const clean = raw.trim().slice(0, 140)
  if (clean.length >= 100) return clean
  return clean + ' · أخبار بورصة العراق للأوراق المالية ·'
}

export const revalidate = 3600

export function generateStaticParams() {
  return listArticles('news').map((a) => ({ slug: a.slug }))
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = getArticle(params.slug, 'news')
  if (!post) return { title: 'Not found', robots: { index: false, follow: false } }
  return {
    title: stripHtml(post.title),
    description: buildDesc(stripHtml(post.excerpt)),
    alternates: seoAlternates(canonicalPath('news', params.slug)),
    openGraph: {
      url: absUrl(canonicalPath('news', params.slug)),
      type: 'article',
      publishedTime: post.date || undefined,
      modifiedTime: post.modified || undefined,
      images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
    },
  }
}

export default async function NewsArticle({ params }: { params: { slug: string } }) {
  const article = await loadArticle('news', params.slug)
  const post = getArticle(params.slug, 'news')
  if (!article || !post) notFound()

  return (
    <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd(post, article.bodyHtml)) }} />
    <ArticlePage
      eyebrow="أخبار السوق"
      backHref="/news"
      backLabel="الأخبار"
      title={article.title}
      standfirst={article.standfirst}
      author={article.author}
      dateLabel={article.dateLabel}
      dateTime={article.dateTime}
      image={article.image}
      imageAlt={plainText(article.title)}
      bodyHtml={article.bodyHtml}
      blocks={{ 'bank-ranking': <BankRankingBlock />, 'pension-deadline': <DeadlineBlock /> }}
      layout={article.layout}
      headings={article.headings}
      related={article.related}
      prev={article.prev}
      next={article.next}
      relatedLabel="المزيد من الأخبار"
    />
    </>
  )
}
