import { getPosts, SECTIONS } from '@/lib/cms'
import SectionPage from '@/components/cms/SectionPage'

export const revalidate = 300

export const metadata = {
  title: 'أخبار بورصة العراق | ISX Market',
  description: 'آخر أخبار وتحديثات بورصة العراق للأوراق المالية',
}

export default async function NewsPage() {
  const { posts } = await getPosts('news', { perPage: 18 })
  return <SectionPage section="news" posts={posts} />
}
