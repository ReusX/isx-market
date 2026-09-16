import type { Metadata } from 'next'
import { absUrl, seoAlternates } from '@/lib/seo'
import { OwnershipPage } from '@/components/site/OwnershipPage'
import { loadOwnership } from '@/lib/marketServer'

export const revalidate = 3600

export const metadata: Metadata = {
  alternates: seoAlternates('/statistics/ownership', 'en'),
  openGraph: {
    url: absUrl('/statistics/ownership', 'en'),
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
    locale: 'en_US',
    alternateLocale: 'ar_IQ',
  },
  title: 'Ownership structure on the Iraq Stock Exchange · the foreign share',
  description:
    'How much of the deposited capital in Iraq Stock Exchange companies is held by foreign investors and how much by Iraqis, company by company, from the latest monthly depository filing.',
}

/** /statistics/ownership · the Iraqi/foreign split of deposited capital. */
export default async function Page() {
  return <OwnershipPage initial={await loadOwnership('en')} />
}
