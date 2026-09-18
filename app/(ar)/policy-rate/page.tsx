import type { Metadata } from 'next'
import { CURRENT_POLICY_RATE, POLICY_RATE_HISTORY, POLICY_RATE_SINCE } from '@/lib/macro'
import { PolicyRatePage } from '@/components/site/PolicyRatePage'
import { absUrl, seoAlternates } from '@/lib/seo'
import { messages } from '@/lib/i18n'
import { faqLd } from '@/lib/ratesFaq'
import { localeDate } from '@/lib/date'

/* Changes by decision, a few times a decade; a daily rebuild is plenty. */
export const revalidate = 86400

const P = messages('ar').rates.page.policyRate
const rate = String(CURRENT_POLICY_RATE)
const since = localeDate(POLICY_RATE_SINCE, 'ar')

export const metadata: Metadata = {
  title: { absolute: P.seoTitle(rate) },
  description: P.description(rate, since),
  alternates: seoAlternates('/policy-rate'),
  keywords: ['سعر الفائدة في العراق', 'فائدة البنك المركزي العراقي', 'سعر الفائدة البنك المركزي العراقي 2026', 'نسبة الفائدة في العراق', 'سعر السياسة النقدية العراق', 'Iraq interest rate'],
  openGraph: { url: absUrl('/policy-rate'), title: P.seoTitle(rate), images: [{ url: '/opengraph-image', width: 1200, height: 630 }] },
}

export default function Page() {
  const prev = POLICY_RATE_HISTORY[1]
  const faq = P.faq({ rate, since, prev: String(prev.rate), prevDate: prev.date, cd14: '4', cd182: '5.5' })
  const ld = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'WebPage', '@id': absUrl('/policy-rate'), url: absUrl('/policy-rate'), name: P.title, inLanguage: 'ar-IQ', dateModified: POLICY_RATE_SINCE },
    faqLd(faq),
  ] }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <PolicyRatePage rate={CURRENT_POLICY_RATE} since={POLICY_RATE_SINCE} history={POLICY_RATE_HISTORY} />
    </>
  )
}
