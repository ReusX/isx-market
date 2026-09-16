import { NewsPage } from '@/components/site/NewsPage'
import { loadNews } from '@/lib/newsServer'

export const revalidate = 300

export default async function Page() {
  return <NewsPage initial={await loadNews('en')} />
}
