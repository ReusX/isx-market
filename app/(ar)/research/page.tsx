import { listArticles, stripHtml, articlePath } from '@/lib/articles'
import { readingMinutes } from '@/lib/learn'
import { ResearchPage } from '@/components/site/ResearchPage'

export const revalidate = 3600

// Title/description live in ./layout.tsx · see the note in app/news/page.tsx.

export default async function Page() {
  const posts = listArticles('research').slice(0, 18).map((a) => ({
    slug: a.slug, href: articlePath('research', a.slug), title: a.title, summary: stripHtml(a.excerpt), minutes: readingMinutes(stripHtml(a.html)), updated: a.modified,
  }))
  return <ResearchPage posts={posts} />
}
