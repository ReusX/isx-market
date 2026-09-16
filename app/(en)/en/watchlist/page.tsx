import type { Metadata } from 'next'
import { seoAlternates } from '@/lib/seo'
import { WatchlistPage } from '@/components/site/WatchlistPage'

/** `/en/watchlist`. Usability mirror — noindex, no hreflang. */
export const metadata: Metadata = {
  title: 'Watchlist · the Iraq Stock Exchange shares you follow',
  description: 'Follow the prices, moves and market caps of the companies you have chosen on the Iraq Stock Exchange, in one place.',
  robots: { index: false, follow: false },
  alternates: seoAlternates('/watchlist', 'en'),
}

export default function Page() {
  return <WatchlistPage />
}
