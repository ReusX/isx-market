import type { Metadata } from 'next'
import { fetchCurrencies, fetchFx } from '@/lib/rates'
import { CurrenciesPage } from '@/components/site/CurrenciesPage'
import { absUrl, seoAlternates } from '@/lib/seo'
import { messages } from '@/lib/i18n'
import { currenciesFaqFigures, faqLd } from '@/lib/ratesFaq'

/* Cross rates change once a day at the source; the dollar every few hours.
   Regenerated every 3h from the static cache, like the other rate pages. */
export const revalidate = 10800
export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: { absolute: 'اسعار العملات اليوم في العراق · اليورو والليرة التركية والدرهم بالدينار' },
  description: 'أسعار العملات اليوم في العراق مقابل الدينار العراقي: اليورو، الجنيه الإسترليني، الليرة التركية، الدرهم الإماراتي، الريال السعودي، الدينار الكويتي والأردني وأكثر من عشرين عملة، بسعر السوق الموازية والسعر الرسمي، مع محوّل عملات.',
  alternates: seoAlternates('/currencies'),
  keywords: ['اسعار العملات اليوم في العراق', 'سعر اليورو اليوم في العراق', 'سعر الليرة التركية بالدينار العراقي', 'سعر الدرهم الاماراتي بالدينار العراقي', 'سعر الريال السعودي بالدينار العراقي', 'سعر الدينار الكويتي بالدينار العراقي', 'اسعار صرف العملات في العراق'],
  openGraph: {
    url: absUrl('/currencies'),
    title: 'اسعار العملات اليوم في العراق · بالدينار العراقي',
    description: 'اليورو والليرة التركية والدرهم والريال وأكثر من عشرين عملة مقابل الدينار العراقي، بسعر السوق والسعر الرسمي.',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
}

export default async function Page() {
  const [cur, fx] = await Promise.all([fetchCurrencies(), fetchFx()])
  const faq = messages('ar').rates.page.currencies.faq(currenciesFaqFigures(cur, fx, 'ar'))
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebPage', '@id': absUrl('/currencies'), url: absUrl('/currencies'), name: 'اسعار العملات اليوم في العراق', inLanguage: ['ar-IQ', 'en'], ...(cur?.updatedAt ? { dateModified: cur.updatedAt } : {}) },
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
