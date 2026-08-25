import type { Metadata } from 'next'
import { describeFxRate, getFx } from '@/lib/fxCopy'
import FxClient from './FxClient'
import { absUrl, seoAlternates } from '@/lib/seo'

// Re-scrape at most every 3h (lib sets the data-cache TTL); the page itself
// is statically regenerated on this interval.
export const revalidate = 10800
// Serve from the static ISR cache so tab switches are instant; the scrape
// refreshes in the background on the interval. Without this, the no-cache
// headers from the sources force the route dynamic (~2.5s render every click).
export const dynamic = 'force-static'

/*
 * Metadata lives here rather than in ./layout.tsx because it carries the live
 * rate, which means it has to be built from the fetch. `fetchFx` is the same
 * call the page body makes and Next dedupes it, so this is free.
 *
 * The rate goes in the title and the description for the same reason it went
 * into the company pages: "كم سعر الدولار اليوم" is a question about a number,
 * and the result that already shows the number is the one that gets clicked.
 * Falls back to the rate-free wording if the scrape is down — a title
 * promising a price it cannot show is worse than a generic one.
 *
 * The trailing "عراقياً للدولار" is not padding. The previous title read
 * "… | الدولار مقابل الدينار العراقي USD/IQD", and shortening it dropped every
 * dinar→dollar token from the tag. The headline query "سعر الدولار اليوم في
 * العراق" still has to lead, so the reverse phrasing comes back as the unit on
 * the number, where it costs 15 characters instead of a second clause.
 */
export async function generateMetadata(): Promise<Metadata> {
  const fx = await getFx()
  const rate = fx?.sell ?? fx?.buy ?? null
  const line = describeFxRate(fx)

  return {
    title: {
      absolute: rate
        ? `سعر الدولار اليوم في العراق · ${rate.toLocaleString('en-US', { maximumFractionDigits: 0 })} ديناراً عراقياً للدولار`
        : 'سعر الدولار اليوم في العراق · الدولار مقابل الدينار العراقي',
    },
    description: line
      ? `سعر الدولار اليوم في العراق ${line}. تابع سعر الصرف المحدّث، الفرق بين السعرين، ومحوّل فوري لأي مبلغ.`
      : 'كم سعر الدولار اليوم في العراق؟ سعر صرف الدولار مقابل الدينار العراقي بسعر البنك المركزي وسعر السوق الموازية، مع محوّل فوري لأي مبلغ.',
    alternates: seoAlternates('/fx'),
    keywords: [
      'سعر الدولار اليوم في العراق', 'سعر الدولار في السوق الموازي',
      'سعر الدولار مقابل الدينار العراقي', 'الدولار مقابل الدينار العراقي',
      'سعر صرف الدولار في العراق اليوم', 'سعر الدولار في السوق الموازية اليوم',
      'سعر 100 دولار بالدينار العراقي', 'سعر صرف الدينار العراقي',
      'الدينار العراقي مقابل الدولار', 'سعر الدولار في بغداد اليوم',
      // Dropped in the rewrite and restored for completeness. Google has
      // ignored this tag since 2009, so this changes nothing on its own —
      // the coverage that matters is the body copy in ./layout.tsx.
      'دولار مقابل دينار عراقي', 'العملة العراقية مقابل الدولار',
      'سعر صرف الدينار العراقي مقابل الدولار',
      'usd to iqd', 'iqd to usd', 'iraqi dinar to dollar', 'dollar to iraqi dinar rate',
    ],
    openGraph: {
      url: absUrl('/fx'),
      title: rate
        ? `سعر الدولار اليوم في العراق · ${rate.toLocaleString('en-US', { maximumFractionDigits: 0 })} ديناراً`
        : 'سعر الدولار اليوم في العراق · سعر صرف الدينار العراقي',
      description: line
        ? `سعر الدولار اليوم ${line} · محوّل فوري IQD/USD.`
        : 'سعر صرف الدولار مقابل الدينار العراقي اليوم · السعر الرسمي والسوق الموازية ومحول فوري IQD/USD.',
      images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
    },
  }
}

export default async function FxPage() {
  const fx = await getFx()
  return <FxClient fx={fx} />
}
