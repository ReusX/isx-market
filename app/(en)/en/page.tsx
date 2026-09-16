import { MarketPage } from '@/components/site/MarketPage'
import { loadMarketInitial } from '@/lib/marketServer'

export const revalidate = 900   // see the Arabic root for why; the two must agree

export default async function Page() {
  return <MarketPage initial={await loadMarketInitial()} />
}
