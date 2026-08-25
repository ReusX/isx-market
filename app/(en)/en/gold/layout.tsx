import type { Metadata } from 'next'
import { absUrl, seoAlternates } from '@/lib/seo'

/**
 * `/en/gold`.
 *
 * ⚠ No "live". The source publishes one daily local price list and this
 * product re-reads it every three hours. The page says «Published local
 * price» on its face and the metadata does not contradict it.
 */
export const metadata: Metadata = {
  title: { absolute: 'Gold price in Iraq · mithqal and gram, 21K and 24K' },
  description:
    'The gold price in Iraq in Iraqi dinars: mithqal and gram prices for 24K, 21K and 18K, with the world ounce price and a calculator that turns any weight into its current value.',
  alternates: seoAlternates('/gold', 'en'),
  keywords: [
    'gold price in iraq', 'iraq gold price', 'gold price in iraqi dinar',
    'iraq gold rate', 'mithqal gold price', 'gold price baghdad', '21K gold price iraq',
  ],
  openGraph: {
    url: absUrl('/gold', 'en'),
    title: 'Gold price in Iraq · IQWealth',
    description: 'Mithqal and gram gold prices in Iraqi dinars, by karat, with a weight calculator.',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
    locale: 'en_US',
    alternateLocale: 'ar_IQ',
  },
}

export default function EnGoldLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
