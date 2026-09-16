import { MarketPage } from '@/components/site/MarketPage'
import { loadMarketInitial } from '@/lib/marketServer'

// Title/description are the ROOT layout's defaults — the homepage is the one
// route whose metadata belongs there. The surface is shared with `/en`.
// ⚠ 900s, not 60s. ISX publishes ONCE per session, so a 60-second window
// meant up to 1,440 regenerations a day — each one running loadMarketInitial,
// the heaviest loader on the site (fetchLiveWith + 21 index rows + ~4,700
// daily_prices rows paged in five sequential round trips + 500 session dates)
// — to catch a figure that changes once. That was the largest single consumer
// of Vercel's Active CPU budget.
//
// This is NOT the guard against the 1-September frozen-chart bug. That bug was
// an unqualified fetch cached by Next's Data Cache INDEFINITELY; the guard is
// that a revalidate exists at all, which `check:charts` asserts and which the
// Supabase client in lib/marketServer.ts states for its own fetches. The
// length of the window was never what protected it.
//
// The real fix is on-demand revalidation from the ingest cron, so a new
// session appears the moment it lands rather than up to 15 minutes later.
// Until that is in, this window is the backstop.
export const revalidate = 900

export default async function Page() {
  return <MarketPage initial={await loadMarketInitial()} />
}
