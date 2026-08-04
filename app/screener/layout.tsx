import type { Metadata } from 'next'
import Freshness from '@/components/seo/Freshness'
export const metadata: Metadata = {
  title: { absolute: 'فارز الأسهم العراقية · فلترة أسهم بورصة العراق' },
  description: 'افرز أسهم بورصة العراق حسب الأداء اليومي والأسبوعي والسنوي، السيولة، المكرر الربحي، تدفق الأجانب، والقرب من قمة 52 أسبوعاً — مع جاهزات فرز سريعة.',
  alternates: { canonical: 'https://iraqsm.com/screener' },
  keywords: [
    'iraq stock exchange screener', 'isx stock screener', 'isx stock filter',
    'فارز الاسهم العراقية', 'تصفية اسهم بورصة العراق', 'سوق الاسهم العراقي',
  ],
  openGraph: {
    url: 'https://iraqsm.com/screener',
    title: 'ISX Stock Screener · فارز الأسهم العراقية | بورصة العراق',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
}
export default function ScreenerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}

      <Freshness
        url="https://iraqsm.com/screener"
        name="فارز الأسهم العراقية"
        description="فرز أسهم بورصة العراق حسب الأداء والسيولة والمكرر الربحي وتدفق الأجانب."
      />

    </>
  )
}
