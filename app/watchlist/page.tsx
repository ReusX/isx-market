import type { Metadata } from 'next'
import WatchlistClient from './WatchlistClient'

export const metadata: Metadata = {
  title: 'قوائم المتابعة | بورصة العراق',
  description: 'تابع أسهمك المفضلة في بورصة العراق · الأسعار والتغيرات اليومية في مكان واحد.',
  alternates: { canonical: 'https://iraqsm.com/watchlist' },
}

export default function Page() {
  return <WatchlistClient />
}
