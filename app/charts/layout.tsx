import type { Metadata } from 'next'
import Freshness from '@/components/seo/Freshness'
export const metadata: Metadata = {
  title: { absolute: 'مخططات الاسهم العراقية · رسوم بيانية تفاعلية' },
  description: 'مخططات تفاعلية لأسهم بورصة العراق ومؤشر ISX60: شموع يابانية، بيانات تاريخية، مؤشرات فنية، ومقارنة أداء الأسهم على أي فترة زمنية.',
  alternates: { canonical: 'https://iraqsm.com/charts' },
  keywords: [
    'iraq stock exchange charts', 'iraq stock market charts', 'isx charts',
    'مخططات اسعار الاسهم العراقية', 'مخططات بورصة العراق', 'سوق الاسهم العراقي',
    'RSISX chart', 'rabee securities charts',
  ],
  openGraph: {
    url: 'https://iraqsm.com/charts',
    title: 'Iraq Stock Exchange Charts · ISX Price Charts | مخططات اسعار الاسهم العراقية',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
}
export default function ChartsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}

      <Freshness
        url="https://iraqsm.com/charts"
        name="مخططات الاسهم العراقية"
        description="مخططات تفاعلية لأسهم بورصة العراق ومؤشر ISX60."
      />

    </>
  )
}
