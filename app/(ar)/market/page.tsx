import { MarketPage } from '@/components/site/MarketPage'

/**
 * /market · the full board — every listed company, every column. Its title
 * («اسعار الاسهم العراقية · جميع شركات بورصة العراق») is the site's #1
 * result for the prices query; the root is the market OVERVIEW and links
 * here for the complete table. Two pages, two intents, on purpose.
 */
export default function Page() {
  return <MarketPage variant="full" />
}
