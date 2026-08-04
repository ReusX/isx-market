import type { Metadata } from 'next'
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
      <h1 style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }}>
        نبض السوق · اتساع سوق العراق للأوراق المالية | Iraq Stock Exchange Market Breadth & Pulse
      </h1>
      {children}
    </>
  )
}
