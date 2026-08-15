import type { Metadata } from 'next'
import Freshness from '@/components/seo/Freshness'
import Breadcrumbs from '@/components/seo/Breadcrumbs'
import { absUrl, seoAlternates } from '@/lib/seo'
export const metadata: Metadata = {
  title: { absolute: 'مخططات الاسهم العراقية · رسوم بيانية تفاعلية' },
  description: 'مخططات تفاعلية لأسهم بورصة العراق ومؤشر ISX60: شموع يابانية، بيانات تاريخية، مؤشرات فنية، ومقارنة أداء الأسهم على أي فترة زمنية.',
  alternates: seoAlternates('/charts'),
  keywords: [
    'iraq stock exchange charts', 'iraq stock market charts', 'isx charts',
    'مخططات اسعار الاسهم العراقية', 'مخططات بورصة العراق', 'سوق الاسهم العراقي',
    'RSISX chart', 'rabee securities charts',
  ],
  openGraph: {
    url: absUrl('/charts'),
    title: 'مخططات الاسهم العراقية · مؤشر ISX60',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
}
export default function ChartsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}

      <Breadcrumbs trail={[{ name: 'المخططات', path: '/charts' }]} />


      <Freshness
        url={absUrl('/charts')}
        name="مخططات الاسهم العراقية"
        description="مخططات تفاعلية لأسهم بورصة العراق ومؤشر ISX60."
      />

    </>
  )
}
