import { messages } from '@/lib/i18n'
import { goldFaqFigures, faqLd } from '@/lib/ratesFaq'
import { fetchGold, fetchFx } from '@/lib/rates'
import { GoldPage } from '@/components/site/GoldPage'
import type { Metadata } from 'next'
import { absUrl, seoAlternates } from '@/lib/seo'

// Re-scrape at most every 3h (lib sets the data-cache TTL); the page itself
// is statically regenerated on this interval.
export const revalidate = 10800
// Serve from the static ISR cache so tab switches are instant; the scrape
// refreshes in the background on the interval. Without this, the no-cache
// headers from the sources force the route dynamic (~2.5s render every click).
export const dynamic = 'force-static'

export const metadata: Metadata = {
  /* The year is in the title on purpose: «سعر مثقال الذهب اليوم في العراق 2026» is a
     query in its own right (Trends, Sep 2026, +300%). Bump it each January. */
  title: { absolute: 'سعر الذهب اليوم في العراق 2026 · مثقال وغرام عيار 21 و24' },
  description: 'سعر مثقال الذهب اليوم في العراق 2026 بالدينار العراقي: المثقال والغرام لعيار 24 و21 و18، وسعر اونصة الذهب عالمياً، مع حاسبة تحوّل أي وزن إلى قيمته الحالية.',
  alternates: seoAlternates('/gold'),
  keywords: [
    'gold price in iraq', 'iraq gold price today', 'gold price iraq 2026',
    'gold price in iraqi dinar', 'iraq gold rate today',
    /* «سعر الذهب مباشر» dropped: the page prints a daily scrape, and the
       matching claim was already removed from this route's title and OG
       description. «اليوم» stays — gold IS refreshed daily. */
    'سعر الذهب اليوم', 'سعر الذهب اليوم في العراق',
    'اسعار الذهب عالميا', 'اسعار الذهب اليوم في العراق', 'سعر مثقال الذهب عيار 21',
    'سعر غرام الذهب في العراق', 'اسعار الذهب العراق اليوم',
    'سعر الذهب بالدينار العراقي', 'سعر مثقال الذهب اليوم في العراق 2026', 'اونصة الذهب', 'سعر اونصة الذهب',
  ],
  openGraph: {
    url: absUrl('/gold'),
    /* ⚠ «مباشر» removed from the OG TITLE. It stays in `keywords`, where it is a
       search term people type, not a claim the card makes — the source
       publishes one daily price list and this product re-reads it every three
       hours, which is not a live feed. */
    title: 'سعر الذهب اليوم في العراق 2026 · مثقال وغرام عيار 21 و24',
    description: 'سعر الذهب اليوم في العراق لكل غرام ومثقال بالدينار العراقي والدولار، مع السعر العالمي للأونصة. Iraq gold price per gram and mithqal.',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
}

const pageSchema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': absUrl('/gold'),
      url: absUrl('/gold'),
      name: 'Gold Price in Iraq Today · Iraq Gold Rate in Iraqi Dinar',
      description: 'Gold price in Iraq in IQD and USD · per gram and mithqal for 24K, 21K and 18K gold.',
      inLanguage: ['ar-IQ', 'en'],
      about: {
        '@type': 'Thing',
        name: 'Gold Price in Iraq',
        sameAs: 'https://en.wikipedia.org/wiki/Gold_as_an_investment',
      },
      breadcrumb: {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'IQWealth', item: absUrl('/') },
          { '@type': 'ListItem', position: 2, name: 'Gold Price in Iraq', item: absUrl('/gold') },
        ],
      },
    },
  ],
}

export default async function Page() {
  const [gold, fx] = await Promise.all([fetchGold(), fetchFx()])
  /* The visible FAQ and this markup are the same call on the same data. */
  const faq = messages('ar').rates.page.gold.faq(goldFaqFigures(gold, 'ar'))
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', ...faqLd(faq) }) }} />
      <GoldPage gold={gold} fx={fx} />
    </>
  )
}
