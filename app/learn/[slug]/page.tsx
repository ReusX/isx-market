import { getPost, stripHtml } from '@/lib/cms'
import ArticlePage from '@/components/cms/ArticlePage'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

export const revalidate = 300

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await getPost(params.slug)
  if (!post) return { title: 'Not found' }
  return {
    title: `${stripHtml(post.title.rendered)} | ISX Market`,
    description: stripHtml(post.excerpt.rendered).slice(0, 160),
    alternates: { canonical: `https://iraqsm.com/learn/${params.slug}` },
  }
}

export default async function LearnArticle({ params }: { params: { slug: string } }) {
  const post = await getPost(params.slug)
  if (!post) notFound()
  return <ArticlePage post={post} section="learn" backHref="/learn" />
}
