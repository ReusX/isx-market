import { getPost, SECTIONS, stripHtml } from '@/lib/cms'
import ArticlePage from '@/components/cms/ArticlePage'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

function buildDesc(raw: string, section: string): string {
  const clean = raw.trim().slice(0, 140)
  if (clean.length >= 100) return clean
  const suffix: Record<string, string> = {
    news:     ' — أخبار بورصة العراق للأوراق المالية على ISX Market.',
    research: ' — تحليلات ومقالات بورصة العراق على ISX Market.',
    learn:    ' — تعلّم الاستثمار في بورصة العراق على ISX Market.',
  }
  return clean + (suffix[section] ?? ' — بورصة العراق | ISX Market.')
}

export const revalidate = 300

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await getPost(params.slug)
  if (!post) return { title: 'Not found' }
  return {
    title: `${stripHtml(post.title.rendered)} | ISX Market`,
    description: buildDesc(stripHtml(post.excerpt?.rendered ?? ''), 'news'),
    alternates: { canonical: `https://iraqsm.com/news/${params.slug}` },
    openGraph: { url: `https://iraqsm.com/news/${params.slug}`, images: [{ url: '/opengraph-image', width: 1200, height: 630 }] },
  }
}

export default async function NewsArticle({ params }: { params: { slug: string } }) {
  const post = await getPost(params.slug)
  if (!post) notFound()
  return <ArticlePage post={post} section="news" backHref="/news" />
}
