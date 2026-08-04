import type { Metadata } from 'next'
import Freshness from '@/components/seo/Freshness'
export const metadata: Metadata = {
  title: { absolute: 'اسعار الاسهم العراقية اليوم · جميع شركات بورصة العراق' },
  description: 'أسعار جميع الأسهم المدرجة في بورصة العراق: آخر سعر، نسبة التغيّر، حجم التداول والقيمة السوقية — مرتّبة ومفلترة حسب القطاع ومحدّثة بعد كل جلسة.',
  alternates: { canonical: 'https://iraqsm.com/market' },
  keywords: [
    'iraq stock market', 'iraq stock exchange', 'isx stock exchange', 'isx market',
    'اسعار الاسهم العراقية', 'اسهم العراق', 'سوق الاسهم العراقي', 'بورصة العراق',
    'الاسهم العراقية', 'تداول اسهم العراق', 'RSISX', 'rabee securities',
  ],
  openGraph: {
    url: 'https://iraqsm.com/market',
    title: 'Iraq Stock Market Live Prices · Iraq Stock Exchange ISX | اسعار الاسهم العراقية',
    description: 'Live prices for all stocks on the Iraq Stock Exchange · اسعار الاسهم العراقية، سوق الاسهم العراقي، مؤشر RSISX.',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
}
export default function MarketLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}

      <Freshness
        url="https://iraqsm.com/market"
        name="اسعار الاسهم العراقية اليوم"
        description="أسعار جميع الأسهم المدرجة في بورصة العراق مع التغيّر وحجم التداول والقيمة السوقية."
      />

    </>
  )
}
