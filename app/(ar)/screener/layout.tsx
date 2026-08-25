import type { Metadata } from 'next'
import Freshness from '@/components/seo/Freshness'
import Breadcrumbs from '@/components/seo/Breadcrumbs'
import { absUrl, seoAlternates } from '@/lib/seo'
export const metadata: Metadata = {
  title: { absolute: 'مستكشف الأسهم العراقية · فلترة أسهم بورصة العراق' },
  description: 'افرز أسهم بورصة العراق حسب الأداء اليومي والأسبوعي والسنوي، السيولة، المكرر الربحي، تدفق الأجانب، والقرب من قمة 52 أسبوعاً — مع جاهزات فرز سريعة.',
  alternates: seoAlternates('/screener'),
  keywords: [
    'iraq stock exchange screener', 'isx stock screener', 'isx stock filter',
    'فارز الاسهم العراقية', 'مستكشف الاسهم العراقية', 'تصفية اسهم بورصة العراق', 'سوق الاسهم العراقي',
  ],
  openGraph: {
    url: absUrl('/screener'),
    title: 'مستكشف الأسهم العراقية · بورصة العراق',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
}
export default function ScreenerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}

      <Breadcrumbs trail={[{ name: 'مستكشف الأسهم', path: '/screener' }]} />


      <Freshness
        url={absUrl('/screener')}
        name="مستكشف الأسهم العراقية"
        description="فرز أسهم بورصة العراق حسب الأداء والسيولة والمكرر الربحي وتدفق الأجانب."
      />

    </>
  )
}
