import { getPosts } from '@/lib/cms'
import SectionPage from '@/components/cms/SectionPage'

export const revalidate = 300

export const metadata = {
  title: 'أبحاث وتحليلات | ISX Market',
  description: 'تقارير وتحليلات متعمقة لسوق الأسهم العراقي',
}

export default async function ResearchPage() {
  const { posts } = await getPosts('research', { perPage: 18 })
  return <SectionPage section="research" posts={posts} />
}
