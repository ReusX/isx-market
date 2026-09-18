import type { Metadata } from 'next'
import { INFLATION_LATEST, fetchInflationAnnual } from '@/lib/macro'
import { InflationPage } from '@/components/site/InflationPage'
import { absUrl, seoAlternates } from '@/lib/seo'
import { messages } from '@/lib/i18n'
import { faqLd } from '@/lib/ratesFaq'
import { localeDate } from '@/lib/date'

/* One CSO print a month; the annual series from the World Bank moves yearly. */
export const revalidate = 86400

const P = messages('ar').rates.page.inflation
const month = localeDate(`${INFLATION_LATEST.month}-01`, 'ar').replace(/^\d+\s/, '')

export async function generateMetadata(): Promise<Metadata> {
  const annual = await fetchInflationAnnual()
  const last = annual[annual.length - 1]
  return {
    title: { absolute: P.seoTitle(String(INFLATION_LATEST.yoy), month) },
    description: P.description(String(INFLATION_LATEST.yoy), month, last ? String(last.rate) : '—', last ? String(last.year) : '—'),
    alternates: seoAlternates('/inflation'),
    keywords: ['التضخم في العراق', 'معدل التضخم في العراق 2026', 'نسبة التضخم في العراق', 'الرقم القياسي لأسعار المستهلك العراق', 'Iraq inflation rate'],
    openGraph: { url: absUrl('/inflation'), title: P.seoTitle(String(INFLATION_LATEST.yoy), month), images: [{ url: '/opengraph-image', width: 1200, height: 630 }] },
  }
}

export default async function Page() {
  const annual = await fetchInflationAnnual()
  const last = annual[annual.length - 1]
  const peak = annual.reduce((a, b) => (b.rate > a.rate ? b : a), annual[0] ?? { year: 2006, rate: 53.2 })
  const faq = P.faq({ rate: String(INFLATION_LATEST.yoy), month, prev: String(INFLATION_LATEST.prevYoy), core: String(INFLATION_LATEST.core), food: String(INFLATION_LATEST.food), yearAvg: last ? String(last.rate) : '—', year: last ? String(last.year) : '—', peakYear: String(peak.year), peak: String(peak.rate) })
  const ld = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'WebPage', '@id': absUrl('/inflation'), url: absUrl('/inflation'), name: P.title, inLanguage: 'ar-IQ', dateModified: `${INFLATION_LATEST.month}-01` },
    faqLd(faq),
  ] }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <InflationPage latest={INFLATION_LATEST} annual={annual} />
    </>
  )
}
