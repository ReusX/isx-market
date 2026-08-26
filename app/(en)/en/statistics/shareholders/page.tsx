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
  title: 'Major shareholders · Iraq Stock Exchange listed companies',
  description:
    'The largest disclosed stakes in companies listed on the Iraq Stock Exchange, with nationality, percentage and the change on the previous month.',
}

export default function Page() {
  return <ShareholdersPage />
}
