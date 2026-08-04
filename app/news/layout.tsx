import type { Metadata } from 'next'
import Breadcrumbs from '@/components/seo/Breadcrumbs'
export const metadata: Metadata = {
  title: { absolute: 'اخبار الاسهم العراقية · آخر أخبار بورصة العراق' },
  description: 'آخر أخبار بورصة العراق للأوراق المالية: تقارير حركة السوق، قرارات الشركات المدرجة وتوزيعات الأرباح، والأحداث الاقتصادية التي تحرّك أسعار الأسهم.',
  alternates: { canonical: 'https://iraqsm.com/news' },
  keywords: ['اخبار الاسهم العراقية', 'أخبار بورصة العراق', 'اخبار سوق الاسهم', 'iraq stock market news', 'ISX news'],
  openGraph: { url: 'https://iraqsm.com/news', title: 'اخبار الاسهم العراقية · بورصة العراق', images: [{ url: '/opengraph-image', width: 1200, height: 630 }] },
}
export default function NewsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}

      <Breadcrumbs trail={[{ name: 'أخبار السوق', path: '/news' }]} />
</>
}
