import type { Metadata } from 'next'
import { describeFxRate, getFx, buildFxFaq } from '@/lib/fxCopy'
import { FxPage as FxSurface } from '@/components/site/FxPage'
import { absUrl, seoAlternates } from '@/lib/seo'
import { fxSeries } from '@/lib/fxHistory'

// Regenerated every 15 minutes: the dollar story lands at no fixed hour and
// readers come the moment it does (lib/rates re-reads Alsumaria every 10).
export const revalidate = 900
// Serve from the static ISR cache so tab switches are instant; the scrape
// refreshes in the background on the interval. Without this, the no-cache
// headers from the sources force the route dynamic (~2.5s render every click).
export const dynamic = 'force-static'

/*
 * Metadata carries the live rate, so it has to be built from the fetch.
 * `getFx` is the memoized accessor the page body also calls, so this is free —
 * calling the raw scrape twice is what once made a 90-second build run past
 * ten minutes (see lib/fxCopy.ts).
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
      ? `سعر الدولار اليوم في العراق ${line}. سعر 100 دولار (الورق) في بورصة الكفاح ببغداد، الفرق بين السعرين، ومحوّل فوري لأي مبلغ.`
      : 'كم سعر الدولار اليوم في العراق؟ سعر صرف الدولار مقابل الدينار العراقي بسعر البنك المركزي وسعر السوق الموازية، مع محوّل فوري لأي مبلغ.',
    /* The description carries the $100 phrasing too: «سعر 100 دولار» and «سعر الورق» are how the query is typed. */
    alternates: seoAlternates('/fx'),
    keywords: [
      'سعر الدولار اليوم في العراق', 'سعر الدولار في السوق الموازي',
      'سعر الدولار مقابل الدينار العراقي', 'الدولار مقابل الدينار العراقي',
      'سعر صرف الدولار في العراق اليوم', 'سعر الدولار في السوق الموازية اليوم',
      'سعر 100 دولار بالدينار العراقي', 'سعر 100 دولار في العراق اليوم', 'سعر الورق اليوم في العراق',
      'بيش الدولار اليوم', 'سعر الدولار في بورصة الكفاح اليوم', 'سعر صرف الدينار العراقي',
      'الدينار العراقي مقابل الدولار', 'سعر الدولار في بغداد اليوم',
      // Dropped in the rewrite and restored for completeness. Google has
      // ignored this tag since 2009, so this changes nothing on its own —
      // the coverage that matters is the body copy on the page itself.
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

/*
 * The page's own WebPage + FAQPage nodes. These used to sit in ./layout.tsx,
 * which put the @id of /fx — and a second FAQPage — onto every route nested
 * under it. A child route would then have shipped two WebPage nodes and two
 * FAQPage nodes for one URL.
 */
function fxSchema(fx: Awaited<ReturnType<typeof getFx>>) {
  const faq = buildFxFaq(fx)
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': absUrl('/fx'),
        url: absUrl('/fx'),
        name: 'سعر الدولار اليوم في العراق · الدولار مقابل الدينار العراقي',
        description: 'سعر صرف الدولار الأمريكي مقابل الدينار العراقي اليوم، السعر الرسمي وسعر السوق الموازية، ومحول العملات IQD/USD.',
        inLanguage: ['ar-IQ', 'en'],
        // The rate's own date, so the SERP can show when this was last true.
        ...(fx?.date ? { dateModified: fx.date } : {}),
        breadcrumb: {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'IQWealth', item: absUrl('/') },
            { '@type': 'ListItem', position: 2, name: 'سعر الدولار في العراق', item: absUrl('/fx') },
          ],
        },
      },
      {
        // Same `faq` array the page renders · structured data that disagrees
        // with the visible copy is worse than none, and these two had already
        // drifted apart when they were maintained separately.
        '@type': 'FAQPage',
        mainEntity: faq.map((item) => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: { '@type': 'Answer', text: item.a },
        })),
      },
    ],
  }
}

export default async function FxPage() {
  /* The two series are read here, on the server, so the page stays static and
     the client never learns the anon key. `official` reaches back to 2003
     because the Central Bank publishes it; `parallel` starts where this
     product began recording, which is what the panel's legend says. */
  const [parallel, official] = await Promise.all([
    fxSeries('parallel'),
    fxSeries('official_cbi'),
  ])

  const fx = await getFx()
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(fxSchema(fx)) }} />
      <FxSurface fx={fx} parallel={parallel} official={official} faq={buildFxFaq(fx)} />
    </>
  )
}
