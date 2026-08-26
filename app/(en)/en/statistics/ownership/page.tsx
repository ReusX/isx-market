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
  title: 'Ownership structure · Iraqi against foreign · Iraq Stock Exchange',
  description:
    'How deposited capital is split between Iraqi and foreign investors, for each company listed on the Iraq Stock Exchange — from the monthly depository report.',
}

export default function Page() {
  return <OwnershipPage />
}
