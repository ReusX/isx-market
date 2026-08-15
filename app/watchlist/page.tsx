import type { Metadata } from 'next'
import WatchlistClient from './WatchlistClient'
import { absUrl, seoAlternates } from '@/lib/seo'

export const metadata: Metadata = {
  title: { absolute: 'قوائم المتابعة · أسهمك المختارة في بورصة العراق' },
  description: 'تابع أسهمك المفضلة في بورصة العراق · الأسعار والتغيرات اليومية في مكان واحد.',
  alternates: seoAlternates('/watchlist'),
  // Not indexed, but a shared link still renders a card — and one pointing at
  // the homepage instead of the page being shared is simply wrong.
  openGraph: { url: absUrl('/watchlist'), images: [{ url: '/opengraph-image', width: 1200, height: 630 }] },
  // Personal tool · a signed-out crawler sees only an empty list. See the note
  // in app/portfolio/layout.tsx.
  robots: { index: false, follow: true },
}

export default function Page() {
  return <WatchlistClient />
}
