import { getPosts } from '@/lib/cms'
import SectionPage from '@/components/cms/SectionPage'

export const revalidate = 300

export const metadata = {
  title: 'تعلّم الاستثمار | ISX Market',
  description: 'دليلك الشامل للاستثمار في بورصة العراق — من المبتدئ إلى المحترف',
}

export default async function LearnPage() {
  const { posts } = await getPosts('learn', { perPage: 18 })
  return <SectionPage section="learn" posts={posts} />
}
