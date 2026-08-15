import type { Metadata } from 'next'
import { absUrl, seoAlternates } from '@/lib/seo'

export const metadata: Metadata = {
  title: { absolute: 'عن بورصة العراق للأوراق المالية · كيف تعمل ومن يشرف عليها' },
  description: 'ما هي بورصة العراق للأوراق المالية، كيف تجري جلسات التداول، من يشرف عليها، وكيف تشتري وتبيع الأسهم — دليل تعريفي للمستثمر العراقي المبتدئ.',
  alternates: seoAlternates('/about'),
  keywords: [
    'iraq stock market', 'iraq stock exchange', 'isx market', 'about',
    'بورصة العراق', 'سوق الاسهم العراقي', 'اسهم العراق',
  ],
  openGraph: {
    url: absUrl('/about'),
    title: 'About Iraq Stock Market · iraqsm.com | عن بورصة العراق',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
}

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
