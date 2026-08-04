import { getPosts, SECTIONS } from '@/lib/cms'
import SectionPage from '@/components/cms/SectionPage'

export const revalidate = 300

// Title/description live in ./layout.tsx · a page-level `metadata` export wins
// over the layout's, so duplicating them here quietly discarded the canonical
// URL and OG tags the layout sets.

export default async function NewsPage() {
  // Covers the full archive rather than the first page. This index is the only
  // crawlable path to /news/[slug]; capping it at 18 left the rest orphaned.
  // Past ~100 posts this needs pagination or a separate archive list.
  const { posts } = await getPosts('news', { perPage: 100 })
  return <SectionPage section="news" posts={posts} />
}
