import type { Metadata } from 'next'
import WatchlistClient from './WatchlistClient'

export const metadata: Metadata = {
  title: { absolute: 'قوائم المتابعة · أسهمك المختارة في بورصة العراق' },
  description: 'تابع أسهمك المفضلة في بورصة العراق · الأسعار والتغيرات اليومية في مكان واحد.',
  alternates: { canonical: 'https://iraqsm.com/watchlist' },
  // Personal tool · a signed-out crawler sees only an empty list. See the note
  // in app/portfolio/layout.tsx.
  robots: { index: false, follow: true },
}

export default function Page() {
  return <WatchlistClient />
}
