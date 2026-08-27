import type { Metadata } from 'next'
import { describeFxRateEn, getFx } from '@/lib/fxCopy'
import FxSurface from '@/components/routes/FxPage'
import { absUrl, seoAlternates } from '@/lib/seo'

export const revalidate = 10800
export const dynamic = 'force-static'

/**
 * `/en/fx`.
 *
 * The rate goes in the title for the same reason it does on the Arabic page:
 * "USD to IQD" is a question about a number, and the result that already shows
 * the number is the one that gets clicked. It falls back to rate-free wording
 * when the scrape is down — a title promising a price it cannot show is worse
 * than a generic one.
 *
 * ⚠ It does NOT say "today" or "live". The source publishes one closing rate
 * per day and this product stores no history, so the English copy says
 * "latest published rate" and means it.
 */
export async function generateMetadata(): Promise<Metadata> {
  const fx = await getFx()
  const rate = fx?.sell ?? fx?.buy ?? null
  const line = describeFxRateEn(fx)

  return {
    title: {
      absolute: rate
        ? `USD to IQD · ${rate.toLocaleString('en-US', { maximumFractionDigits: 0 })} Iraqi dinars per dollar`
        : 'USD to IQD · the dollar against the Iraqi dinar',
    },
    description: line
      ? `The dollar ${line} in Iraq. See the latest published rate, the gap between the two rates, and an instant converter for any amount.`
      : 'What is the dollar worth in Iraq? The USD/IQD rate at the Central Bank’s official rate and on the parallel market, with an instant converter for any amount.',
    alternates: seoAlternates('/fx', 'en'),
    keywords: [
      'usd to iqd', 'iqd to usd', 'iraqi dinar to dollar', 'dollar to iraqi dinar rate',
      'iraq exchange rate', 'iraqi dinar exchange rate', 'parallel market rate iraq',
      'central bank of iraq rate', 'dinar rate baghdad',
    ],
    openGraph: {
      url: absUrl('/fx', 'en'),
      title: rate
        ? `USD to IQD · ${rate.toLocaleString('en-US', { maximumFractionDigits: 0 })} dinars`
        : 'USD to IQD · the Iraqi dinar exchange rate',
      description: line
        ? `The dollar ${line} · instant IQD/USD converter.`
        : 'The dollar against the Iraqi dinar · the official rate, the parallel market rate, and an instant IQD/USD converter.',
      images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
      locale: 'en_US',
      alternateLocale: 'ar_IQ',
    },
  }
}

export default async function Page() {
  const fx = await getFx()
  return <FxSurface fx={fx} />
}
