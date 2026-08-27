import type { Metadata } from 'next'
import { LearnGuide } from '@/components/routes/LearnGuide'
import { absUrl, seoAlternates } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'تعلم تداول الأسهم من الصفر · دليل المبتدئين في بورصة العراق',
  description: 'دليل شامل لتعلم تداول الأسهم من الصفر في بورصة العراق · كيف تبدأ الاستثمار، كيف تقرأ الأسعار، وما الفرق بين التداول والاستثمار. خطوات عملية للمبتدئين.',
  alternates: seoAlternates('/learn/trading-from-zero'),
  openGraph: {
    url: absUrl('/learn/trading-from-zero'),
    title: 'تعلم تداول الأسهم من الصفر | بورصة العراق ISX',
    description: 'دليل المبتدئين الشامل لتعلم تداول الأسهم في بورصة العراق.',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
}

export default function Page() {
  return <LearnGuide />
}
