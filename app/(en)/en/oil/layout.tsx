import type { Metadata } from 'next'
import { absUrl, seoAlternates } from '@/lib/seo'

/**
 * `/en/oil`.
 *
 * ⚠ Basrah Heavy and Basrah Medium are price ASSESSMENTS, not official
 * selling prices, and the page says so on its face. The description does not
 * upgrade them into official prices, and it makes no claim about Iraqi export
 * revenue — this product stores no export volumes and no budget assumption.
 */
export const metadata: Metadata = {
  title: { absolute: 'Oil price today · Brent, WTI and Basrah crude in dinars' },
  description:
    'Crude oil prices per barrel: Brent, WTI, Basrah Heavy and Basrah Medium, and the OPEC basket — in dollars and in Iraqi dinars, with each grade’s own observation time.',
  alternates: seoAlternates('/oil', 'en'),
  keywords: [
    'oil price today', 'oil price iraq', 'basrah crude price', 'basrah heavy oil price',
    'brent crude price', 'wti crude price', 'opec basket price', 'oil price per barrel',
  ],
  openGraph: {
    url: absUrl('/oil', 'en'),
    title: 'Oil prices · Brent, WTI and Basrah crude · IQWealth',
    description: 'Crude prices per barrel in dollars and Iraqi dinars, including Basrah Heavy and Basrah Medium.',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
    locale: 'en_US',
    alternateLocale: 'ar_IQ',
  },
}

export default function EnOilLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
