import { NewsPage } from '@/components/routes/newsData'

// Title/description live in ./layout.tsx · a page-level `metadata` export wins
// over the layout's, so duplicating them here would quietly discard the
// canonical URL and OG tags the layout sets.
export const revalidate = 300

export default function Page() {
  return <NewsPage locale="ar" />
}
