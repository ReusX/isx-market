import { buildFxFaq, CBI_OFFICIAL_RATE, marketRate, getFx } from '@/lib/fxCopy'
import { absUrl } from '@/lib/seo'

/*
 * Title and description live in ./page.tsx, not here, because they carry the
 * live rate and so have to be built from the fetch. A page-level `metadata`
 * export overrides the layout's entirely, so keeping a second copy here would
 * silently win nothing and lose the canonical.
 *
 * `getFx` below is the memoized accessor, not `fetchFx` — see lib/fxCopy.ts.
 * Calling the raw scrape here as well as in the page and its metadata is what
 * made a 90-second build run past ten minutes.
 */

const ar = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 })

export default async function FxLayout({ children }: { children: React.ReactNode }) {
  const fx = await getFx()
  const faq = buildFxFaq(fx)
  const market = marketRate(fx)

  const fxSchema = {
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
        // Same `faq` array the page renders below · structured data that
        // disagrees with the visible copy is worse than none, and these two
        // had already drifted apart when they were maintained separately.
        '@type': 'FAQPage',
        mainEntity: faq.map(item => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: { '@type': 'Answer', text: item.a },
        })),
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(fxSchema) }} />

      {children}
    </>
  )
}
