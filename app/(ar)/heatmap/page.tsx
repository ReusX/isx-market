import { HeatmapPage } from '@/components/site/HeatmapPage'
import { loadScreener } from '@/lib/marketServer'

export const revalidate = 1800

/** /heatmap · the market in one picture; rows from the same view as the screener. */
export default async function Page() {
  return <HeatmapPage initial={await loadScreener()} />
}
