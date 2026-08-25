import { fetchGold, fetchFx } from '@/lib/rates'
import GoldClient from './GoldClient'

// Re-scrape at most every 3h (lib sets the data-cache TTL); the page itself
// is statically regenerated on this interval.
export const revalidate = 10800
// Serve from the static ISR cache so tab switches are instant; the scrape
// refreshes in the background on the interval. Without this, the no-cache
// headers from the sources force the route dynamic (~2.5s render every click).
export const dynamic = 'force-static'

export default async function GoldPage() {
  const [gold, fx] = await Promise.all([fetchGold(), fetchFx()])
  return <GoldClient gold={gold} fx={fx} />
}
