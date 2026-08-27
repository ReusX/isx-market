import type { Metadata } from 'next'
import { seoAlternates } from '@/lib/seo'
import { Watchlist } from '@/components/routes/Watchlist'

export const metadata: Metadata = {
  title: 'قائمة المتابعة · أسهمك المتابَعة في بورصة العراق',
  description: 'تابع أسعار الشركات التي اخترتها في بورصة العراق وتغيّرها وقيمتها السوقية في مكان واحد.',
  robots: { index: false, follow: false },
  alternates: seoAlternates('/watchlist'),
}

export default function Page() {
  return <Watchlist />
}
