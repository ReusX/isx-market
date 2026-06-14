import { fetchGold, fetchFx } from '@/lib/rates'
import GoldClient from './GoldClient'

// Re-scrape at most every 3h (lib sets the data-cache TTL); the page itself
// is statically regenerated on this interval.
export const revalidate = 10800

export default async function GoldPage() {
  const [gold, fx] = await Promise.all([fetchGold(), fetchFx()])
  return <GoldClient gold={gold} fx={fx} />
}
