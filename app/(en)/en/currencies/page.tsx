import type { Metadata } from 'next'
import { fetchCurrencies, fetchFx } from '@/lib/rates'
import { CurrenciesPage } from '@/components/site/CurrenciesPage'
import { absUrl, seoAlternates } from '@/lib/seo'
import { messages } from '@/lib/i18n'
import { currenciesFaqFigures, faqLd } from '@/lib/ratesFaq'

export const revalidate = 10800
export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: { absolute: 'Currency rates in Iraq today · euro, lira, dirham in Iraqi dinars' },
  description: 'Today\'s currency rates against the Iraqi dinar: euro, pound, Turkish lira, UAE dirham, Saudi riyal, Kuwaiti and Jordanian dinars and twenty more, at the parallel and official dollar rates, with a converter.',
  alternates: seoAlternates('/currencies', 'en'),
  keywords: ['currency rates iraq', 'euro to iraqi dinar', 'turkish lira to iraqi dinar', 'aed to iqd', 'sar to iqd', 'kwd to iqd', 'exchange rates iraq today'],
  openGraph: {
    url: absUrl('/currencies', 'en'),
    title: 'Currency rates in Iraq today · in Iraqi dinars',
    description: 'Euro, lira, dirham, riyal and twenty more currencies against the Iraqi dinar, at the market and official rates.',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
}

export default async function Page() {
  const [cur, fx] = await Promise.all([fetchCurrencies(), fetchFx()])
  const faq = messages('en').rates.page.currencies.faq(currenciesFaqFigures(cur, fx, 'en'))
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebPage', '@id': absUrl('/currencies', 'en'), url: absUrl('/currencies', 'en'), name: 'Currency rates in Iraq today', inLanguage: 'en', ...(cur?.updatedAt ? { dateModified: cur.updatedAt } : {}) },
      faqLd(faq),
    ],
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <CurrenciesPage cur={cur} fx={fx} />
    </>
  )
}
