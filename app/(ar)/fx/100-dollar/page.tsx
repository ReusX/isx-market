import type { Metadata } from 'next'
import { fetchFx } from '@/lib/rates'
import { HundredPage } from '@/components/site/HundredPage'
import { CBI_OFFICIAL_RATE } from '@/lib/fxOfficial'
import { absUrl, seoAlternates } from '@/lib/seo'
import { messages } from '@/lib/i18n'
import { faqLd } from '@/lib/ratesFaq'
import { localeDate } from '@/lib/date'

/** Same cadence as /fx: the parallel close is published once a day. */
export const revalidate = 10800
export const dynamic = 'force-static'

const nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

/** The formatted figures the title, the description and the FAQ all speak with. */
async function figures() {
  const fx = await fetchFx()
  const rate = fx?.sell ?? fx?.buy ?? null
  const hundred = rate != null ? rate * 100 : null
  return {
    fx,
    v: {
      hundred: hundred != null ? nf0.format(hundred) : '—',
      hundredOfficial: nf0.format(CBI_OFFICIAL_RATE * 100),
      rate: rate != null ? nf0.format(rate) : '—',
      official: nf0.format(CBI_OFFICIAL_RATE),
      gap: hundred != null ? nf0.format(hundred - CBI_OFFICIAL_RATE * 100) : '—',
      date: fx?.date ? localeDate(fx.date, 'ar') : '—',
    },
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const P = messages('ar').rates.page.hundred
  const { v } = await figures()
  const title = P.seoTitle(v.hundred)
  return {
    title: { absolute: title },
    description: P.description(v.hundred, v.hundredOfficial, v.date),
    alternates: seoAlternates('/fx/100-dollar'),
    keywords: [
      'كم سعر 100 دولار في العراق اليوم', 'سعر 100 دولار في العراق اليوم', '100$ كم بالعراقي',
      'كم سعر 100 الدولار اليوم في العراق', 'كم سعر الدولار اليوم في العراق 100 دولار',
      'سعر الورق اليوم في العراق', 'بيش الورق اليوم', 'سعر ورق اليوم',
      'الدولار مقابل الدينار العراقي', '100 dollars to iraqi dinar',
    ],
    openGraph: { url: absUrl('/fx/100-dollar'), title, description: P.description(v.hundred, v.hundredOfficial, v.date), images: [{ url: '/opengraph-image', width: 1200, height: 630 }] },
  }
}

export default async function Page() {
  const P = messages('ar').rates.page.hundred
  const { fx, v } = await figures()
  /* The visible FAQ and this markup are the same call on the same figures. */
  const faq = P.faq(v)
  const path = '/fx/100-dollar'
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': absUrl(path),
        url: absUrl(path),
        name: P.h1,
        inLanguage: 'ar-IQ',
        ...(fx?.date ? { dateModified: fx.date } : {}),
        breadcrumb: {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'IQWealth', item: absUrl('/') },
            { '@type': 'ListItem', position: 2, name: messages('ar').rates.page.fx.title, item: absUrl('/fx') },
            { '@type': 'ListItem', position: 3, name: P.h1, item: absUrl(path) },
          ],
        },
      },
      faqLd(faq),
    ],
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <HundredPage fx={fx} />
    </>
  )
}
