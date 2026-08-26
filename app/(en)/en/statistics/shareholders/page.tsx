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
  title: 'Major Shareholders in Listed Companies · Iraq Stock Exchange',
  description:
    'The largest disclosed stakes in companies listed on the Iraq Stock Exchange, with each shareholder\'s ownership percentage, from the monthly depository report.',
}

export default function Page() {
  return <ShareholdersPage />
}
