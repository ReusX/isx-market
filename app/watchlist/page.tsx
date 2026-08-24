import type { Metadata } from 'next'
import WatchlistClient from './WatchlistClient'

export const metadata: Metadata = {
  title: 'قائمة المتابعة · أسهمك المتابَعة في بورصة العراق',
  description: 'تابع أسعار الشركات التي اخترتها في بورصة العراق وتغيّرها وقيمتها السوقية في مكان واحد.',
  // A personal workspace is not a landing page.
  robots: { index: false, follow: false },
}

export default function WatchlistPage() {
  return <WatchlistClient />
}
