import type { Metadata } from 'next'
import Freshness from '@/components/seo/Freshness'
import Breadcrumbs from '@/components/seo/Breadcrumbs'
import { absUrl, seoAlternates } from '@/lib/seo'

/**
 * `/en/heatmap`.
 *
 * The visible page calls itself «Market Map», because that is what it is and
 * «heatmap» describes the rendering rather than the subject. The TITLE still
 * carries «heatmap», and the Arabic side keeps «خريطة حرارية» for the same
 * reason: it is the word people search with, even when it is not the best word
 * for the thing. Search intent belongs in metadata; the interface gets the
 * clearer name.
 */
export const metadata: Metadata = {
  title: { absolute: 'Iraq Stock Market Map · ISX heatmap by sector' },
  description:
    'The whole Iraqi market in one picture: every share a tile sized by market cap and coloured by its change, grouped by sector — over a day, week, month or year.',
  alternates: seoAlternates('/heatmap', 'en'),
  keywords: [
    'iraq stock exchange heatmap', 'ISX heatmap', 'ISX market map',
    'iraq stock treemap', 'iraqi market sectors',
  ],
  openGraph: {
    url: absUrl('/heatmap', 'en'),
    title: 'Iraq Stock Market Map · IQWealth',
    description: 'Every Iraq Stock Exchange share sized by market cap and coloured by its change, grouped by sector.',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
    locale: 'en_US',
    alternateLocale: 'ar_IQ',
  },
}

export default function EnHeatmapLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}

      <Breadcrumbs trail={[{ name: 'Market Map', path: '/heatmap' }]} locale="en" />

      <Freshness
        url={absUrl('/heatmap', 'en')}
        name="Iraq Stock Market Map"
        description="Iraq Stock Exchange share performance as a market map grouped by sector."
        locale="en"
      />
    </>
  )
}
