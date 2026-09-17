import { getPosts } from '@/lib/cms'
import { ResearchPage } from '@/components/site/ResearchPage'

export const revalidate = 300

// Title/description live in ./layout.tsx · see the note in app/news/page.tsx.

export default async function Page() {
  const { posts } = await getPosts('research', { perPage: 18 })
  return <ResearchPage posts={posts} />
}
