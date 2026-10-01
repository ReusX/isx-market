import { MarketPage } from '@/components/site/MarketPage'
import { loadMarketInitial } from '@/lib/marketServer'
import { loadHomeWorlds } from '@/lib/homeWorlds'

export const revalidate = 3600   // see the Arabic root for why; the two must agree

export default async function Page() {
  const [initial, worlds] = await Promise.all([loadMarketInitial(), loadHomeWorlds()])
  return <MarketPage initial={initial} worlds={worlds} />
}
