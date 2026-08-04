import { getPosts } from '@/lib/cms'
import SectionPage from '@/components/cms/SectionPage'

export const revalidate = 300

// Title/description live in ./layout.tsx · see the note in app/news/page.tsx.

export default async function ResearchPage() {
  const { posts } = await getPosts('research', { perPage: 18 })
  return <SectionPage section="research" posts={posts} />
}
