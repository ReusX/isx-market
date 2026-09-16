import { StatisticsPage } from '@/components/site/StatisticsPage'
import { loadStatistics } from '@/lib/marketServer'

export const revalidate = 900

/** /statistics · the hub: how much trades, where, who is buying, who owns it. */
export default async function Page() {
  return <StatisticsPage initial={await loadStatistics()} />
}
