import type { Metadata } from 'next'
import Freshness from '@/components/seo/Freshness'
import Breadcrumbs from '@/components/seo/Breadcrumbs'
import { absUrl, seoAlternates } from '@/lib/seo'
export const metadata: Metadata = {
  /* «اليوم» removed for the same reason as the root: this is the last closed
     session, not today. The description already said «بعد كل جلسة» — the
     title contradicted its own description. */
  title: { absolute: 'اسعار الاسهم العراقية · جميع شركات بورصة العراق' },
  description: 'أسعار جميع الأسهم المدرجة في بورصة العراق: آخر سعر، نسبة التغيّر، حجم التداول والقيمة السوقية — مرتّبة ومفلترة حسب القطاع ومحدّثة بعد كل جلسة.',
  alternates: seoAlternates('/market'),
  keywords: [
    'iraq stock market', 'iraq stock exchange', 'isx stock exchange', 'isx market',
    'اسعار الاسهم العراقية', 'اسهم العراق', 'سوق الاسهم العراقي', 'بورصة العراق',
    'الاسهم العراقية', 'تداول اسهم العراق', 'RSISX', 'rabee securities',
  ],
  openGraph: {
    url: absUrl('/market'),
    title: 'اسعار الاسهم العراقية · بورصة العراق',
    description: 'Prices for every stock on the Iraq Stock Exchange, updated after each session · اسعار الاسهم العراقية، سوق الاسهم العراقي، مؤشر RSISX.',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
}
export default function MarketLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}

      <Breadcrumbs trail={[{ name: 'السوق', path: '/market' }]} />


      <Freshness
        url={absUrl('/market')}
        name="اسعار الاسهم العراقية · بورصة العراق"
        description="أسعار جميع الأسهم المدرجة في بورصة العراق مع التغيّر وحجم التداول والقيمة السوقية."
      />

    </>
  )
}
