import { NewsPage } from '@/components/site/NewsPage'
import { loadNews } from '@/lib/newsServer'

// Title/description live in ./layout.tsx · a page-level `metadata` export wins
// over the layout's, so duplicating them here would quietly discard the
// canonical URL and OG tags the layout sets.
export const revalidate = 300

export default async function Page() {
  return <NewsPage initial={await loadNews('ar')} />
}
