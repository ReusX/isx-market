import type { Metadata } from 'next'
import { MarketPage } from '@/components/site/MarketPage'
import { loadMarketInitial } from '@/lib/marketServer'
import { absUrl, seoAlternates } from '@/lib/seo'
import { localeDate } from '@/lib/date'

/**
 * /market · the full board — every listed company, every column. Its title
 * («اسعار الاسهم العراقية · جميع شركات بورصة العراق») is the site's #1
 * result for the prices query; the root is the market OVERVIEW and links
 * here for the complete table. Two pages, two intents, on purpose.
 *
 * With `?date=`, the page is that session's board and says so in its
 * title, description and canonical — so every past session is a distinct,
 * indexable page. A date that is not a session snaps to the session before
 * it, and the canonical names the session actually shown.
 */
const LOCALE = 'en' as const
type Params = { searchParams: Promise<{ date?: string }> }

export async function generateMetadata({ searchParams }: Params): Promise<Metadata> {
  const { date } = await searchParams
  if (!date) return {}
  const { session, sessions } = await loadMarketInitial(date)
  if (!session || session === sessions[0]) return { alternates: seoAlternates('/market', 'en') }
  const d = localeDate(session, 'en')
  const path = `/market?date=${session}`
  return {
    title: { absolute: `Iraq Stock Exchange share prices · session of ${d}` },
    description: `Prices for every company on the Iraq Stock Exchange for the session of ${d}: last price, change, volume and market cap.`,
    alternates: seoAlternates(path, 'en'),
    openGraph: { url: absUrl(path, 'en'), title: `Iraq Stock Exchange share prices · session of ${d}` },
  }
}

/**
 * schema.org Dataset: this page IS a data table — every listed company's
 * prices for one session, from the exchange's daily bulletin, refreshed
 * after every session — and saying so lets Google list it as data. Only
 * what the page shows is claimed; the temporal coverage is the session
 * shown, and the whole series is the page without a date.
 */
function datasetLd(session: string | null, sessions: string[], locale: 'ar' | 'en') {
  const first = sessions[sessions.length - 1], latest = sessions[0]
  const path = session && session !== latest ? `/market?date=${session}` : '/market'
  const ar = locale === 'ar'
  return {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    /* Its own id, distinct from the page's WebPage node. With the same @id
       Google merged the two, and the WebPage's isPartOf (a WebSite) was read
       as the Dataset's isPartOf, which must be a Dataset — the GSC warning. */
    '@id': `${absUrl(path, locale)}#dataset`,
    name: ar ? 'أسعار أسهم بورصة العراق · جميع الشركات المدرجة' : 'Iraq Stock Exchange share prices · all listed companies',
    description: ar
      ? 'آخر سعر، التغيّر، حجم التداول، القيمة السوقية وعدد الأسهم لكل شركة مدرجة في بورصة العراق للأوراق المالية، لكل جلسة تداول.'
      : 'Last price, change, volume, market cap and shares for every company listed on the Iraq Stock Exchange, per trading session.',
    url: absUrl(path, locale),
    inLanguage: ar ? 'ar' : 'en',
    isAccessibleForFree: true,
    license: 'https://creativecommons.org/licenses/by/4.0/',
    creator: { '@type': 'Organization', '@id': absUrl('/#organization'), name: 'IQWealth' },
    sourceOrganization: { '@type': 'Organization', name: ar ? 'بورصة العراق للأوراق المالية' : 'Iraq Stock Exchange', url: 'http://www.isx-iq.net/' },
    ...(session && session !== latest
      ? { temporalCoverage: session }
      : first && latest ? { temporalCoverage: `${first}/${latest}` } : {}),
    spatialCoverage: { '@type': 'Place', name: ar ? 'العراق' : 'Iraq' },
    keywords: ar
      ? ['اسعار الاسهم العراقية', 'بورصة العراق', 'سوق العراق للأوراق المالية', 'ISX']
      : ['Iraq Stock Exchange', 'ISX', 'Iraqi share prices', 'Iraq stock market'],
    variableMeasured: ar
      ? ['آخر سعر', 'التغيّر', 'حجم التداول', 'القيمة السوقية', 'عدد الأسهم']
      : ['last price', 'change', 'volume', 'market cap', 'shares'],
    distribution: [{ '@type': 'DataDownload', encodingFormat: 'text/csv', contentUrl: absUrl(path, locale) }],
  }
}

export default async function Page({ searchParams }: Params) {
  const { date } = await searchParams
  const initial = await loadMarketInitial(date)
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetLd(initial.session, initial.sessions, LOCALE)) }} />
      <MarketPage variant="full" initial={initial} />
    </>
  )
}
