import type { Metadata } from 'next'
import { seoAlternates } from '@/lib/seo'
import WatchlistClient from './WatchlistClient'

export const metadata: Metadata = {
  title: 'قائمة المتابعة · أسهمك المتابَعة في بورصة العراق',
  description: 'تابع أسعار الشركات التي اخترتها في بورصة العراق وتغيّرها وقيمتها السوقية في مكان واحد.',
  // A personal workspace is not a landing page.
  robots: { index: false, follow: false },
  /* Self-canonical, not the root's. Without this the page inherits
     `canonical: https://iraqsm.com` from the root layout and tells a
     crawler it is a duplicate of the homepage — a false statement, even
     on a noindex page. Matches /portfolio and /alerts, which already
     carry their own. */
  alternates: seoAlternates('/watchlist'),
}

export default function WatchlistPage() {
  return <WatchlistClient />
}
