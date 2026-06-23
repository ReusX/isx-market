import HomeClient from './HomeClient'
import { getPosts, stripHtml } from '@/lib/cms'

export const revalidate = 60

export default async function HomePage() {
  let news: { slug: string; title: string; date: string }[] = []
  try {
    const { posts } = await getPosts('news', { perPage: 5 })
    news = (posts ?? []).map(p => ({ slug: p.slug, title: stripHtml(p.title.rendered), date: p.date }))
  } catch { /* news is best-effort */ }
  return <HomeClient news={news} />
}
