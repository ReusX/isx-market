import type { Metadata } from 'next'
import { absUrl, seoAlternates } from '@/lib/seo'
import { ShareholdersPage } from '@/components/routes/ShareholdersPage'

export const metadata: Metadata = {
  alternates: seoAlternates('/statistics/shareholders', 'en'),
  openGraph: {
    url: absUrl('/statistics/shareholders', 'en'),
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
    locale: 'en_US',
    alternateLocale: 'ar_IQ',
  },
  title: 'Major Shareholders | IQWealth',
  description:
    'The largest disclosed stakes in companies listed on the Iraq Stock Exchange, with each shareholder\'s ownership percentage, from the latest available monthly depository filing.',
}

export default function Page() {
  return <ShareholdersPage />
}
