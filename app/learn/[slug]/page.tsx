import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getPost, stripHtml } from '@/lib/cms'
import { plainText } from '@/lib/article'
import { loadArticle } from '@/lib/articleLoad'
import { ArticleView } from '@/components/article/ArticleView'
import { absUrl, seoAlternates } from '@/lib/seo'

/**
 * /learn/[slug] — the same approved long-form template as /news/[slug].
 *
 * WordPress category 4 currently holds zero posts, so this route resolves to
 * `notFound()` for every slug today. That is correct and is not papered over:
 * the library is empty by product decision, and an article page that invented
 * a lesson to have something to render would be the failure mode §20 names.
 */
function buildDesc(raw: string): string {
  const clean = raw.trim().slice(0, 140)
  if (clean.length >= 100) return clean
  return clean + ' · تعلّم الاستثمار في بورصة العراق ·'
}

export const revalidate = 300

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await getPost(params.slug)
  if (!post) return { title: 'Not found', robots: { index: false, follow: false } }
  return {
    title: `${stripHtml(post.title.rendered)}`,
    description: buildDesc(stripHtml(post.excerpt?.rendered ?? '')),
    alternates: seoAlternates(`/learn/${params.slug}`),
    openGraph: {
      url: absUrl(`/learn/${params.slug}`),
      type: 'article',
      publishedTime: post.date || undefined,
      modifiedTime: post.modified || undefined,
      images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
    },
  }
}

export default async function LearnArticle({ params }: { params: { slug: string } }) {
  const article = await loadArticle('learn', params.slug, '/learn')
  if (!article) notFound()

  return (
    <ArticleView
      eyebrow="تعلّم"
      backHref="/learn"
      backLabel="تعلّم"
      title={article.title}
      standfirst={article.standfirst}
      author={article.author}
      dateLabel={article.dateLabel}
      dateTime={article.dateTime}
      image={article.image}
      imageAlt={plainText(article.title)}
      bodyHtml={article.bodyHtml}
      headings={article.headings}
      related={article.related}
      prev={article.prev}
      next={article.next}
      relatedLabel="مقالات ذات صلة"
    />
  )
}
