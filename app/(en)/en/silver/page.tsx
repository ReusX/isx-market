import type { Metadata } from 'next'
import { fetchSilver, fetchFx } from '@/lib/rates'
import { SilverPage } from '@/components/site/SilverPage'
import { absUrl, seoAlternates } from '@/lib/seo'
import { messages } from '@/lib/i18n'
import { silverFaqFigures, faqLd } from '@/lib/ratesFaq'

/** `/en/silver` — see the Arabic route. */
export const revalidate = 10800
export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: { absolute: 'Silver price in Iraq today · gram and ounce in dinars and dollars' },
  description: 'Silver price in Iraq: the 999 and 925 gram and the ounce in dollars with their Iraqi dinar equivalent, silver bar prices, and a calculator for any weight.',
  alternates: seoAlternates('/silver', 'en'),
  openGraph: {
    url: absUrl('/silver', 'en'),
    title: 'Silver price in Iraq today',
    description: 'Silver in Iraq in dollars and dinars: the gram by purity, the ounce, and bars.',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
    locale: 'en_US', alternateLocale: 'ar_IQ',
  },
}

export default async function Page() {
  const [silver, fx] = await Promise.all([fetchSilver(), fetchFx()])
  const faq = messages('en').rates.page.silver.faq(silverFaqFigures(silver, fx, 'en'))
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebPage', '@id': absUrl('/silver', 'en'), url: absUrl('/silver', 'en'), name: 'Silver price in Iraq today', inLanguage: 'en', ...(silver?.date ? { dateModified: silver.date } : {}) },
      faqLd(faq),
    ],
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <SilverPage silver={silver} fx={fx} />
    </>
  )
}
