import { MarketPage } from '@/components/site/MarketPage'
import { loadMarketInitial } from '@/lib/marketServer'

export const revalidate = 60

export default async function Page() {
  return <MarketPage initial={await loadMarketInitial()} />
}
