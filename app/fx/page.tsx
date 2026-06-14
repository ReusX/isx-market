import { fetchFx } from '@/lib/rates'
import FxClient from './FxClient'

// Re-scrape at most every 3h (lib sets the data-cache TTL); the page itself
// is statically regenerated on this interval.
export const revalidate = 10800

export default async function FxPage() {
  const fx = await fetchFx()
  return <FxClient fx={fx} />
}
