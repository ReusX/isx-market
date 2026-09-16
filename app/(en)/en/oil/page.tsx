import { messages } from '@/lib/i18n'
import { oilFaqFigures, faqLd } from '@/lib/ratesFaq'
import { fetchOil, fetchFx } from '@/lib/rates'
import { OilPage } from '@/components/site/OilPage'

// Re-scrape at most every 3h (lib sets the data-cache TTL); the page itself
// is statically regenerated on this interval.
export const revalidate = 10800
// Serve from the static ISR cache so tab switches are instant; the scrape
// refreshes in the background on the interval. Without this, the no-cache
// headers from the sources force the route dynamic (~2.5s render every click).
export const dynamic = 'force-static'

export default async function Page() {
  const [oil, fx] = await Promise.all([fetchOil(), fetchFx()])
  /* The visible FAQ and this markup are the same call on the same data. */
  const faq = messages('en').rates.page.oil.faq(oilFaqFigures(oil, fx, 'en'))
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', ...faqLd(faq) }) }} />
      <OilPage oil={oil} fx={fx} />
    </>
  )
}
