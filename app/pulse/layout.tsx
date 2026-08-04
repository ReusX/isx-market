import type { Metadata } from 'next'
import Freshness from '@/components/seo/Freshness'
export const metadata: Metadata = {
  title: { absolute: 'نبض السوق العراقي · الأسهم الصاعدة والهابطة اليوم' },
  description: 'اتساع سوق العراق للأوراق المالية: عدد الأسهم الصاعدة مقابل الهابطة، حجم التداول الصاعد والهابط، القمم والقيعان الجديدة وخط الصعود/الهبوط.',
  alternates: { canonical: 'https://iraqsm.com/pulse' },
  keywords: [
    'iraq stock exchange market breadth', 'isx advancers decliners', 'isx market pulse',
    'نبض السوق العراقي', 'اتساع السوق', 'الاسهم الصاعدة والهابطة', 'بورصة العراق',
  ],
  openGraph: {
    url: 'https://iraqsm.com/pulse',
    title: 'Market Pulse · Iraq Stock Exchange Breadth | نبض السوق العراقي',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
}
export default function PulseLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}

      <Freshness
        url="https://iraqsm.com/pulse"
        name="نبض السوق العراقي"
        description="اتساع سوق العراق للأوراق المالية: الصاعدة مقابل الهابطة وخط الصعود/الهبوط."
      />

    </>
  )
}
