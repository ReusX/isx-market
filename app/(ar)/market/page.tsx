import { MarketPage } from '@/components/site/MarketPage'
import { loadMarketInitial } from '@/lib/marketServer'


/**
 * /market · the full board — every listed company, every column. Its title
 * («اسعار الاسهم العراقية · جميع شركات بورصة العراق») is the site's #1
 * result for the prices query; the root is the market OVERVIEW and links
 * here for the complete table. Two pages, two intents, on purpose.
 */
/* `?date=YYYY-MM-DD` shows that session's board; without it, the latest. */
export default async function Page({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { date } = await searchParams
  return <MarketPage variant="full" initial={await loadMarketInitial(date)} />
}
