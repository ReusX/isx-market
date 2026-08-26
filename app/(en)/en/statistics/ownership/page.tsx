import type { Metadata } from 'next'
import { absUrl, seoAlternates } from '@/lib/seo'
import { OwnershipPage } from '@/components/routes/OwnershipPage'

export const metadata: Metadata = {
  alternates: seoAlternates('/statistics/ownership', 'en'),
  openGraph: {
    url: absUrl('/statistics/ownership', 'en'),
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
    locale: 'en_US',
    alternateLocale: 'ar_IQ',
  },
  title: 'Company Ownership | IQWealth',
  description:
    'The foreign share of deposited capital in companies listed on the Iraq Stock Exchange, from the latest available monthly depository filing.',
}

export default function Page() {
  return <OwnershipPage />
}
