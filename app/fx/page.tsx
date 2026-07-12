import { fetchFx } from '@/lib/rates'
import FxClient from './FxClient'

// Re-scrape at most every 3h (lib sets the data-cache TTL); the page itself
// is statically regenerated on this interval.
export const revalidate = 10800
// Serve from the static ISR cache so tab switches are instant; the scrape
// refreshes in the background on the interval. Without this, the no-cache
// headers from the sources force the route dynamic (~2.5s render every click).
export const dynamic = 'force-static'

export default async function FxPage() {
  const fx = await fetchFx()
  return <FxClient fx={fx} />
}
