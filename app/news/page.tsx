import { getPosts, SECTIONS } from '@/lib/cms'
import SectionPage from '@/components/cms/SectionPage'

export const revalidate = 300

export const metadata = {
  title: 'أخبار بورصة العراق | ISX Market',
  description: 'آخر أخبار وتحديثات بورصة العراق للأوراق المالية',
}

export default async function NewsPage() {
  // Covers the full archive rather than the first page. This index is the only
  // crawlable path to /news/[slug]; capping it at 18 left the rest orphaned.
  // Past ~100 posts this needs pagination or a separate archive list.
  const { posts } = await getPosts('news', { perPage: 100 })
  return <SectionPage section="news" posts={posts} />
}
