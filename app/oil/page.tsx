import { fetchOil, fetchFx } from '@/lib/rates'
import OilClient from './OilClient'

// Re-scrape at most every 3h (lib sets the data-cache TTL); the page itself
// is statically regenerated on this interval.
export const revalidate = 10800

export default async function OilPage() {
  const [oil, fx] = await Promise.all([fetchOil(), fetchFx()])
  return <OilClient oil={oil} fx={fx} />
}
