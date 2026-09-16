import { MarketPage } from '@/components/site/MarketPage'
import { loadMarketInitial } from '@/lib/marketServer'

// Title/description are the ROOT layout's defaults — the homepage is the one
// route whose metadata belongs there. The surface is shared with `/en`.
export const revalidate = 60

export default async function Page() {
  return <MarketPage initial={await loadMarketInitial()} />
}
