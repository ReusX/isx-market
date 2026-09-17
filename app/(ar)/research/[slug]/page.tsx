import { getPost, stripHtml } from '@/lib/cms'
import { ArticlePage } from '@/components/site/ArticlePage'
import { loadArticle } from '@/lib/articleLoad'
import { plainText } from '@/lib/article'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { absUrl, seoAlternates } from '@/lib/seo'

function buildDesc(raw: string): string {
  const clean = raw.trim().slice(0, 140)
  if (clean.length >= 100) return clean
  return clean + ' · تحليلات ومقالات بورصة العراق ·'
}

export const revalidate = 300

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await getPost(params.slug)
  if (!post) return { title: 'Not found' }
  return {
    title: `${stripHtml(post.title.rendered)}`,
    description: buildDesc(stripHtml(post.excerpt?.rendered ?? '')),
    alternates: seoAlternates(`/research/${params.slug}`),
    openGraph: { url: absUrl(`/research/${params.slug}`), images: [{ url: '/opengraph-image', width: 1200, height: 630 }] },
  }
}

export default async function ResearchArticle({ params }: { params: { slug: string } }) {
  const article = await loadArticle('research', params.slug, '/research')
  if (!article) notFound()
  return (
    <ArticlePage
      eyebrow="تحليلات"
      backHref="/research"
      backLabel="الأبحاث والتحليلات"
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
      relatedLabel="تحليلات ذات صلة"
    />
  )
}
