import type { Metadata } from 'next'
import { fetchSilver, fetchFx } from '@/lib/rates'
import { SilverPage } from '@/components/site/SilverPage'
import { absUrl, seoAlternates } from '@/lib/seo'
import { messages } from '@/lib/i18n'

/* Re-read the source every 3h; served from the static cache in between,
   like /gold. `force-static`: the source's no-cache headers would otherwise
   flip the route dynamic. */
export const revalidate = 10800
export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: { absolute: 'سعر الفضة اليوم في العراق · الغرام والأونصة بالدينار والدولار' },
  description: 'سعر الفضة اليوم في العراق: سعر غرام الفضة 999 و925 والأونصة بالدولار وما يعادلها بالدينار العراقي، وأسعار سبائك الفضة، مع حاسبة لأي وزن.',
  alternates: seoAlternates('/silver'),
  keywords: ['سعر الفضة اليوم', 'سعر الفضة في العراق', 'سعر غرام الفضة', 'سعر اونصة الفضة', 'اسعار الفضة اليوم في العراق', 'سعر الفضة بالدينار العراقي', 'silver price iraq'],
  openGraph: {
    url: absUrl('/silver'),
    title: 'سعر الفضة اليوم في العراق · الغرام والأونصة',
    description: 'سعر الفضة في العراق بالدولار والدينار: الغرام حسب النقاوة، الأونصة، والسبائك.',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
}

export default async function Page() {
  const [silver, fx] = await Promise.all([fetchSilver(), fetchFx()])
  const faq = messages('ar').rates.page.silver.faq
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebPage', '@id': absUrl('/silver'), url: absUrl('/silver'), name: 'سعر الفضة اليوم في العراق', inLanguage: ['ar-IQ', 'en'], ...(silver?.date ? { dateModified: silver.date } : {}) },
      { '@type': 'FAQPage', mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
    ],
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <SilverPage silver={silver} fx={fx} />
    </>
  )
}
