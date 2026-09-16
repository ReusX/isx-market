import type { Metadata } from 'next'
import { absUrl, seoAlternates } from '@/lib/seo'
import { ShareholdersPage } from '@/components/site/ShareholdersPage'
import { loadShareholders } from '@/lib/marketServer'

export const revalidate = 3600

export const metadata: Metadata = {
  alternates: seoAlternates('/statistics/shareholders', 'en'),
  openGraph: {
    url: absUrl('/statistics/shareholders', 'en'),
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
    locale: 'en_US',
    alternateLocale: 'ar_IQ',
  },
  title: 'Major shareholders on the Iraq Stock Exchange · the largest disclosed stakes',
  description:
    'Who holds the largest stakes in Iraq Stock Exchange companies, with each shareholder’s name and share of capital, from the latest monthly depository filing.',
}

/** /statistics/shareholders · the largest disclosed stakes. */
export default async function Page() {
  return <ShareholdersPage initial={await loadShareholders('en')} />
}
