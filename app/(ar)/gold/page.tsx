import { messages } from '@/lib/i18n'
import { goldFaqFigures, faqLd } from '@/lib/ratesFaq'
import { fetchGold, fetchFx } from '@/lib/rates'
import { GoldPage } from '@/components/site/GoldPage'

// Re-scrape at most every 3h (lib sets the data-cache TTL); the page itself
// is statically regenerated on this interval.
export const revalidate = 10800
// Serve from the static ISR cache so tab switches are instant; the scrape
// refreshes in the background on the interval. Without this, the no-cache
// headers from the sources force the route dynamic (~2.5s render every click).
export const dynamic = 'force-static'

export default async function Page() {
  const [gold, fx] = await Promise.all([fetchGold(), fetchFx()])
  /* The visible FAQ and this markup are the same call on the same data. */
  const faq = messages('ar').rates.page.gold.faq(goldFaqFigures(gold, 'ar'))
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', ...faqLd(faq) }) }} />
      <GoldPage gold={gold} fx={fx} />
    </>
  )
}
