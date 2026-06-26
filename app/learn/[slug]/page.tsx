import { getPost, stripHtml } from '@/lib/cms'
import ArticlePage from '@/components/cms/ArticlePage'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

function buildDesc(raw: string): string {
  const clean = raw.trim().slice(0, 140)
  if (clean.length >= 100) return clean
  return clean + ' · تعلّم الاستثمار في بورصة العراق على ISX Market.'
}

export const revalidate = 300

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await getPost(params.slug)
  if (!post) return { title: 'Not found' }
  return {
    title: `${stripHtml(post.title.rendered)} | ISX Market`,
    description: buildDesc(stripHtml(post.excerpt?.rendered ?? '')),
    alternates: { canonical: `https://iraqsm.com/learn/${params.slug}` },
    openGraph: { url: `https://iraqsm.com/learn/${params.slug}`, images: [{ url: '/opengraph-image', width: 1200, height: 630 }] },
  }
}

export default async function LearnArticle({ params }: { params: { slug: string } }) {
  const post = await getPost(params.slug)
  if (!post) notFound()
  return <ArticlePage post={post} section="learn" backHref="/learn" />
}
