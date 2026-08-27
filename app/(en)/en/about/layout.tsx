import type { Metadata } from 'next'
import { absUrl, seoAlternates } from '@/lib/seo'

/**
 * `/en/about`.
 *
 * The title and description describe what a reader actually finds — a letter
 * from the person who built the site, three claims about the platform, and a
 * way to reach him. Nothing new is claimed here that the page does not say:
 * no team, no founding year, no coverage figure, no regulatory status.
 *
 * It is NOT a translation of the Arabic metadata. The Arabic line leads with
 * «من بنى منصّة بيانات بورصة العراق ولماذا» because that phrasing matches how
 * the question is searched in Arabic; the English one leads with the product
 * name, because an English searcher who reaches this page is almost always
 * checking who is behind IQWealth before trusting its numbers.
 */
export const metadata: Metadata = {
  title: { absolute: 'About IQWealth · Who built this, and why' },
  description:
    'A letter from Ahmed Balha, the finance writer who built IQWealth: a free platform for daily Iraq Stock Exchange data, still in development — and how to reach him.',
  alternates: seoAlternates('/about', 'en'),
  keywords: ['about IQWealth', 'iraqsm', 'Iraq Stock Exchange data platform', 'who runs IQWealth'],
  openGraph: {
    url: absUrl('/about', 'en'),
    title: 'About IQWealth · Who built this, and why',
    description: 'A free platform for daily Iraq Stock Exchange data, built by a finance writer and still in development.',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
    locale: 'en_US',
    alternateLocale: 'ar_IQ',
  },
}

export default function EnAboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
